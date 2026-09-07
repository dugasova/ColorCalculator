import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";
import type { HistoryStep, FormulaHistoryEntry, LegacyFormulaHistoryEntry } from "./types";
import { historyEntryShapeSchema, normalizeHistoryEntry } from "./schema";

const HISTORY_COLLECTION = "formulaHistory";

export interface SaveFormulaParams {
  clientName: string;
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

  // Photos upload after the doc exists so they can live at a path keyed by its id;
  // attach the resulting URLs with a follow-up update rather than blocking doc creation
  // on the (much slower) file upload.
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
}

export async function fetchFormulaHistory(): Promise<FormulaHistoryEntry[]> {
  const q = query(collection(db, HISTORY_COLLECTION), orderBy("appliedAt", "desc"));
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
    // BleachFormula) -- the cast trusts only the fields the schema left unvalidated.
    entries.push(normalizeHistoryEntry(result.data as unknown as LegacyFormulaHistoryEntry | FormulaHistoryEntry));
  }
  return entries;
}
