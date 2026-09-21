import {
  collection, deleteDoc, doc, getDoc, increment, onSnapshot, setDoc, updateDoc, type Unsubscribe,
} from "firebase/firestore";
import { z } from "zod";
import { db } from "./firebase";
import { parseSnapshotDocs } from "./firestoreSubscribe";
import type { BrandId } from "./engine/brands";
import type { DeveloperVolume } from "./engine/levels";
import { developerVolumeSchema } from "./engine/shades";
import type { HistoryStep } from "./history";
import { actualGramsScale } from "./sessionCost";

const DYE_STOCK_COLLECTION = "dyeStock";

// Default tube size: most lines in this catalog ship a shade in a 60 g tube, so "below
// one full tube left" is the point at which a colorist needs to reorder before the next
// full-head service. A handful of lines ship smaller tubes -- see
// SHADE_TUBE_SIZE_OVERRIDES_GRAMS/getShadeTubeSizeGrams below for those.
export const LOW_STOCK_THRESHOLD_GRAMS = 60;

// Real per-tube size differs by product: L'Oréal's Majirel, Dia Light, and Dia Richesse
// ship in 50 g tubes; every other built-in line ships in the standard 60 g tube (INOA
// included -- only these three are smaller). Keyed by "<brandId>::<line>"; a custom
// admin-added line (or a built-in line with no entry here) falls back to the 60 g
// default. Developer isn't tube-packaged at all (it's tracked per volume, not per line),
// so this only applies to shade stock -- getStockStatus's `thresholdGrams` defaults to
// the flat 60 g for developer rows too (a bottle is opened and drawn down gradually, so
// "below one service's worth left" is still the right low-stock trigger, unlike the
// restock amount below).
const SHADE_TUBE_SIZE_OVERRIDES_GRAMS: Record<string, number> = {
  "loreal::majirel": 50,
  "loreal::dia-light": 50,
  "loreal::dia-richesse": 50,
};

export function getShadeTubeSizeGrams(brandId: BrandId, line: string | null): number {
  return SHADE_TUBE_SIZE_OVERRIDES_GRAMS[`${brandId}::${line ?? ""}`] ?? LOW_STOCK_THRESHOLD_GRAMS;
}

// Developer ships in a 1000 g/ml bottle, not a 60 g tube -- BrandStockList's "+1" restock
// action needs to add a full bottle for developer rows while still flagging low stock at
// the same 60 g "one service left" threshold as shades (see LOW_STOCK_THRESHOLD_GRAMS's
// comment above).
export const DEVELOPER_BOTTLE_SIZE_GRAMS = 1000;

// Remaining grams of one physical product: either a specific shade within a brand's line
// (identity is (brandId, line, code), same as `shadeKey` -- a bare code isn't unique
// within a brand) or a developer at a given volume (developer isn't shade-scoped, so it's
// tracked per (brandId, volume) instead).
export type StockRecord =
  | { id: string; kind: "shade"; brandId: BrandId; line: string | null; code: string; remainingGrams: number }
  | { id: string; kind: "developer"; brandId: BrandId; volume: DeveloperVolume; remainingGrams: number };

// Validates a dyeStock Firestore document's payload -- everything but `id`, which comes
// from the document id itself (see subscribeToStock below), same pattern as
// paletteOverrideSchema in engine/paletteOverrides.ts.
export const stockRecordSchema: z.ZodType<Omit<StockRecord, "id">> = z.union([
  z.object({ kind: z.literal("shade"), brandId: z.string(), line: z.string().nullable(), code: z.string(), remainingGrams: z.number() }),
  z.object({ kind: z.literal("developer"), brandId: z.string(), volume: developerVolumeSchema, remainingGrams: z.number() }),
]);

// Deterministic doc ids (same rationale as palette.ts's `disableOverrideId`): a re-edit
// of the same product updates one document instead of accumulating duplicates, and a
// stale listener update can't briefly show two conflicting remaining-gram values. Every
// part is URI-encoded because Firestore document ids can't contain "/" and several Wella
// codes do (e.g. "5/41"). The "shade::"/"dev::" prefix keeps the two kinds from ever
// colliding within the one collection.
export function shadeStockId(brandId: BrandId, line: string | null, code: string): string {
  return `shade::${encodeURIComponent(brandId)}::${encodeURIComponent(line ?? "")}::${encodeURIComponent(code)}`;
}

export function developerStockId(brandId: BrandId, volume: DeveloperVolume): string {
  return `dev::${encodeURIComponent(brandId)}::${volume}`;
}

export type StockStatus = "out" | "low" | "ok";

