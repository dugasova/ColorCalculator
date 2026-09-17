import { useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { setActualColorGrams, type FormulaHistoryEntry } from "../../history";

// Inline editing of a saved visit's actual-color-used weight (entry.steps[i].actualColorGrams),
// keyed `${entry.id}::${stepIndex}` same as HistoryView's own row keys -- a draft exists
// only while a row is being edited; otherwise the input renders the persisted value.
export function useActualGramsEditor(setEntries: Dispatch<SetStateAction<FormulaHistoryEntry[]>>) {
  const { t } = useTranslation();
  const [gramsDrafts, setGramsDrafts] = useState<Record<string, string>>({});
  const [savingGramsKey, setSavingGramsKey] = useState<string | null>(null);
  const [gramsError, setGramsError] = useState<string | null>(null);

  const handleActualGramsChange = (key: string, value: string) => {
    setGramsDrafts(prev => ({ ...prev, [key]: value }));
  };

  const handleActualGramsBlur = async (entry: FormulaHistoryEntry, stepIndex: number) => {
    const key = `${entry.id}::${stepIndex}`;
    const draft = gramsDrafts[key];
    if (draft === undefined) return;
    const trimmed = draft.trim();
    let actualColorGrams: number | null;
    if (trimmed === "") {
      actualColorGrams = null;
    } else {
      const grams = Number(trimmed);
      if (!Number.isFinite(grams) || grams < 0) {
        setGramsError(t("history.actualGramsInvalid"));
        return;
      }
      actualColorGrams = grams;
    }
    setGramsError(null);
    setSavingGramsKey(key);
    try {
      const updated = await setActualColorGrams({ id: entry.id, steps: entry.steps, stepIndex, actualColorGrams });
      setEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, steps: updated.steps, productCost: updated.productCost } : e)));
      setGramsDrafts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      setGramsError(t("history.actualGramsSaveError"));
    } finally {
      setSavingGramsKey(null);
    }
  };

  return { gramsDrafts, savingGramsKey, gramsError, handleActualGramsChange, handleActualGramsBlur };
}
