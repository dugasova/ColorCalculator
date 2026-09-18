import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";
import type { HistoryStep, FormulaHistoryEntry, LegacyFormulaHistoryEntry } from "./types";
import { historyEntryShapeSchema, normalizeHistoryEntry } from "./schema";
import { computeStockConsumption, consumeStock, reconcileStockConsumption } from "../stock";
import { calculateSessionProductCost } from "../sessionCost";

const HISTORY_COLLECTION = "formulaHistory";

export interface SaveFormulaParams {
  clientName: string;
  clientId: string | null;
  note: string;
  appliedBy: string;
  steps: HistoryStep[];
  markupMultiplier: number;
  productCost: number | null;
  servicePrice: number | null;
  patchTestDate: string;
  allergyNotes: string;
  patchTestOverride: boolean;
  beforePhotoFile?: File | null;
  afterPhotoFile?: File | null;
}

// Strips values Firestore can't store: functions (e.g. Shade.developerLiftTable)
// and explicit `undefined` on unset optional fields (Firestore rejects both). Exported
// for reuse by other Firestore-writing modules (see `palette.ts`).
export function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

async function uploadFormulaPhoto(historyId: string, slot: "before" | "after", file: File): Promise<string> {
  const photoRef = ref(storage, `formulaHistory/${historyId}/${slot}`);
  await uploadBytes(photoRef, file);
  return getDownloadURL(photoRef);
}

export async function saveFormulaToHistory(params: SaveFormulaParams): Promise<void> {
  const docRef = await addDoc(collection(db, HISTORY_COLLECTION), {
    clientName: params.clientName,
    clientId: params.clientId,
    note: params.note,
    appliedBy: params.appliedBy,
    steps: sanitizeForFirestore(params.steps),
    markupMultiplier: params.markupMultiplier,
    productCost: params.productCost,
    servicePrice: params.servicePrice,
    patchTestDate: params.patchTestDate,
    allergyNotes: params.allergyNotes,
    patchTestOverride: params.patchTestOverride,
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    appliedAt: serverTimestamp(),
  });

  // Stock is a convenience ledger, not part of the visit record: a failure here must not
  // surface as a save error (the stylist would retry and create a duplicate entry), and
  // an untracked product is simply skipped -- see consumeStock.
  try {
    await consumeStock(computeStockConsumption(params.steps));
  } catch (err) {
    console.error(`Saved formula history entry "${docRef.id}", but updating dye stock failed:`, err);
  }

  // Photos upload after the doc exists so they can live at a path keyed by its id;
  // attach the resulting URLs with a follow-up update rather than blocking doc creation
  // on the (much slower) file upload. A failure here (flaky salon Wi-Fi on a large phone
  // photo, a Storage hiccup) must not fail the whole save: the doc above - client name,
  // formula, pricing, patch-test info - is already durably persisted. Letting this
  // reject would surface as a generic save error to the stylist even though the entry
  // was in fact saved, and a plausible retry would then create a second, duplicate
  // history entry for the same visit. Logged rather than swallowed silently, so a
  // missing photo is still traceable after the fact.
  try {
    const [beforePhotoUrl, afterPhotoUrl] = await Promise.all([
      params.beforePhotoFile ? uploadFormulaPhoto(docRef.id, "before", params.beforePhotoFile) : Promise.resolve(null),
      params.afterPhotoFile ? uploadFormulaPhoto(docRef.id, "after", params.afterPhotoFile) : Promise.resolve(null),
    ]);
    if (beforePhotoUrl !== null || afterPhotoUrl !== null) {
      await updateDoc(docRef, {
        ...(beforePhotoUrl !== null ? { beforePhotoUrl } : {}),
        ...(afterPhotoUrl !== null ? { afterPhotoUrl } : {}),
      });
    }
  } catch (err) {
    console.error(`Saved formula history entry "${docRef.id}", but attaching its photo(s) failed:`, err);
  }
}

export interface SetActualColorGramsParams {
  id: string;
  // The entry's steps exactly as currently held by the caller (HistoryView's fetched
  // state) -- both the base for the patched array and the "before" side of the stock
  // reconciliation, so repeated edits of the same entry stay correct.
  steps: HistoryStep[];
  stepIndex: number;
  // null clears the recorded figure and returns every derived number to the engine's
  // computed grams.
  actualColorGrams: number | null;
}

// The fields the caller must merge into its local copy of the entry.
export interface ActualColorGramsResult {
  steps: HistoryStep[];
  productCost: number | null;
}

