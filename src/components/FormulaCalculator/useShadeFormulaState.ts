import { useMemo, useState } from "react";
import { compareShadesForDisplay } from "../../engine/shades";
import { GENERIC_SHADE_CHART } from "../../engine/brands/generic";
import { applyAdditionalShade, calculateFullFormula } from "../../engine/formula";
import type { DeveloperVolume, Level } from "../../engine/levels";
import { APPLICATION_ZONE_DEFAULT_GRAMS, type ApplicationZone } from "../../engine/applicationZone";
import type { Brand, BrandId } from "../../engine/brands";
import type { MixingRatio, Shade } from "../../engine/shades";
import type { HairCanvas } from "../../engine/canvas";
import { useHairCanvasState } from "./useHairCanvasState";

// Split out of useShadeFormulaState below (not just inlined there) so this memoization
// lives in a function body with no render-time `setState` calls of its own.
// calculateFullFormula/applyAdditionalShade are pure functions that build a fresh object
// literal on every call, so without memoization `result`/`grams`/`effectiveResult` would
// get a brand-new identity on every render even when nothing actually changed.
// ColorStepCard's "report the computed step up" effect (see ColorStepCard.tsx) depends
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
) {
  const result = useMemo(
    () => calculateFullFormula(startLevel, targetShade, grayPercent, totalGrams, mixingRatioStrategy, manualDeveloperVolume, manualMixingRatio),
    [startLevel, targetShade, grayPercent, totalGrams, mixingRatioStrategy, manualDeveloperVolume, manualMixingRatio]
  );
  const grams = useMemo(
    () => (result.grams !== null && totalExtra > 0
      ? applyAdditionalShade(result.grams, result.mixingRatio, totalExtra)
      : result.grams),
    [result, totalExtra]
  );
  const effectiveResult = useMemo(
    () => (grams !== result.grams ? { ...result, grams } : result),
    [grams, result]
  );
  return { result, grams, effectiveResult };
}

