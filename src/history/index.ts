// Public surface of the history module, split by concern:
//  - ./types          saved-session domain types (current + legacy shape)
//  - ./schema         Firestore document shape validation + legacy-shape migration
//  - ./firestore       read/write I/O against the formulaHistory collection
//  - ./repeatFormula   reconstructing calculator input from a saved entry ("Repeat")
// Re-exported from one module so callers needing e.g. a type from ./types alongside a
// function from ./repeatFormula (App.tsx, HistoryView.tsx) keep a single import.
export type {
  ColorHistoryStep, ColorBlend, BleachHistoryStep, HistoryStep, FormulaHistoryEntry, LegacyFormulaHistoryEntry,
} from "./types";
export { historyEntryShapeSchema, normalizeHistoryEntry } from "./schema";
export { sanitizeForFirestore, saveFormulaToHistory, fetchFormulaHistory, type SaveFormulaParams } from "./firestore";
export { buildRepeatFormulaRequest, type RepeatFormulaRequest } from "./repeatFormula";
