import { useState } from "react";
import { GENERIC_SHADE_CHART, compareShadesForDisplay } from "../../engine/shades";
import { applyAdditionalShade, calculateFullFormula } from "../../engine/formula";
import type { DeveloperVolume, Level } from "../../engine/levels";
import { APPLICATION_ZONE_DEFAULT_GRAMS, type ApplicationZone } from "../../engine/applicationZone";
import type { Brand, BrandId } from "../../engine/brands";

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
// field) -- see resetShadeDependentOverrides/resetShadePoolOverrides for how a caller with
// its own overrides plugs into the same shade-changed/pool-changed reset points.
export function useShadeFormulaState({ brands, suppressAdditionalShade = false }: UseShadeFormulaStateOptions) {
  const [startLevel, setStartLevel] = useState<Level>(10);
  const [grayPercent, setGrayPercent] = useState(0);
  const [targetShadeCode, setTargetShadeCode] = useState(GENERIC_SHADE_CHART[0].code);
  const [applicationZone, setApplicationZone] = useState<ApplicationZone>('full-head');
  const [totalGrams, setTotalGrams] = useState(APPLICATION_ZONE_DEFAULT_GRAMS['full-head']);
  const [brandId, setBrandId] = useState<BrandId>('generic');
  const [line, setLine] = useState<string | null>(null);
  const [manualDeveloperVolume, setManualDeveloperVolume] = useState<DeveloperVolume | undefined>(undefined);
  const [manualProcessingMinutes, setManualProcessingMinutes] = useState<number | undefined>(undefined);
  const [additionalShadeCode, setAdditionalShadeCode] = useState<string | null>(null);
  const [additionalShadeGrams, setAdditionalShadeGrams] = useState(0);
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

  const targetShade = lineShades.find(s => s.code === targetShadeCode) ?? lineShades[0];
  const effectiveManualDeveloperVolume = targetShade.developerVolumeChoices
    ? (manualDeveloperVolume ?? targetShade.developerVolumeChoices[0])
    : undefined;
  const result = calculateFullFormula(
    startLevel, targetShade, grayPercent, totalGrams,
    brands[brandId].mixingRatio, effectiveManualDeveloperVolume
  );
  const additionalShade = additionalShadeCode !== null ? lineShades.find(s => s.code === additionalShadeCode) ?? null : null;
  const grams = !suppressAdditionalShade && result.grams !== null && additionalShade !== null && additionalShadeGrams > 0
    ? applyAdditionalShade(result.grams, result.mixingRatio, additionalShadeGrams)
    : result.grams;
  const effectiveResult = grams !== result.grams ? { ...result, grams } : result;
  const processingMinutes = manualProcessingMinutes ?? result.recommendedProcessingMinutes;

  return {
    startLevel, setStartLevel,
    grayPercent, setGrayPercent,
    targetShadeCode, setTargetShadeCode,
    applicationZone, setApplicationZone,
    totalGrams, setTotalGrams,
    brandId, setBrandId,
    line, setLine,
    manualDeveloperVolume, setManualDeveloperVolume,
    setManualProcessingMinutes,
    additionalShadeCode, setAdditionalShadeCode,
    additionalShadeGrams, setAdditionalShadeGrams,
    neutralizationApplied, setNeutralizationApplied,

    availableLines,
    lineShades,
    targetShade,
    result,
    additionalShade,
    grams,
    effectiveResult,
    processingMinutes,

    resetShadeDependentOverrides,
    resetShadePoolOverrides,
    handleBrandIdChange,
    handleLineChange,
    handleTargetShadeCodeChange,
    handleApplicationZoneChange,
    handleAdditionalShadeCodeChange,
  };
}
