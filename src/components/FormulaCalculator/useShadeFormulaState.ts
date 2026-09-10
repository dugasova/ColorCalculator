import { useState } from "react";
import { compareShadesForDisplay } from "../../engine/shades";
import { GENERIC_SHADE_CHART } from "../../engine/brands/generic";
import { applyAdditionalShade, calculateFullFormula } from "../../engine/formula";
import type { DeveloperVolume, Level } from "../../engine/levels";
import { APPLICATION_ZONE_DEFAULT_GRAMS, type ApplicationZone } from "../../engine/applicationZone";
import type { Brand, BrandId } from "../../engine/brands";
import { useHairCanvasState } from "./useHairCanvasState";

export interface UseShadeFormulaStateOptions {
  brands: Record<BrandId, Brand>;
  // FormulaCalculator's substitute-blend mode replaces the additional-shade calculation
  // entirely (see BlendComponentField/BlendRatioField) -- when it's on, this suppresses
  // applyAdditionalShade here so the two calculations never both try to adjust `grams`.
  // ColorStepCard has no blend mode, so it never needs this.
  suppressAdditionalShade?: boolean;
}

// The brand/line/shade selection, developer/application/gram overrides, additional-shade
// blend-on-top, and resulting formula calculation shared by FormulaCalculator and
// ColorStepCard (one color/tone step within a complex-coloring session). Each caller layers
// its own extra state on top (FormulaCalculator: repeat-request replay, substitute-blend
// mode, cross-brand match, markup/service price; ColorStepCard: a flat price-per-gram
// field) -- see resetShadePoolOverrides for the shade-pool-changed reset point a caller
// with its own overrides plugs into.
export function useShadeFormulaState({ brands, suppressAdditionalShade = false }: UseShadeFormulaStateOptions) {
  const { porosity, setPorosity, thickness, setThickness, chemicalHistory, setChemicalHistory } = useHairCanvasState();
  const [startLevel, setStartLevel] = useState<Level>(10);
  const [grayPercent, setGrayPercent] = useState(0);
  const [targetShadeCode, setTargetShadeCode] = useState(GENERIC_SHADE_CHART[0].code);
  const [applicationZone, setApplicationZone] = useState<ApplicationZone>("full-head");
  const [totalGrams, setTotalGrams] = useState(APPLICATION_ZONE_DEFAULT_GRAMS["full-head"]);
  const [brandId, setBrandId] = useState<BrandId>("generic");
  const [line, setLine] = useState<string | null>(null);
  const [manualDeveloperVolume, setManualDeveloperVolume] = useState<DeveloperVolume | undefined>(undefined);
  const [manualProcessingMinutes, setManualProcessingMinutes] = useState<number | undefined>(undefined);
  const [additionalShadeCode, setAdditionalShadeCode] = useState<string | null>(null);
  const [additionalShadeGrams, setAdditionalShadeGrams] = useState(0);
  const [additionalShade2Code, setAdditionalShade2Code] = useState<string | null>(null);
  const [additionalShade2Grams, setAdditionalShade2Grams] = useState(0);
  const [neutralizationApplied, setNeutralizationApplied] = useState(false);

  const availableLines = Array.from(new Set(brands[brandId].shades.map(s => s.line ?? null)));
  const lineShades = brands[brandId].shades.filter(s => (s.line ?? null) === line).sort(compareShadesForDisplay);

  // Shared by every handler that changes which target shade is in play (see
  // resetShadePoolOverrides for the additional resets when the whole shade POOL changes,
  // e.g. brand/line) -- per-shade manual overrides (developer volume, processing time)
  // don't necessarily carry over to a different shade.
  function resetShadeDependentOverrides() {
    setManualDeveloperVolume(undefined);
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
  const result = calculateFullFormula(
    startLevel, targetShade, grayPercent, totalGrams,
    brands[brandId].mixingRatio, effectiveManualDeveloperVolume
  );
  const additionalShade = additionalShadeCode !== null ? lineShades.find(s => s.code === additionalShadeCode) ?? null : null;
  const additionalShade2 = additionalShade2Code !== null ? lineShades.find(s => s.code === additionalShade2Code) ?? null : null;
  const hasShade1 = additionalShade !== null && additionalShadeGrams > 0;
  const hasShade2 = additionalShade2 !== null && additionalShade2Grams > 0;
  const totalExtra = (hasShade1 ? additionalShadeGrams : 0) + (hasShade2 ? additionalShade2Grams : 0);
  const grams = !suppressAdditionalShade && result.grams !== null && totalExtra > 0
    ? applyAdditionalShade(result.grams, result.mixingRatio, totalExtra)
    : result.grams;
  const effectiveResult = grams !== result.grams ? { ...result, grams } : result;
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
