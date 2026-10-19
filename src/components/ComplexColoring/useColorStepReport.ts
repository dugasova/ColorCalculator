import { useEffect, useMemo } from "react";
import type { Brand, BrandId } from "../../engine/brands";
import {
  getPrePigmentationNeed, calculatePrePigmentation, type PrePigmentationNeed, type PrePigmentationResult,
} from "../../engine/prePigmentation";
import type { StartingBase } from "../../engine/startingBase";
import type { StrandZone } from "../../engine/strandZone";
import type { ColorHistoryStep } from "../../history";
import type { ShadeFormulaState } from "../FormulaCalculator/useShadeFormulaState";

export interface UseColorStepReportParams {
  brands: Record<BrandId, Brand>;
  formula: ShadeFormulaState;
  strandZone: StrandZone;
  startingBase: StartingBase;
  pricePerGram: number;
  prePigmentationEnabled: boolean;
  onChange: (step: ColorHistoryStep) => void;
}

// Computes one ColorStepCard's pre-pigmentation and reports the assembled step up to
// ComplexColoringCalculator on every change. `formula`/`params` are fresh objects every
// render, so they're destructured into plain values first -- only those values (never
// the containing objects) may appear in the memo/effect dependency arrays below.
export function useColorStepReport({
  brands, formula, strandZone, startingBase, pricePerGram, prePigmentationEnabled, onChange,
}: UseColorStepReportParams): { prePigmentationNeed: PrePigmentationNeed; prePigmentationResult: PrePigmentationResult | null } {
  const {
    brandId, line, targetShade, startLevel, grayPercent, porosity, thickness, chemicalHistory,
    applicationZone, effectiveTotalGrams, lineShades, effectiveResult,
    additionalShade, additionalShadeGrams, additionalShade2, additionalShade2Grams,
    neutralizationApplied, processingMinutes,
  } = formula;

  // Reevaluated from startLevel/targetShade every render, matched against this step's
  // own selected line (lineShades) -- same derivation as FormulaCalculator's
  // useFormulaCalculatorState, kept as its own hook here since ColorStepCard doesn't
  // otherwise use that one. Gated on prePigmentationEnabled so toggling the checkbox off
  // drops the filler step from both the card and the combined session text/save payload.
  // Memoized (unlike useFormulaCalculatorState's own unmemoized version, which has no
  // reporting effect depending on it): calculatePrePigmentation builds a fresh object
  // literal every call, and this result sits in the "report computed step up" effect's
  // dependency array below (see useComputedFullFormula's own identical comment) -- an
  // unmemoized new object every render would fire that effect every render, which calls
  // the parent's setState, which re-renders the card, which produces yet another new
  // object: infinite "Maximum update depth exceeded" the moment prePigmentation turns on.
  const prePigmentationNeed = getPrePigmentationNeed(startLevel, targetShade.level);
  const prePigmentationResult = useMemo(
    () => (prePigmentationEnabled && prePigmentationNeed !== "none"
      ? calculatePrePigmentation(startLevel, targetShade.level, effectiveTotalGrams, lineShades)
      : null),
    [prePigmentationEnabled, prePigmentationNeed, startLevel, targetShade, effectiveTotalGrams, lineShades]
  );

  // Report the computed step up on every change — the parent aggregates all steps'
  // totals (time, cost) and builds the combined recipe text/save payload from them.
  // Deliberately not listed:
  //  - `onChange`: the parent passes a fresh inline arrow every render
  //    (ComplexColoringCalculator), so listing it would fire this effect every render --
  //    the same infinite loop as above.
  //  - `brands` (only read for the display name), and `startLevel`/`targetShade`/
  //    `grayPercent`/`line`: every one of those feeds `effectiveResult` (see
  //    useComputedFullFormula), so a change to any of them already re-fires this effect.
  useEffect(() => {
    const stepData: ColorHistoryStep = {
      kind: "color",
      brandId,
      brandName: brands[brandId].name,
      line,
      targetShade,
      startLevel,
      grayPercent,
      canvas: { porosity, thickness, chemicalHistory },
      applicationZone,
      strandZone,
      startingBase,
      result: effectiveResult,
      additionalShade,
      additionalShadeGrams: additionalShade !== null ? additionalShadeGrams : null,
      additionalShade2,
      additionalShade2Grams: additionalShade2 !== null ? additionalShade2Grams : null,
      blend: null,
      prePigmentation: prePigmentationResult,
      neutralizationApplied,
      processingMinutes,
      pricePerGram,
    };
    onChange(stepData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    brandId, applicationZone, strandZone, startingBase, effectiveResult, additionalShade, additionalShadeGrams, additionalShade2, additionalShade2Grams, neutralizationApplied, processingMinutes, pricePerGram,
    porosity, thickness, chemicalHistory, prePigmentationResult
  ]);

  return { prePigmentationNeed, prePigmentationResult };
}
