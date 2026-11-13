import { useMemo, useState } from "react";
import type { Level } from "../../engine/levels";
import { calculateBleachFormula } from "../../engine/bleach";

// Rough per-gram cost of generic bleach powder; fully editable on both screens, mirrors
// FormulaCalculator's generic-brand default.
export const DEFAULT_BLEACH_PRICE_PER_GRAM = 0.1;

export interface BleachFormulaSeed {
  startLevel?: Level;
  targetLevel?: Level;
  totalGrams?: number;
  pricePerGram?: number;
}

// The inputs and the calculation every bleach mix has, shared by the standalone
// BleachCalculator and a bleach step of a Complex Coloring session (BleachStepCard).
// Each screen adds its own state on top: the page its markup, the step its zone,
// starting base, canvas and processing time. `seed` is read once, at mount.
export function useBleachFormulaState(seed?: BleachFormulaSeed) {
  const [startLevel, setStartLevel] = useState<Level>(seed?.startLevel ?? 6);
  const [targetLevel, setTargetLevel] = useState<Level>(seed?.targetLevel ?? 8);
  const [totalGrams, setTotalGrams] = useState(seed?.totalGrams ?? 60);
  const [pricePerGram, setPricePerGram] = useState(seed?.pricePerGram ?? DEFAULT_BLEACH_PRICE_PER_GRAM);

  // Memoized so a caller's own memo that depends on `result` (BleachStepCard's reported
  // step) keeps its identity until an input changes -- calculateBleachFormula builds a
  // fresh object on every call.
  const result = useMemo(
    () => calculateBleachFormula(startLevel, targetLevel, totalGrams),
    [startLevel, targetLevel, totalGrams],
  );

  return {
    startLevel,
    setStartLevel,
    targetLevel,
    setTargetLevel,
    totalGrams,
    setTotalGrams,
    pricePerGram,
    setPricePerGram,
    result,
  };
}
