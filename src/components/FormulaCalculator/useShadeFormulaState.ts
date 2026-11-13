import { useMemo, useState } from "react";
import { applyAdditionalShade, calculateFullFormula, resolveShadeMixingRatio } from "../../engine/formula";
import type { DeveloperVolume, Level } from "../../engine/levels";
import type { Brand, BrandId } from "../../engine/brands";
import type { MixingRatio, Shade } from "../../engine/shades";
import type { HairCanvas, Porosity } from "../../engine/canvas";
import type { ColorStepSeed } from "../../history";
import { useHairCanvasState } from "./useHairCanvasState";
import { useShadeSelection } from "./useShadeSelection";
import { useAdditionalShades } from "./useAdditionalShades";
import { useManualOverrides } from "./useManualOverrides";
import { useGramsInput } from "./useGramsInput";
import { useGrayNaturalBase } from "./useGrayNaturalBase";

// Split out of useShadeFormulaState below (not just inlined there) so this memoization
// lives in a function body with no render-time `setState` calls of its own.
// calculateFullFormula/applyAdditionalShade are pure functions that build a fresh object
// literal on every call, so without memoization `result`/`grams`/`effectiveResult` would
// get a brand-new identity on every render even when nothing actually changed.
// ColorStepCard's "report the computed step up" effect (see useColorStepReport) depends
// on `effectiveResult`'s identity -- an unmemoized new object every render fires that
// effect every render, which calls the parent's setState, which re-renders this hook,
// which produces yet another new object: an infinite "Maximum update depth exceeded"
// loop the moment a ColorStepCard mounts.
function useComputedFullFormula(
  startLevel: Level,
  targetShade: Shade,
  grayPercent: number,
  totalGrams: number,
  mixingRatioStrategy: (startLevel: Level, targetLevel: Level) => MixingRatio,
  manualDeveloperVolume: DeveloperVolume | undefined,
  manualMixingRatio: MixingRatio | undefined,
  totalExtra: number,
  colorGramsOverride: number | undefined,
  porosity: Porosity,
) {
  const result = useMemo(
    () =>
      calculateFullFormula({
        startLevel,
        targetShade,
        grayPercent,
        totalGrams,
        mixingRatioStrategy,
        manualDeveloperVolume,
        manualMixingRatio,
        colorGramsOverride,
        porosity,
      }),
    [
      startLevel,
      targetShade,
      grayPercent,
      totalGrams,
      mixingRatioStrategy,
      manualDeveloperVolume,
      manualMixingRatio,
      colorGramsOverride,
      porosity,
    ],
  );
  const grams = useMemo(
    () =>
      result.grams !== null && totalExtra > 0
        ? applyAdditionalShade(result.grams, result.mixingRatio, totalExtra)
        : result.grams,
    [result, totalExtra],
  );
  const effectiveResult = useMemo(() => (grams !== result.grams ? { ...result, grams } : result), [grams, result]);
  return { result, grams, effectiveResult };
}

export interface UseShadeFormulaStateOptions {
  brands: Record<BrandId, Brand>;
  initialCanvas?: HairCanvas;
  // Mount-time seed for a History "Repeat" of a saved session (see
  // buildRepeatSessionRequest) -- same lazy-initial-value contract as `initialCanvas`
  // above: read once into each `useState` default below, never replayed on a later render.
  initial?: ShadeFormulaSeed;
}

export type ShadeFormulaSeed = Pick<
  ColorStepSeed,
  | "brandId"
  | "line"
  | "targetShadeCode"
  | "startLevel"
  | "grayPercent"
  | "totalGrams"
  | "colorGrams"
  | "manualDeveloperVolume"
  | "manualMixingRatio"
  | "processingMinutes"
  | "additionalShadeCode"
  | "additionalShadeGrams"
  | "additionalShade2Code"
  | "additionalShade2Grams"
  | "grayNaturalApplied"
  | "naturalBaseShadeCode"
>;

