import {
  collection, deleteDoc, doc, getDoc, increment, onSnapshot, setDoc, updateDoc,
  type FirestoreError, type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { parseSnapshotDocs } from "../firestoreSubscribe";
import type { BrandId } from "../engine/brands";
import type { DeveloperVolume } from "../engine/levels";
import type { HistoryStep } from "../history";
import { settleWrite } from "../firestoreWrite";
import { stockRecordSchema, type StockConsumption, type StockRecord } from "./types";
import { developerStockId, developerStockLine, shadeStockId } from "./products";
import { computeStockConsumption } from "./consumption";

const DYE_STOCK_COLLECTION = "dyeStock";

// Malformed documents are skipped and logged rather than propagated -- see
// firestoreSubscribe.ts's parseSnapshotDocs, shared by every `subscribeToX` live query.
// A listener-level failure (e.g. this collection's Firestore rule rejecting the
// `onSnapshot` call) is reported via `onError` instead of throwing -- PaletteContext.tsx
// wires it to `console.error` so stale stock data is at least traceable instead of
// silently never updating again.
export function subscribeToStock(onChange: (records: StockRecord[]) => void, onError?: (err: FirestoreError) => void): Unsubscribe {
  return onSnapshot(collection(db, DYE_STOCK_COLLECTION), snapshot => {
    onChange(parseSnapshotDocs(snapshot, stockRecordSchema, "dye stock"));
  }, onError);
}

export async function setShadeStockGrams(brandId: BrandId, line: string | null, code: string, remainingGrams: number): Promise<void> {
  await settleWrite(setDoc(doc(db, DYE_STOCK_COLLECTION, shadeStockId(brandId, line, code)), {
    kind: "shade", brandId, line, code, remainingGrams,
  }), "set shade stock");
}

// `line` determines which stock bucket this write lands in -- see developerStockId's own
// comment: only a scoped line (products.ts's SEPARATE_DEVELOPER_LINES) actually changes
// it, every other line resolves to the same brand-wide bucket as passing `null`.
export async function setDeveloperStockGrams(brandId: BrandId, line: string | null, volume: DeveloperVolume, remainingGrams: number): Promise<void> {
  const stockLine = developerStockLine(brandId, line);
  await settleWrite(setDoc(doc(db, DYE_STOCK_COLLECTION, developerStockId(brandId, line, volume)), {
    kind: "developer", brandId, line: stockLine, volume, remainingGrams,
  }), "set developer stock");
}

// Stops tracking a product (an admin clearing the field back to blank) -- distinct from
// setting it to 0, which still shows an "Out" badge. Removing the document instead just
// removes the row from tracking entirely, same soft-opt-out semantics as
// `setShadeDisabled(..., false)`'s `deleteDoc` in palette.ts.
export async function stopTrackingStock(id: string): Promise<void> {
  await deleteDoc(doc(db, DYE_STOCK_COLLECTION, id));
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
  let snapshot;
  try {
    snapshot = await getDoc(ref);
  } catch (err) {
    // Offline and not already in the local cache. PaletteProvider keeps the whole dyeStock
    // collection subscribed for as long as the app is open, so an id missing from the cache
    // here means an untracked product -- same no-op as the !exists() case below, rather than
    // failing the whole save (see saveFormulaToHistory/setActualColorGrams, both best-effort
    // callers of this function).
    if ((err as { code?: unknown } | null)?.code === "unavailable") return;
    throw err;
  }
  if (!snapshot.exists()) return;
  await settleWrite(updateDoc(ref, { remainingGrams: increment(deltaGrams) }), `stock ${id}`);
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