export interface UseShadeFormulaStateOptions {
  brands: Record<BrandId, Brand>;
  initialCanvas?: HairCanvas;
}

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
export function useShadeFormulaState({ brands, initialCanvas }: UseShadeFormulaStateOptions) {
  const { porosity, setPorosity, thickness, setThickness, chemicalHistory, setChemicalHistory } = useHairCanvasState(initialCanvas);
  const [startLevel, setStartLevel] = useState<Level>(10);
  const [grayPercent, setGrayPercent] = useState(0);
  const [targetShadeCode, setTargetShadeCode] = useState(GENERIC_SHADE_CHART[0].code);
  const [applicationZone, setApplicationZone] = useState<ApplicationZone>("full-head");
  const [totalGrams, setTotalGrams] = useState(APPLICATION_ZONE_DEFAULT_GRAMS["full-head"]);
  const [brandId, setBrandId] = useState<BrandId>("generic");
  const [line, setLine] = useState<string | null>(null);
  const [manualDeveloperVolume, setManualDeveloperVolume] = useState<DeveloperVolume | undefined>(undefined);
  const [manualMixingRatio, setManualMixingRatio] = useState<MixingRatio | undefined>(undefined);
  const [manualProcessingMinutes, setManualProcessingMinutes] = useState<number | undefined>(undefined);
  const [additionalShadeCode, setAdditionalShadeCode] = useState<string | null>(null);
  const [additionalShadeGrams, setAdditionalShadeGrams] = useState(0);
  const [additionalShade2Code, setAdditionalShade2Code] = useState<string | null>(null);
  const [additionalShade2Grams, setAdditionalShade2Grams] = useState(0);
  const [neutralizationApplied, setNeutralizationApplied] = useState(false);

  const availableLines = Array.from(new Set(brands[brandId].shades.map(s => s.line ?? null)));
  // Memoized: `brands[brandId].shades` is a stable array reference from context (only a
  // real palette change gives it a new one), so this only recomputes when the brand/line
  // selection or the palette itself actually changes -- an unmemoized `.filter().sort()`
  // would return a brand-new array every render, which is exactly the kind of unstable
  // identity a caller's own memoized derivation (e.g. ColorStepCard's prePigmentationResult,
  // via useComputedFullFormula's own identical concern above) can't safely depend on.
  const lineShades = useMemo(
    () => brands[brandId].shades.filter(s => (s.line ?? null) === line).sort(compareShadesForDisplay),
    [brands, brandId, line]
  );

  // Shared by every handler that changes which target shade is in play (see
  // resetShadePoolOverrides for the additional resets when the whole shade POOL changes,
  // e.g. brand/line) -- per-shade manual overrides (developer volume, processing time)
  // don't necessarily carry over to a different shade.
  function resetShadeDependentOverrides() {
    setManualDeveloperVolume(undefined);
    setManualMixingRatio(undefined);
    setManualProcessingMinutes(undefined);
    setNeutralizationApplied(false);
  }

  // Additionally used whenever the whole available-shade pool changes (new brand or
  // line): an additional-shade selection may no longer exist in the new pool at all,
  // unlike a same-pool target change.
  function resetShadePoolOverrides() {
    resetShadeDependentOverrides();
    setAdditionalShade2Code(null);
    setAdditionalShade2Grams(0);
    setAdditionalShadeCode(null);
    setAdditionalShadeGrams(0);
  }

  const handleBrandIdChange = (newBrandId: BrandId) => {
    const firstShade = brands[newBrandId].shades[0];
    setBrandId(newBrandId);
    setLine(firstShade.line ?? null);
    setTargetShadeCode(firstShade.code);
    resetShadePoolOverrides();
  };

  const handleLineChange = (newLine: string | null) => {
    const firstShade = brands[brandId].shades.find(s => (s.line ?? null) === newLine)!;
    setLine(newLine);
    setTargetShadeCode(firstShade.code);
    resetShadePoolOverrides();
  };

  const handleTargetShadeCodeChange = (code: string) => {
    setTargetShadeCode(code);
    resetShadeDependentOverrides();
  };

  const handleApplicationZoneChange = (zone: ApplicationZone) => {
    setApplicationZone(zone);
    setTotalGrams(APPLICATION_ZONE_DEFAULT_GRAMS[zone]);
  };

  const handleAdditionalShadeCodeChange = (code: string | null) => {
    setAdditionalShadeCode(code);
    setAdditionalShadeGrams(0);
  };

  // The live palette (usePalette(), fed by Firestore onSnapshot) can change out from
  // under an in-progress selection: an admin can discontinue the currently selected
  // shade -- or every shade in the currently selected line -- while a stylist has it
  // open elsewhere in the salon (see PaletteAdmin's discontinue toggle). `lineShades[0]`
  // alone isn't a safe fallback: once every shade in the current line is gone, it's
  // `undefined`, which used to crash render outright (this app renders no error
  // boundary) -- falls back through the brand's own first shade, then the universal
  // Generic chart, neither of which a real catalog is ever emptied of. Reconciles
  // targetShadeCode/line to match, right during render (same adjusting-state-on-a-
  // changed-value pattern as the repeat-request replay in useFormulaCalculatorState.ts)
  // -- otherwise the shade picker keeps showing the stale, no-longer-valid code
  // (rendering blank, since it matches nothing in `lineShades`) while the formula/
  // swatch/price silently keep recalculating for a shade the stylist never chose.
  const targetShade = lineShades.find(s => s.code === targetShadeCode)
    ?? lineShades[0]
    ?? brands[brandId].shades[0]
    ?? GENERIC_SHADE_CHART[0];
  if (targetShade.code !== targetShadeCode) {
    setTargetShadeCode(targetShade.code);
  }
  if ((targetShade.line ?? null) !== line) {
    setLine(targetShade.line ?? null);
  }
  const effectiveManualDeveloperVolume = targetShade.developerVolumeChoices
    ? (manualDeveloperVolume ?? targetShade.developerVolumeChoices[0])
    : undefined;
  const effectiveManualMixingRatio = targetShade.mixingRatioChoices
    ? (manualMixingRatio ?? targetShade.mixingRatioChoices[0])
    : undefined;
  const additionalShade = additionalShadeCode !== null ? lineShades.find(s => s.code === additionalShadeCode) ?? null : null;
  const additionalShade2 = additionalShade2Code !== null ? lineShades.find(s => s.code === additionalShade2Code) ?? null : null;
  const hasShade1 = additionalShade !== null && additionalShadeGrams > 0;
  const hasShade2 = additionalShade2 !== null && additionalShade2Grams > 0;
  const totalExtra = (hasShade1 ? additionalShadeGrams : 0) + (hasShade2 ? additionalShade2Grams : 0);
  const { result, grams, effectiveResult } = useComputedFullFormula(
    startLevel, targetShade, grayPercent, totalGrams, brands[brandId].mixingRatio, effectiveManualDeveloperVolume,
    effectiveManualMixingRatio, totalExtra
  );
  const processingMinutes = manualProcessingMinutes ?? result.recommendedProcessingMinutes;

  return {
    startLevel, setStartLevel,
    grayPercent, setGrayPercent,
    porosity, setPorosity,
    thickness, setThickness,
    chemicalHistory, setChemicalHistory,
    targetShadeCode, setTargetShadeCode,
    applicationZone, setApplicationZone,
    totalGrams, setTotalGrams,
    brandId, setBrandId,
    line, setLine,
    manualDeveloperVolume, setManualDeveloperVolume,
    manualMixingRatio, setManualMixingRatio,
    manualProcessingMinutes, setManualProcessingMinutes,
    additionalShadeCode, setAdditionalShadeCode,
    additionalShadeGrams, setAdditionalShadeGrams,
    additionalShade2Code, setAdditionalShade2Code,
    additionalShade2Grams, setAdditionalShade2Grams,
    neutralizationApplied, setNeutralizationApplied,

    availableLines,
    lineShades,
    targetShade,
    result,
    additionalShade,
    additionalShade2,
    grams,
    effectiveResult,
    processingMinutes,

    resetShadePoolOverrides,
    handleBrandIdChange,
    handleLineChange,
    handleTargetShadeCodeChange,
    handleApplicationZoneChange,
    handleAdditionalShadeCodeChange,
  };
}
