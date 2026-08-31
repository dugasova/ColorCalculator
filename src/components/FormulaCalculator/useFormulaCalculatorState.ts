import { useState } from "react";
import { GENERIC_SHADE_CHART, canBlendShades, suggestBlendComponents } from "../../engine/shades";
import { applyAdditionalShade, calculateFullFormula, splitShadeBlend } from "../../engine/formula";
import type { DeveloperVolume, Level } from "../../engine/levels";
import { APPLICATION_ZONE_DEFAULT_GRAMS, type ApplicationZone } from "../../engine/applicationZone";
import { calculateProductCost, calculateRecommendedServicePrice, DEFAULT_MARKUP_MULTIPLIER } from "../../engine/pricing";
import type { Brand, BrandId } from "../../engine/brands";
import type { RepeatFormulaRequest } from "../../history";

const DEFAULT_BLEND_PRIMARY_PERCENT = 70;

// Owns every piece of state, derived value, and change handler behind FormulaCalculator's
// form -- extracted so the component itself stays a thin render of already-computed values.
// Not (yet) shared with ColorStepCard, which duplicates a similar but smaller subset of this
// same state (no repeat-request replay, blend mode, cross-brand match, or markup/service
// price) -- unifying the two is a reasonable follow-up but a separate, larger change.
export function useFormulaCalculatorState(brands: Record<BrandId, Brand>, repeatRequest?: RepeatFormulaRequest | null) {
  const [startLevel, setStartLevel] = useState<Level>(10);
  const [grayPercent, setGrayPercent] = useState(0);
  const [targetShadeCode, setTargetShadeCode] = useState(GENERIC_SHADE_CHART[0].code);
  const [applicationZone, setApplicationZone] = useState<ApplicationZone>('full-head');
  const [totalGrams, setTotalGrams] = useState(APPLICATION_ZONE_DEFAULT_GRAMS['full-head']);
  const [brandId, setBrandId] = useState<BrandId>('generic');
  const [line, setLine] = useState<string | null>(null);
  const [manualDeveloperVolume, setManualDeveloperVolume] = useState<DeveloperVolume | undefined>(undefined);
  const [manualProcessingMinutes, setManualProcessingMinutes] = useState<number | undefined>(undefined);
  const [manualPricePerGram, setManualPricePerGram] = useState<number | undefined>(undefined);
  const [markupMultiplier, setMarkupMultiplier] = useState(DEFAULT_MARKUP_MULTIPLIER);
  const [manualServicePrice, setManualServicePrice] = useState<number | undefined>(undefined);
  const [additionalShadeCode, setAdditionalShadeCode] = useState<string | null>(null);
  const [additionalShadeGrams, setAdditionalShadeGrams] = useState(0);
  const [blendModeEnabled, setBlendModeEnabled] = useState(false);
  const [blendShadeACode, setBlendShadeACode] = useState<string | null>(null);
  const [blendShadeBCode, setBlendShadeBCode] = useState<string | null>(null);
  const [blendPrimaryPercent, setBlendPrimaryPercent] = useState(DEFAULT_BLEND_PRIMARY_PERCENT);
  const [neutralizationApplied, setNeutralizationApplied] = useState(false);
  const [appliedRepeatRequest, setAppliedRepeatRequest] = useState<RepeatFormulaRequest | null>(null);

  // Replay a "Repeat formula" request from history right during render — this is React's
  // documented pattern for adjusting state when a prop changes (no effect/extra render
  // tick needed): https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  // `repeatRequest` is a fresh object each time History's "Repeat" button is clicked, so
  // comparing by reference here is enough to apply each click exactly once.
  if (repeatRequest && repeatRequest !== appliedRepeatRequest) {
    setAppliedRepeatRequest(repeatRequest);
    setBrandId(repeatRequest.brandId);
    setLine(repeatRequest.line);
    setTargetShadeCode(repeatRequest.targetShadeCode);
    setStartLevel(repeatRequest.startLevel);
    setGrayPercent(repeatRequest.grayPercent);
    setApplicationZone(repeatRequest.applicationZone);
    setTotalGrams(repeatRequest.totalGrams);
    setManualDeveloperVolume(repeatRequest.manualDeveloperVolume);
    setManualProcessingMinutes(repeatRequest.processingMinutes);
    setManualPricePerGram(repeatRequest.pricePerGram);
    setMarkupMultiplier(repeatRequest.markupMultiplier);
    setManualServicePrice(repeatRequest.servicePrice);
    setAdditionalShadeCode(repeatRequest.additionalShadeCode);
    setAdditionalShadeGrams(repeatRequest.additionalShadeGrams);
    setBlendModeEnabled(repeatRequest.blendShadeACode !== null && repeatRequest.blendShadeBCode !== null);
    setBlendShadeACode(repeatRequest.blendShadeACode);
    setBlendShadeBCode(repeatRequest.blendShadeBCode);
    setBlendPrimaryPercent(repeatRequest.blendPrimaryPercent);
    setNeutralizationApplied(false);
  }

  const availableLines = Array.from(new Set(brands[brandId].shades.map(s => s.line ?? null)));
  const lineShades = brands[brandId].shades.filter(s => (s.line ?? null) === line);

  // Shared by every handler that changes which target shade is in play: a blend picked
  // for the previous target may no longer be a physically valid pairing for the new one
  // (different level/reflect), and per-shade manual overrides (developer volume,
  // processing time, price) don't necessarily carry over either.
  function resetShadeDependentOverrides() {
    setManualDeveloperVolume(undefined);
    setManualProcessingMinutes(undefined);
    setManualServicePrice(undefined);
    setBlendShadeACode(null);
    setBlendShadeBCode(null);
    setBlendPrimaryPercent(DEFAULT_BLEND_PRIMARY_PERCENT);
    setNeutralizationApplied(false);
  }

  // Additionally used whenever the whole available-shade pool changes (new brand, new
  // line, or a cross-brand substitute): an additional-shade or blend-mode selection may
  // no longer exist in the new pool at all, unlike a same-pool target change.
  function resetShadePoolOverrides() {
    resetShadeDependentOverrides();
    setAdditionalShadeCode(null);
    setAdditionalShadeGrams(0);
    setBlendModeEnabled(false);
  }

  const handleBrandIdChange = (newBrandId: BrandId) => {
    const firstShade = brands[newBrandId].shades[0];
    setBrandId(newBrandId);
    setLine(firstShade.line ?? null);
    setTargetShadeCode(firstShade.code);
    setManualPricePerGram(undefined);
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

  const handleCrossBrandMatchSelect = (newBrandId: BrandId, newLine: string | null, newShadeCode: string) => {
    setBrandId(newBrandId);
    setLine(newLine);
    setTargetShadeCode(newShadeCode);
    setManualPricePerGram(undefined);
    resetShadePoolOverrides();
  };

  const handleAdditionalShadeCodeChange = (code: string | null) => {
    setAdditionalShadeCode(code);
    setAdditionalShadeGrams(0);
  };

  const handleBlendModeChange = (enabled: boolean) => {
    setBlendModeEnabled(enabled);
    if (!enabled) {
      setBlendShadeACode(null);
      setBlendShadeBCode(null);
      setBlendPrimaryPercent(DEFAULT_BLEND_PRIMARY_PERCENT);
    }
  };

  const handleApplicationZoneChange = (zone: ApplicationZone) => {
    setApplicationZone(zone);
    setTotalGrams(APPLICATION_ZONE_DEFAULT_GRAMS[zone]);
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
  const grams = !blendModeEnabled && result.grams !== null && additionalShade !== null && additionalShadeGrams > 0
    ? applyAdditionalShade(result.grams, result.mixingRatio, additionalShadeGrams)
    : result.grams;
  const effectiveResult = grams !== result.grams ? { ...result, grams } : result;

  // Two dedicated fields for the substitute-blend components (see BlendComponentField),
  // fully independent of targetShade/additionalShade above -- targetShade stays the
  // visual goal (may not itself be a physical product to weigh), and each blend
  // component defaults to the closest real single-reflect shade the moment blend mode is
  // turned on (e.g. target 7/17 suggests 7/1 + 7/7), overridable via the two selects.
  const blendCandidates = lineShades.filter(s => s.code !== targetShade.code && canBlendShades(targetShade, s));
  const blendSuggestion = suggestBlendComponents(targetShade, lineShades);
  const blendShadeACodeEffective = blendShadeACode ?? blendSuggestion.primary?.code ?? null;
  const blendShadeBCodeEffective = blendShadeBCode ?? blendSuggestion.secondary?.code ?? null;
  const blendShadeA = blendShadeACodeEffective !== null ? blendCandidates.find(s => s.code === blendShadeACodeEffective) ?? null : null;
  const blendShadeB = blendShadeBCodeEffective !== null ? blendCandidates.find(s => s.code === blendShadeBCodeEffective) ?? null : null;
  const blend = blendModeEnabled && blendShadeA !== null && blendShadeB !== null && result.grams !== null
    ? {
        shadeA: blendShadeA,
        shadeAGrams: splitShadeBlend(result.grams.colorGrams, blendPrimaryPercent).primaryGrams,
        shadeB: blendShadeB,
        shadeBGrams: splitShadeBlend(result.grams.colorGrams, blendPrimaryPercent).secondaryGrams,
      }
    : null;

  const processingMinutes = manualProcessingMinutes ?? result.recommendedProcessingMinutes;
  const pricePerGram = manualPricePerGram ?? brands[brandId].pricePerGram;
  const totalProductGrams = grams !== null ? grams.colorGrams + grams.developerGrams : null;
  const productCost = totalProductGrams !== null ? calculateProductCost(totalProductGrams, pricePerGram) : null;
  const recommendedServicePrice = productCost !== null ? calculateRecommendedServicePrice(productCost, markupMultiplier) : null;
  const servicePrice = manualServicePrice ?? recommendedServicePrice;

  return {
    startLevel, setStartLevel,
    grayPercent, setGrayPercent,
    targetShadeCode,
    applicationZone,
    totalGrams, setTotalGrams,
    brandId,
    line,
    manualDeveloperVolume, setManualDeveloperVolume,
    setManualPricePerGram,
    markupMultiplier, setMarkupMultiplier,
    setManualServicePrice,
    additionalShadeCode,
    additionalShadeGrams, setAdditionalShadeGrams,
    blendModeEnabled,
    setBlendShadeACode, setBlendShadeBCode,
    blendPrimaryPercent, setBlendPrimaryPercent,
    neutralizationApplied, setNeutralizationApplied,
    setManualProcessingMinutes,

    availableLines,
    lineShades,
    targetShade,
    result,
    additionalShade,
    effectiveResult,
    blendCandidates,
    blendShadeACodeEffective,
    blendShadeBCodeEffective,
    blendShadeA,
    blendShadeB,
    blend,
    processingMinutes,
    pricePerGram,
    productCost,
    recommendedServicePrice,
    servicePrice,

    handleBrandIdChange,
    handleLineChange,
    handleTargetShadeCodeChange,
    handleCrossBrandMatchSelect,
    handleAdditionalShadeCodeChange,
    handleBlendModeChange,
    handleApplicationZoneChange,
  };
}
