import { useState } from "react";
import { canBlendShades, suggestBlendComponents } from "../../engine/shades";
import { splitShadeBlend } from "../../engine/formula";
import { calculateProductCost, calculateRecommendedServicePrice, DEFAULT_MARKUP_MULTIPLIER } from "../../engine/pricing";
import type { Brand, BrandId } from "../../engine/brands";
import type { RepeatFormulaRequest } from "../../history";
import { useShadeFormulaState } from "./useShadeFormulaState";

const DEFAULT_BLEND_PRIMARY_PERCENT = 70;

// Layers FormulaCalculator's own state -- repeat-request replay, substitute-blend mode,
// cross-brand match, markup/service price -- on top of the brand/line/shade/formula state
// shared with ColorStepCard (see useShadeFormulaState). The component itself stays a thin
// render of already-computed values.
export function useFormulaCalculatorState(brands: Record<BrandId, Brand>, repeatRequest?: RepeatFormulaRequest | null) {
  const [manualPricePerGram, setManualPricePerGram] = useState<number | undefined>(undefined);
  const [markupMultiplier, setMarkupMultiplier] = useState(DEFAULT_MARKUP_MULTIPLIER);
  const [manualServicePrice, setManualServicePrice] = useState<number | undefined>(undefined);
  const [blendModeEnabled, setBlendModeEnabled] = useState(false);
  const [blendShadeACode, setBlendShadeACode] = useState<string | null>(null);
  const [blendShadeBCode, setBlendShadeBCode] = useState<string | null>(null);
  const [blendPrimaryPercent, setBlendPrimaryPercent] = useState(DEFAULT_BLEND_PRIMARY_PERCENT);
  const [appliedRepeatRequest, setAppliedRepeatRequest] = useState<RepeatFormulaRequest | null>(null);

  const base = useShadeFormulaState({ brands, suppressAdditionalShade: blendModeEnabled });
  const {
    startLevel, setStartLevel, grayPercent, setGrayPercent, targetShadeCode, setTargetShadeCode,
    applicationZone, setApplicationZone, totalGrams, setTotalGrams, brandId, setBrandId, line, setLine,
    manualDeveloperVolume, setManualDeveloperVolume, setManualProcessingMinutes,
    additionalShadeCode, setAdditionalShadeCode, additionalShadeGrams, setAdditionalShadeGrams,
    neutralizationApplied, setNeutralizationApplied,
    availableLines, lineShades, targetShade, result, additionalShade, effectiveResult, processingMinutes,
    resetShadePoolOverrides,
  } = base;

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

  const handleBrandIdChange = (newBrandId: BrandId) => {
    base.handleBrandIdChange(newBrandId);
    setManualPricePerGram(undefined);
    setManualServicePrice(undefined);
    setBlendModeEnabled(false);
    setBlendShadeACode(null);
    setBlendShadeBCode(null);
    setBlendPrimaryPercent(DEFAULT_BLEND_PRIMARY_PERCENT);
  };

  const handleLineChange = (newLine: string | null) => {
    base.handleLineChange(newLine);
    setManualServicePrice(undefined);
    setBlendModeEnabled(false);
    setBlendShadeACode(null);
    setBlendShadeBCode(null);
    setBlendPrimaryPercent(DEFAULT_BLEND_PRIMARY_PERCENT);
  };

  const handleTargetShadeCodeChange = (code: string) => {
    base.handleTargetShadeCodeChange(code);
    setManualServicePrice(undefined);
    // A blend picked for the previous target may no longer be a physically valid pairing
    // for the new one (different level/reflect); drop it so suggestBlendComponents below
    // proposes a fresh default for the new target instead of silently keeping a stale one.
    setBlendShadeACode(null);
    setBlendShadeBCode(null);
    setBlendPrimaryPercent(DEFAULT_BLEND_PRIMARY_PERCENT);
  };

  const handleCrossBrandMatchSelect = (newBrandId: BrandId, newLine: string | null, newShadeCode: string) => {
    setBrandId(newBrandId);
    setLine(newLine);
    setTargetShadeCode(newShadeCode);
    resetShadePoolOverrides();
    setManualPricePerGram(undefined);
    setManualServicePrice(undefined);
    setBlendModeEnabled(false);
    setBlendShadeACode(null);
    setBlendShadeBCode(null);
    setBlendPrimaryPercent(DEFAULT_BLEND_PRIMARY_PERCENT);
  };

  const handleBlendModeChange = (enabled: boolean) => {
    setBlendModeEnabled(enabled);
    if (!enabled) {
      setBlendShadeACode(null);
      setBlendShadeBCode(null);
      setBlendPrimaryPercent(DEFAULT_BLEND_PRIMARY_PERCENT);
    }
  };

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

  const pricePerGram = manualPricePerGram ?? brands[brandId].pricePerGram;
  const totalProductGrams = effectiveResult.grams !== null ? effectiveResult.grams.colorGrams + effectiveResult.grams.developerGrams : null;
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
    handleAdditionalShadeCodeChange: base.handleAdditionalShadeCodeChange,
    handleBlendModeChange,
    handleApplicationZoneChange: base.handleApplicationZoneChange,
  };
}
