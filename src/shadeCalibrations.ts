import { collection, deleteDoc, doc, onSnapshot, setDoc, type FirestoreError, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { parseSnapshotDocs } from "./firestoreSubscribe";
import { settleWrite } from "./firestoreWrite";
import type { BrandId } from "./engine/brands";
import type { Lab } from "./engine/color";
import { shadeCalibrationId, shadeCalibrationSchema, type ShadeCalibration } from "./engine/shadeCalibration";

const SHADE_CALIBRATIONS_COLLECTION = "shadeCalibrations";

// Malformed documents are skipped and logged rather than propagated, same pattern as
// every other `subscribeToX` live query -- see firestoreSubscribe.ts's parseSnapshotDocs.
// A listener-level failure is reported via `onError` instead of throwing -- PaletteContext.tsx
// wires it to `console.error`, same as subscribeToStock/subscribeToPaletteOverrides.
export function subscribeToShadeCalibrations(
  onChange: (calibrations: ShadeCalibration[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe {
  return onSnapshot(collection(db, SHADE_CALIBRATIONS_COLLECTION), snapshot => {
    onChange(parseSnapshotDocs(snapshot, shadeCalibrationSchema, "shade calibration"));
  }, onError);
}

// Deterministic doc id (shadeCalibrationId) -- recalibrating the same shade overwrites
// its one document instead of accumulating duplicates, same rationale as
// stock/firestore.ts's setShadeStockGrams.
export async function setShadeCalibration(brandId: BrandId, line: string | null, code: string, lab: Lab): Promise<void> {
  await settleWrite(setDoc(doc(db, SHADE_CALIBRATIONS_COLLECTION, shadeCalibrationId(brandId, line, code)), {
    brandId, line, code, lab,
  }), "set shade calibration");
}

export async function deleteShadeCalibration(brandId: BrandId, line: string | null, code: string): Promise<void> {
  await deleteDoc(doc(db, SHADE_CALIBRATIONS_COLLECTION, shadeCalibrationId(brandId, line, code)));
}
