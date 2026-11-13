import { useMemo, useState } from "react";
import { findNaturalBaseCandidates, splitNaturalBase, type FullFormula, type NaturalBase } from "../../engine/formula";
import type { Shade } from "../../engine/shades";

export interface GrayNaturalBaseSeed {
  grayNaturalApplied?: boolean;
  naturalBaseShadeCode?: string | null;
}

// Gray-coverage natural base (see GrayNaturalField): whether to dose it in, the
// colorist's own pick among the candidates (null means "use the default candidate"),
// and the resulting shade and grams.
export function useGrayNaturalBase(
  targetShade: Shade,
  lineShades: Shade[],
  result: FullFormula,
  initial?: GrayNaturalBaseSeed,
) {
  const [grayNaturalApplied, setGrayNaturalApplied] = useState(initial?.grayNaturalApplied ?? false);
  const [naturalBaseShadeCode, setNaturalBaseShadeCode] = useState<string | null>(
    initial?.naturalBaseShadeCode ?? null,
  );

  // The natural base is carved out of the base color weight (result.grams, i.e. before
  // any additional shade is added on top) -- see splitNaturalBase. Null unless opted in
  // AND the gray % calls for a natural dose AND the line has a natural at the target's
  // level. Both memoized: useColorStepReport's "report the computed step up" effect
  // depends on naturalBase's identity, and a fresh object every render would loop that
  // effect forever.
  const naturalBaseCandidates = useMemo(
    () => findNaturalBaseCandidates(targetShade, lineShades),
    [targetShade, lineShades],
  );
  const naturalBase = useMemo((): NaturalBase | null => {
    const naturalRatio = result.grayCoverage.naturalRatio;
    if (!grayNaturalApplied || naturalRatio === 0 || naturalBaseCandidates.length === 0 || result.grams === null)
      return null;
    const shade = naturalBaseCandidates.find(s => s.code === naturalBaseShadeCode) ?? naturalBaseCandidates[0];
    return { shade, grams: splitNaturalBase(result.grams.colorGrams, naturalRatio).naturalGrams };
  }, [grayNaturalApplied, naturalBaseShadeCode, naturalBaseCandidates, result]);

  return {
    grayNaturalApplied,
    setGrayNaturalApplied,
    naturalBaseShadeCode,
    setNaturalBaseShadeCode,
    naturalBaseCandidates,
    naturalBase,
  };
}
