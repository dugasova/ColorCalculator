import { useMemo, useState } from "react";
import type { DeveloperVolume, Level } from "../../engine/levels";
import { calculateBleachFormula, MAX_BLEACH_TARGET_LEVEL } from "../../engine/bleach";

// Rough per-gram cost of generic bleach powder; fully editable on both screens, mirrors
// FormulaCalculator's generic-brand default.
export const DEFAULT_BLEACH_PRICE_PER_GRAM = 0.1;

export interface BleachFormulaSeed {
  startLevel?: Level;
  targetLevel?: Level;
  totalGrams?: number;
  pricePerGram?: number;
  manualDeveloperVolume?: DeveloperVolume | null;
}

// The inputs and the calculation every bleach mix has, shared by the standalone
// BleachCalculator and a bleach step of a Complex Coloring session (BleachStepCard).
// Each screen adds its own state on top: the page its markup, the step its zone,
// starting base, canvas and processing time. `seed` is read once, at mount.
// `onScalp` is false when the powder doesn't touch the scalp (see calculateBleachFormula).
export function useBleachFormulaState(seed?: BleachFormulaSeed, onScalp = true) {
  const [startLevel, setStartLevel] = useState<Level>(seed?.startLevel ?? 6);
  // A visit saved before targets stopped at 10 may still carry 11 or 12.
  const [targetLevel, setTargetLevel] = useState<Level>(
    Math.min(seed?.targetLevel ?? 8, MAX_BLEACH_TARGET_LEVEL) as Level,
  );
  const [totalGrams, setTotalGrams] = useState(seed?.totalGrams ?? 60);
  const [pricePerGram, setPricePerGram] = useState(seed?.pricePerGram ?? DEFAULT_BLEACH_PRICE_PER_GRAM);
  // Null: the developer is picked automatically for each session.
  const [manualDeveloperVolume, setManualDeveloperVolume] = useState<DeveloperVolume | null>(
    seed?.manualDeveloperVolume ?? null,
  );

  // Memoized so a caller's own memo that depends on `result` (BleachStepCard's reported
  // step) keeps its identity until an input changes -- calculateBleachFormula builds a
  // fresh object on every call.
  const result = useMemo(
    () => calculateBleachFormula(startLevel, targetLevel, totalGrams, onScalp, manualDeveloperVolume),
    [startLevel, targetLevel, totalGrams, onScalp, manualDeveloperVolume],
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
    manualDeveloperVolume,
    setManualDeveloperVolume,
    result,
  };
}