// The brand/line/shade selection, developer/application/gram overrides, additional-shade
// blend-on-top, and resulting formula calculation shared by FormulaCalculator and
// ColorStepCard (one color/tone step within a complex-coloring session). Each caller layers
// its own extra state on top (FormulaCalculator: repeat-request replay, substitute-blend
// mode, cross-brand match, markup/service price; ColorStepCard: a flat price-per-gram
// field) -- see resetShadePoolOverrides for the shade-pool-changed reset point a caller
// with its own overrides plugs into. The additional shade may be combined with
// FormulaCalculator's substitute blend (blendModeEnabled) -- both add real weight to the
// same `grams` total, so this hook applies the additional-shade grams unconditionally;
// the blend split itself works off the pre-additional `result.grams.colorGrams` (see
// useFormulaCalculatorState's `blend`), so the two calculations never collide.
export function useShadeFormulaState({ brands, initialCanvas, initial }: UseShadeFormulaStateOptions) {
  const { porosity, setPorosity, thickness, setThickness, chemicalHistory, setChemicalHistory } =
    useHairCanvasState(initialCanvas);
  const [startLevel, setStartLevel] = useState<Level>(initial?.startLevel ?? 10);
  const [grayPercent, setGrayPercent] = useState(initial?.grayPercent ?? 0);
  const [neutralizationApplied, setNeutralizationApplied] = useState(false);

  const selection = useShadeSelection(brands, initial);
  const { brandId, lineShades, targetShade } = selection;
  const additional = useAdditionalShades(lineShades, initial);
  const overrides = useManualOverrides(targetShade, initial);
  const mixingRatio = resolveShadeMixingRatio(
    startLevel,
    targetShade,
    brands[brandId].mixingRatio,
    overrides.effectiveManualMixingRatio,
  );
  const gramsInput = useGramsInput(mixingRatio, initial);

  const { result, grams, effectiveResult } = useComputedFullFormula(
    startLevel,
    targetShade,
    grayPercent,
    gramsInput.totalGrams,
    brands[brandId].mixingRatio,
    overrides.effectiveManualDeveloperVolume,
    overrides.effectiveManualMixingRatio,
    additional.totalExtraGrams,
    gramsInput.colorGramsOverride,
    porosity,
  );
  const grayNatural = useGrayNaturalBase(targetShade, lineShades, result, initial);
  const { effectiveTotalGrams } = gramsInput;
  const processingMinutes = overrides.manualProcessingMinutes ?? result.recommendedProcessingMinutes;

  // Shared by every handler that changes which target shade is in play (see
  // resetShadePoolOverrides for the additional resets when the whole shade POOL changes,
  // e.g. brand/line) -- per-shade manual overrides (developer volume, processing time)
  // don't necessarily carry over to a different shade.
  function resetShadeDependentOverrides() {
    overrides.resetManualOverrides();
    setNeutralizationApplied(false);
    // Only the picked natural shade is shade-dependent; whether to dose a natural base at
    // all follows the client's gray %, not the target, so grayNaturalApplied carries over.
    grayNatural.setNaturalBaseShadeCode(null);
  }

  // Additionally used whenever the whole available-shade pool changes (new brand or
  // line): an additional-shade selection may no longer exist in the new pool at all,
  // unlike a same-pool target change.
  function resetShadePoolOverrides() {
    resetShadeDependentOverrides();
    additional.resetAdditionalShades();
  }

  const handleBrandIdChange = (newBrandId: BrandId) => {
    selection.selectBrand(newBrandId);
    resetShadePoolOverrides();
  };

  const handleLineChange = (newLine: string | null) => {
    selection.selectLine(newLine);
    resetShadePoolOverrides();
  };

  const handleTargetShadeCodeChange = (code: string) => {
    selection.setTargetShadeCode(code);
    resetShadeDependentOverrides();
  };

  return {
    startLevel,
    setStartLevel,
    grayPercent,
    setGrayPercent,
    porosity,
    setPorosity,
    thickness,
    setThickness,
    chemicalHistory,
    setChemicalHistory,
    neutralizationApplied,
    setNeutralizationApplied,

    // brand / line / shade
    brandId,
    setBrandId: selection.setBrandId,
    line: selection.line,
    setLine: selection.setLine,
    targetShadeCode: selection.targetShadeCode,
    setTargetShadeCode: selection.setTargetShadeCode,
    availableLines: selection.availableLines,
    lineShades,
    targetShade,

    // amount
    applicationZone: gramsInput.applicationZone,
    setApplicationZone: gramsInput.setApplicationZone,
    totalGrams: gramsInput.totalGrams,
    setTotalGrams: gramsInput.setTotalGrams,
    gramsInputMode: gramsInput.gramsInputMode,
    setGramsInputMode: gramsInput.setGramsInputMode,
    colorGrams: gramsInput.colorGrams,
    setColorGrams: gramsInput.setColorGrams,
    effectiveTotalGrams,

    // manual overrides
    manualDeveloperVolume: overrides.manualDeveloperVolume,
    setManualDeveloperVolume: overrides.setManualDeveloperVolume,
    manualMixingRatio: overrides.manualMixingRatio,
    setManualMixingRatio: overrides.setManualMixingRatio,
    manualProcessingMinutes: overrides.manualProcessingMinutes,
    setManualProcessingMinutes: overrides.setManualProcessingMinutes,
    processingMinutes,

    // additional shades
    additionalShadeCode: additional.additionalShadeCode,
    setAdditionalShadeCode: additional.setAdditionalShadeCode,
    additionalShadeGrams: additional.additionalShadeGrams,
    setAdditionalShadeGrams: additional.setAdditionalShadeGrams,
    additionalShade2Code: additional.additionalShade2Code,
    setAdditionalShade2Code: additional.setAdditionalShade2Code,
    additionalShade2Grams: additional.additionalShade2Grams,
    setAdditionalShade2Grams: additional.setAdditionalShade2Grams,
    additionalShade: additional.additionalShade,
    additionalShade2: additional.additionalShade2,

    // gray-coverage natural base
    grayNaturalApplied: grayNatural.grayNaturalApplied,
    setGrayNaturalApplied: grayNatural.setGrayNaturalApplied,
    naturalBaseShadeCode: grayNatural.naturalBaseShadeCode,
    setNaturalBaseShadeCode: grayNatural.setNaturalBaseShadeCode,
    naturalBaseCandidates: grayNatural.naturalBaseCandidates,
    naturalBase: grayNatural.naturalBase,

    // formula
    result,
    grams,
    effectiveResult,

    resetShadePoolOverrides,
    handleBrandIdChange,
    handleLineChange,
    handleTargetShadeCodeChange,
    handleApplicationZoneChange: gramsInput.handleApplicationZoneChange,
    handleAdditionalShadeCodeChange: additional.handleAdditionalShadeCodeChange,
  };
}

// Everything useShadeFormulaState returns -- lets a layering hook (see
// ComplexColoring/useColorStepReport) take the whole formula state as one parameter.
export type ShadeFormulaState = ReturnType<typeof useShadeFormulaState>;