export function getStockStatus(remainingGrams: number, thresholdGrams: number = LOW_STOCK_THRESHOLD_GRAMS): StockStatus {
  if (remainingGrams <= 0) return "out";
  if (remainingGrams <= thresholdGrams) return "low";
  return "ok";
}

export function stockById(records: StockRecord[]): Map<string, StockRecord> {
  return new Map(records.map(record => [record.id, record]));
}

// Malformed documents are skipped and logged rather than propagated -- see
// firestoreSubscribe.ts's parseSnapshotDocs, shared by every `subscribeToX` live query.
export function subscribeToStock(onChange: (records: StockRecord[]) => void): Unsubscribe {
  return onSnapshot(collection(db, DYE_STOCK_COLLECTION), snapshot => {
    onChange(parseSnapshotDocs(snapshot, stockRecordSchema, "dye stock"));
  });
}

export async function setShadeStockGrams(brandId: BrandId, line: string | null, code: string, remainingGrams: number): Promise<void> {
  await setDoc(doc(db, DYE_STOCK_COLLECTION, shadeStockId(brandId, line, code)), {
    kind: "shade", brandId, line, code, remainingGrams,
  });
}

export async function setDeveloperStockGrams(brandId: BrandId, volume: DeveloperVolume, remainingGrams: number): Promise<void> {
  await setDoc(doc(db, DYE_STOCK_COLLECTION, developerStockId(brandId, volume)), {
    kind: "developer", brandId, volume, remainingGrams,
  });
}

// Stops tracking a product (an admin clearing the field back to blank) -- distinct from
// setting it to 0, which still shows an "Out" badge. Removing the document instead just
// removes the row from tracking entirely, same soft-opt-out semantics as
// `setShadeDisabled(..., false)`'s `deleteDoc` in palette.ts.
export async function stopTrackingStock(id: string): Promise<void> {
  await deleteDoc(doc(db, DYE_STOCK_COLLECTION, id));
}

// One product's grams consumed by a saved session, already summed across every step that
// touched it -- see computeStockConsumption. `code` is display-only (a shade code, or the
// developer volume rendered as a string), never used to re-derive `id`.
export interface StockConsumption {
  id: string;
  kind: "shade" | "developer";
  code: string;
  grams: number;
}

// Attributes a saved session's grams to the exact products a colorist actually weighed
// out, mirroring engine/formatFormula.ts's buildMixSummary/buildBlendMixSummary:
//  - A step with no `brandId` (saved before stock tracking existed, or upgraded from the
//    legacy flat shape by normalizeHistoryEntry) or no computed grams is skipped: there's
//    nothing to charge accurately.
//  - Bleach steps are skipped entirely -- BleachHistoryStep records no brand/line at all,
//    so neither its powder nor its developer can be attributed to a specific product.
//  - A substitute blend (out-of-stock shade approximated by two others) charges its two
//    real component shades; the target shade itself is never charged -- it isn't a
//    physical product in that case (see ColorBlend's own comment in history/types.ts).
//  - Otherwise the primary target shade is charged `colorGrams` minus whatever discretionary
//    additional shade(s) were blended on top of it (those are charged separately to their
//    own shade ids) -- the same subtraction buildMixSummary does to report the primary
//    shade's own share.
//  - The gray-coverage natural-base share of colorGrams and any corrector grams are never
//    charged: neither is tied to a specific product code in the saved data.
//  - Developer is charged by (brandId, developerVolume) whenever a developer volume was
//    actually used.
//    split above) are summed into one consumption; non-positive totals are dropped.
//  - A step with a recorded actualColorGrams (see history/types.ts) charges that figure
//    instead of the computed colorGrams, scaling developer and every shade share by the
//    same ratio.
export function computeStockConsumption(steps: HistoryStep[]): StockConsumption[] {
  const totals = new Map<string, StockConsumption>();
  const add = (id: string, kind: "shade" | "developer", code: string, grams: number) => {
    if (grams <= 0) return;
    const existing = totals.get(id);
    if (existing !== undefined) {
      existing.grams += grams;
    } else {
      totals.set(id, { id, kind, code, grams });
    }
  };

  for (const step of steps) {
    if (step.kind !== "color" || step.brandId === undefined) continue;
    const grams = step.result.grams;
    if (grams === null) continue;
    // A recorded actual figure scales this step's whole mix -- primary shade, additional
    // shades, blend halves and developer alike -- so the split the colorist actually
    // weighed keeps its proportions. Rounded to 0.1 g only when scaling is in play, so an
    // unscaled step charges exactly the same grams it always did.
    const scale = actualGramsScale(step);
    const addScaled = (id: string, kind: "shade" | "developer", code: string, g: number) =>
      add(id, kind, code, scale === 1 ? g : Math.round(g * scale * 10) / 10);
    const { brandId, targetShade, blend, additionalShade, additionalShade2, result } = step;
    const additionalShadeGrams = step.additionalShadeGrams ?? 0;
    const additionalShade2Grams = step.additionalShade2Grams ?? 0;

    if (blend !== null) {
      addScaled(shadeStockId(brandId, blend.shadeA.line ?? null, blend.shadeA.code), "shade", blend.shadeA.code, blend.shadeAGrams);
      addScaled(shadeStockId(brandId, blend.shadeB.line ?? null, blend.shadeB.code), "shade", blend.shadeB.code, blend.shadeBGrams);
    } else {
      const hasAdditional = additionalShade !== null && additionalShadeGrams > 0;
      const hasAdditional2 = additionalShade2 !== null && additionalShade2 !== undefined && additionalShade2Grams > 0;
      const primaryGrams = grams.colorGrams
        - (hasAdditional ? additionalShadeGrams : 0)
        - (hasAdditional2 ? additionalShade2Grams : 0);
      addScaled(shadeStockId(brandId, targetShade.line ?? null, targetShade.code), "shade", targetShade.code, primaryGrams);
      if (hasAdditional) {
        addScaled(shadeStockId(brandId, additionalShade.line ?? null, additionalShade.code), "shade", additionalShade.code, additionalShadeGrams);
      }
      if (hasAdditional2 && additionalShade2 !== null && additionalShade2 !== undefined) {
        addScaled(shadeStockId(brandId, additionalShade2.line ?? null, additionalShade2.code), "shade", additionalShade2.code, additionalShade2Grams);
      }
    }

    if (result.developerVolume !== null) {
      addScaled(developerStockId(brandId, result.developerVolume), "developer", String(result.developerVolume), grams.developerGrams);
    }
  }

  return Array.from(totals.values());
}

