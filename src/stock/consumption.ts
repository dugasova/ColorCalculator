import type { HistoryStep } from "../history";
import { actualGramsScale } from "../sessionCost";
import type { StockConsumption, StockRecord, StockShortage } from "./types";
import { developerStockId, shadeStockId } from "./products";
import { stockById } from "./reorder";

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
//    additional shade(s) were blended on top of it and any gray-coverage natural base
//    carved out of it (those are charged separately to their own shade ids) -- the same
//    subtraction buildMixSummary does to report the primary shade's own share.
//  - A gray-coverage natural base the colorist opted into (`naturalBase`) is charged to its
//    own natural shade, with or without a blend. Corrector grams are never charged: they
//    aren't tied to a specific product code in the saved data.
//  - Developer is charged by (brandId, line, developerVolume) whenever a developer volume
//    was actually used -- `line` only changes the resulting bucket for the handful of
//    chemically-distinct-developer lines in products.ts's SEPARATE_DEVELOPER_LINES (INOA,
//    Chromatics); every other line still charges the same brand-wide bucket as before.
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
    const { brandId, line, targetShade, blend, additionalShade, additionalShade2, result } = step;
    const additionalShadeGrams = step.additionalShadeGrams ?? 0;
    const additionalShade2Grams = step.additionalShade2Grams ?? 0;
    const naturalBase = step.naturalBase ?? null;

    if (naturalBase !== null) {
      addScaled(shadeStockId(brandId, naturalBase.shade.line ?? null, naturalBase.shade.code), "shade", naturalBase.shade.code, naturalBase.grams);
    }
    if (blend !== null) {
      addScaled(shadeStockId(brandId, blend.shadeA.line ?? null, blend.shadeA.code), "shade", blend.shadeA.code, blend.shadeAGrams);
      addScaled(shadeStockId(brandId, blend.shadeB.line ?? null, blend.shadeB.code), "shade", blend.shadeB.code, blend.shadeBGrams);
    } else {
      const hasAdditional = additionalShade !== null && additionalShadeGrams > 0;
      const hasAdditional2 = additionalShade2 !== null && additionalShade2 !== undefined && additionalShade2Grams > 0;
      const primaryGrams = grams.colorGrams
        - (naturalBase?.grams ?? 0)
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
      addScaled(developerStockId(brandId, line, result.developerVolume), "developer", String(result.developerVolume), grams.developerGrams);
    }
  }

  return Array.from(totals.values());
}

// Products with no stock record at all are untracked, not short -- they are skipped.
export function findStockShortages(steps: HistoryStep[], records: StockRecord[]): StockShortage[] {
  const byId = stockById(records);
  return computeStockConsumption(steps).flatMap(consumption => {
    const record = byId.get(consumption.id);
    return record === undefined || record.remainingGrams >= consumption.grams
      ? []
      : [{ consumption, remainingGrams: record.remainingGrams }];
  });
}