// History is otherwise append-only; this is the one post-save amendment: what was actually
// weighed out is knowable only after the service. Patches the step, recomputes the stored
// productCost from the actual grams (servicePrice is deliberately left alone -- it may be
// a price the stylist manually agreed with the client, not a derived number), then
// reconciles dye stock by the difference. The stock write is best-effort for the same
// reason saveFormulaToHistory's consumeStock is: a stock failure must not make the stylist
// retype a fact that is already recorded.
export async function setActualColorGrams(params: SetActualColorGramsParams): Promise<ActualColorGramsResult> {
  const target = params.steps[params.stepIndex];
  if (target === undefined || target.kind !== "color") {
    throw new Error(`Cannot record actual grams for step ${params.stepIndex} of history entry ${params.id}: not a color step`);
  }
  const steps = params.steps.map((step, index) =>
    index === params.stepIndex ? { ...step, actualColorGrams: params.actualColorGrams } : step
  );
  const productCost = calculateSessionProductCost(steps);
  await updateDoc(doc(db, HISTORY_COLLECTION, params.id), {
    steps: sanitizeForFirestore(steps),
    productCost,
  });
  try {
    await reconcileStockConsumption(params.steps, steps);
  } catch (err) {
    console.error(`Recorded actual grams on history entry "${params.id}", but adjusting dye stock failed:`, err);
  }
  return { steps, productCost };
}

// Every stylist may only see the clients they personally entered (identified by the
// `appliedBy` email captured at save time - see App.tsx, which always passes the
// signed-in `user.email`, never a free-typed name); an admin sees the whole salon's
// history. `isAdmin`/`currentUserEmail` come from the caller (HistoryView/AnalyticsView),
// which already reads them off the authenticated session (useIsAdmin/user.email).
//
// The `where("appliedBy", "==", currentUserEmail)` filter isn't just a client-side
// convenience: firestore.rules denies a non-admin's read of any document whose
// `appliedBy` doesn't match their own token email, and Firestore rejects a `list` query
// outright unless the query itself is constrained to a result set the rule can prove
// satisfies that condition - so admin and non-admin genuinely need different queries,
// not just different client-side filtering of the same fetch.
export async function fetchFormulaHistory(scope: { isAdmin: boolean; currentUserEmail: string }): Promise<FormulaHistoryEntry[]> {
  const q = scope.isAdmin
    ? query(collection(db, HISTORY_COLLECTION), orderBy("appliedAt", "desc"))
    : query(collection(db, HISTORY_COLLECTION), where("appliedBy", "==", scope.currentUserEmail), orderBy("appliedAt", "desc"));
  const snapshot = await getDocs(q);
  const entries: FormulaHistoryEntry[] = [];
  for (const doc of snapshot.docs) {
    const result = historyEntryShapeSchema.safeParse({ id: doc.id, ...doc.data() });
    if (!result.success) {
      console.error(`Skipping malformed history document "${doc.id}":`, result.error.issues);
      continue;
    }
    // See historyEntryShapeSchema's comment above for why this is shallow (result.data's
    // nested fields are validated as "some object", not deep-checked against FullFormula/
    // BleachFormula) - the cast trusts only the fields the schema left unvalidated.
    entries.push(normalizeHistoryEntry(result.data as unknown as LegacyFormulaHistoryEntry | FormulaHistoryEntry));
  }
  return entries;
}

// Best-effort delete of one uploaded photo slot -- mirrors uploadFormulaPhoto's own
// deterministic path (formulaHistory/{historyId}/{slot}), so no stored URL needs
// parsing. "storage/object-not-found" is swallowed (the slot was simply never
// uploaded); any other failure is logged, not thrown, so a Storage hiccup can never
// block deleting the Firestore record itself -- see deleteHistoryEntry below.
async function deleteFormulaPhoto(historyId: string, slot: "before" | "after"): Promise<void> {
  try {
    await deleteObject(ref(storage, `formulaHistory/${historyId}/${slot}`));
  } catch (err) {
    const isObjectNotFound = typeof err === "object" && err !== null && "code" in err && err.code === "storage/object-not-found";
    if (!isObjectNotFound) {
      console.error(`Failed to delete "${slot}" photo for history entry "${historyId}":`, err);
    }
  }
}

// Permanently erases one saved visit -- admin-only (see firestore.rules), used by
// HistoryView's "Delete client" flow to wipe every visit belonging to a client being
// deleted. Deletes both photo slots before the document itself so a partial failure
// never leaves an orphaned Storage object with no Firestore record pointing back to it.
export async function deleteHistoryEntry(entry: Pick<FormulaHistoryEntry, "id" | "beforePhotoUrl" | "afterPhotoUrl">): Promise<void> {
  await Promise.all([
    entry.beforePhotoUrl !== null ? deleteFormulaPhoto(entry.id, "before") : Promise.resolve(),
    entry.afterPhotoUrl !== null ? deleteFormulaPhoto(entry.id, "after") : Promise.resolve(),
  ]);
  await deleteDoc(doc(db, HISTORY_COLLECTION, entry.id));
}