// Applies a signed gram delta to an already-tracked product, atomically (Firestore's
// `increment` is server-side, so a concurrent stylist save and an admin's manual restock
// both land correctly regardless of order). A product nobody has registered a quantity
// for is left untracked -- creating a document here would fill the collection with
// negative phantom rows for every shade the salon has ever mixed, not just the ones an
// admin actually chose to track. Stock is allowed to go negative for a tracked product:
// it means more was mixed than was registered, which surfaces honestly as "Out" in
// Palette rather than being silently clamped to zero.
async function applyStockDelta(id: string, deltaGrams: number): Promise<void> {
  const ref = doc(db, DYE_STOCK_COLLECTION, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;
  await updateDoc(ref, { remainingGrams: increment(deltaGrams) });
}

// Charges every consumption's grams off its tracked document -- see applyStockDelta.
export async function consumeStock(consumptions: StockConsumption[]): Promise<void> {
  await Promise.all(consumptions.map(consumption => applyStockDelta(consumption.id, -consumption.grams)));
}

// Re-charges stock after a saved session's grams change -- a stylist recording what was
// actually weighed out (see setActualColorGrams in history/firestore.ts). Applies only the
// difference between what the old and new step arrays consume, so editing the same entry
// repeatedly (or clearing the actual figure again) never double-charges and always lands
// back on the computed baseline. Signed delta: consuming more means a negative delta on
// the remaining grams. Untracked products are no-ops, same as consumeStock.
export async function reconcileStockConsumption(before: HistoryStep[], after: HistoryStep[]): Promise<void> {
  const beforeGrams = new Map(computeStockConsumption(before).map(c => [c.id, c.grams]));
  const afterGrams = new Map(computeStockConsumption(after).map(c => [c.id, c.grams]));
  const ids = new Set([...beforeGrams.keys(), ...afterGrams.keys()]);
  await Promise.all(Array.from(ids, id => {
    const delta = (beforeGrams.get(id) ?? 0) - (afterGrams.get(id) ?? 0);
    return delta === 0 ? Promise.resolve() : applyStockDelta(id, delta);
  }));
}

// An admin's quick "+1 tube" action (BrandStockList) -- restocks an already-tracked
// product by exactly one tube/bottle instead of requiring the admin to compute and type
// the new absolute total by hand. `tubeGrams` is the caller's own per-line tube size
// (see getShadeTubeSizeGrams / LOW_STOCK_THRESHOLD_GRAMS) so a smaller-tube line (e.g.
// Majirel's 50 g) restocks by the right amount. No-ops for an untracked product, same as
// consumeStock -- there's no "one tube" to add to a total that was never registered.
export async function restockOneTube(id: string, tubeGrams: number): Promise<void> {
  await applyStockDelta(id, tubeGrams);
}
