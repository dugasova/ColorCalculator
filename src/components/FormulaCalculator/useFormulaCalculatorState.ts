import { useState } from "react";
import { getPrePigmentationNeed, calculatePrePigmentation } from "../../engine/prePigmentation";
import type { Brand, BrandId } from "../../engine/brands";
import type { RepeatFormulaRequest } from "../../history";
import type { FavoriteFormulaRecipe } from "../../favoriteFormulas";
import { useShadeFormulaState } from "./useShadeFormulaState";
import { useBlendMode } from "./useBlendMode";
import { usePricing } from "./usePricing";
import {
  applyFavoriteRecipe,
  applyFormValues,
  repeatRequestToFormValues,
  type FormulaFormSetters,
} from "./formulaRequests";

// Layers FormulaCalculator's own state -- repeat-request replay, substitute-blend mode
// (useBlendMode), cross-brand match, pricing (usePricing) -- on top of the brand/line/
// shade/formula state shared with ColorStepCard (see useShadeFormulaState). The component
// itself stays a thin render of already-computed values.
export function useFormulaCalculatorState(
  brands: Record<BrandId, Brand>,
  repeatRequest?: RepeatFormulaRequest | null,
  favoriteRequest?: FavoriteFormulaRecipe | null,
) {
  const [appliedRepeatRequest, setAppliedRepeatRequest] = useState<RepeatFormulaRequest | null>(null);
  const [appliedFavoriteRequest, setAppliedFavoriteRequest] = useState<FavoriteFormulaRecipe | null>(null);
  const [prePigmentationEnabled, setPrePigmentationEnabled] = useState(false);

  const base = useShadeFormulaState({ brands });
  const { brandId, startLevel, targetShade, lineShades, result, effectiveResult, naturalBase } = base;

  // The blend stands in for the missing fashion shade only, so it splits the base color
  // weight minus any gray-coverage natural base carved out of it (see naturalBase).
  const blendColorGrams = result.grams !== null ? result.grams.colorGrams - (naturalBase?.grams ?? 0) : null;
  const blendMode = useBlendMode(targetShade, lineShades, blendColorGrams);

  // Reevaluated from startLevel/targetShade on every render rather than stored -- purely
  // derived, and needs to stay in sync the instant either field changes so the
  // recommendation (and, once enabled, the filler step below) never lags behind a level
  // edit. Gated on prePigmentationEnabled so toggling the checkbox off fully removes the
  // filler step from both the results panel and the copyable formula text. Matched
  // against the currently selected brand+line (lineShades) so the worked-example filler
  // shade is a real product from that line, not the Generic-chart default -- no match at
  // that level/tone (e.g. an underrepresented line) resolves to null exactly like the
  // Generic case, and the UI already renders the "no dedicated shade" fallback text.
  const prePigmentationNeed = getPrePigmentationNeed(startLevel, targetShade.level);
  const prePigmentationResult =
    prePigmentationEnabled && prePigmentationNeed !== "none"
      ? calculatePrePigmentation(startLevel, targetShade.level, base.effectiveTotalGrams, lineShades)
      : null;

  // Priced product weight: the dye actually mixed (never its developer -- a salon buys
  // and prices developer completely separately, see sessionCost.ts's stepTotalGrams),
  // plus any pre-pigmentation filler mixed on top (also never its diluent).
  const totalProductGrams =
    effectiveResult.grams !== null
      ? effectiveResult.grams.colorGrams + (prePigmentationResult?.grams?.fillerGrams ?? 0)
      : null;
  const pricing = usePricing(brands[brandId].pricePerGram, totalProductGrams);

  // Which field each request restores lives in formulaRequests.ts; this only routes the
  // resulting values to their setters.
  const formSetters: FormulaFormSetters = {
    porosity: base.setPorosity,
    thickness: base.setThickness,
    chemicalHistory: base.setChemicalHistory,
    brandId: base.setBrandId,
    line: base.setLine,
    targetShadeCode: base.setTargetShadeCode,
    startLevel: base.setStartLevel,
    grayPercent: base.setGrayPercent,
    applicationZone: base.setApplicationZone,
    gramsInputMode: base.setGramsInputMode,
    totalGrams: base.setTotalGrams,
    colorGrams: base.setColorGrams,
    manualDeveloperVolume: base.setManualDeveloperVolume,
    manualMixingRatio: base.setManualMixingRatio,
    manualProcessingMinutes: base.setManualProcessingMinutes,
    manualPricePerGram: pricing.setManualPricePerGram,
    manualMarkupMultiplier: pricing.setManualMarkupMultiplier,
    manualServicePrice: pricing.setManualServicePrice,
    additionalShadeCode: base.setAdditionalShadeCode,
    additionalShadeGrams: base.setAdditionalShadeGrams,
    additionalShade2Code: base.setAdditionalShade2Code,
    additionalShade2Grams: base.setAdditionalShade2Grams,
    blendModeEnabled: blendMode.setBlendModeEnabled,
    blendShadeACode: blendMode.setBlendShadeACode,
    blendShadeBCode: blendMode.setBlendShadeBCode,
    blendPrimaryPercent: blendMode.setBlendPrimaryPercent,
    neutralizationApplied: base.setNeutralizationApplied,
    prePigmentationEnabled: setPrePigmentationEnabled,
    grayNaturalApplied: base.setGrayNaturalApplied,
    naturalBaseShadeCode: base.setNaturalBaseShadeCode,
  };

  // Replay a "Repeat formula" request from history right during render — this is React's
  // documented pattern for adjusting state when a prop changes (no effect/extra render
  // tick needed): https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  if (repeatRequest && repeatRequest !== appliedRepeatRequest) {
    // `repeatRequest` is a fresh object each time History's "Repeat" button is clicked, so
    // comparing by reference here is enough to apply each click exactly once.
    setAppliedRepeatRequest(repeatRequest);
    applyFormValues(repeatRequestToFormValues(repeatRequest), formSetters);
  }

  // Insert a saved favorite's recipe (src/favoriteFormulas.ts) into the calculator --
  // mirrors the repeatRequest replay above (same "adjust state when a prop changes"
  // pattern: https://react.dev/learn/you-might-not-need-an-effect), fired by navigating
  // here from the standalone Favorites page (see FavoritesPage + AuthenticatedApp's
  // handleApplyFavorite) rather than a same-page chip click. See applyFavoriteRecipe for
  // which fields a favorite deliberately leaves untouched.
  if (favoriteRequest && favoriteRequest !== appliedFavoriteRequest) {
    setAppliedFavoriteRequest(favoriteRequest);
    applyFormValues(applyFavoriteRecipe(favoriteRequest), formSetters);
  }

  // What this hook's own state resets alongside the shared hook's resets (see
  // useShadeFormulaState's resetShadePoolOverrides / resetShadeDependentOverrides):
  //  - a new brand has its own price per gram, so a hand-typed one is dropped;
  //  - a new shade pool (brand or line) leaves blend mode altogether;
  //  - a new target keeps blend mode but drops the hand-picked pair;
  //  - any of them invalidates a hand-typed service price.
  const handleBrandIdChange = (newBrandId: BrandId) => {
    base.handleBrandIdChange(newBrandId);
    pricing.setManualPricePerGram(undefined);
    pricing.setManualServicePrice(undefined);
    blendMode.disableBlendMode();
  };

  const handleLineChange = (newLine: string | null) => {
    base.handleLineChange(newLine);
    pricing.setManualServicePrice(undefined);
    blendMode.disableBlendMode();
  };

  const handleTargetShadeCodeChange = (code: string) => {
    base.handleTargetShadeCodeChange(code);
    pricing.setManualServicePrice(undefined);
    blendMode.resetBlendSelection();
  };

  const handleCrossBrandMatchSelect = (newBrandId: BrandId, newLine: string | null, newShadeCode: string) => {
    base.setBrandId(newBrandId);
    base.setLine(newLine);
    base.setTargetShadeCode(newShadeCode);
    base.resetShadePoolOverrides();
    pricing.setManualPricePerGram(undefined);
    pricing.setManualServicePrice(undefined);
    blendMode.disableBlendMode();
  };

  // The current recipe in "save as favorite" shape (src/favoriteFormulas.ts) --
  // deliberately excludes startLevel/grayPercent/canvas/pricing, the same fields
  // applyFavoriteRecipe (formulaRequests.ts) never touches, since a favorite is a shade/mix recipe to
  // reuse across clients, not a snapshot of this one visit.
  const favoriteRecipe: FavoriteFormulaRecipe = {
    brandId,
    line: targetShade.line ?? null,
    targetShadeCode: targetShade.code,
    additionalShadeCode: base.additionalShadeCode,
    additionalShadeGrams: base.additionalShadeGrams,
    additionalShade2Code: base.additionalShade2Code,
    additionalShade2Grams: base.additionalShade2Grams,
    blendShadeACode: blendMode.blendModeEnabled ? blendMode.blendShadeACodeEffective : null,
    blendShadeBCode: blendMode.blendModeEnabled ? blendMode.blendShadeBCodeEffective : null,
    blendPrimaryPercent: blendMode.blendPrimaryPercent,
    manualDeveloperVolume: base.manualDeveloperVolume ?? null,
    manualMixingRatio: base.manualMixingRatio ?? null,
    manualProcessingMinutes: base.manualProcessingMinutes ?? null,
    applicationZone: base.applicationZone,
    gramsInputMode: base.gramsInputMode,
    totalGrams: base.totalGrams,
    colorGrams: base.colorGrams,
  };

  return {
    // Everything the shared hook provides; the four selection handlers below replace its
    // own with versions that also reset this hook's state.
    ...base,

    // blend mode
    blendModeEnabled: blendMode.blendModeEnabled,
    setBlendShadeACode: blendMode.setBlendShadeACode,
    setBlendShadeBCode: blendMode.setBlendShadeBCode,
    blendPrimaryPercent: blendMode.blendPrimaryPercent,
    setBlendPrimaryPercent: blendMode.setBlendPrimaryPercent,
    blendCandidates: blendMode.blendCandidates,
    blendShadeACodeEffective: blendMode.blendShadeACodeEffective,
    blendShadeBCodeEffective: blendMode.blendShadeBCodeEffective,
    blendShadeA: blendMode.blendShadeA,
    blendShadeB: blendMode.blendShadeB,
    blend: blendMode.blend,
    blendColorGrams,

    // pricing
    manualPricePerGram: pricing.manualPricePerGram,
    setManualPricePerGram: pricing.setManualPricePerGram,
    markupMultiplier: pricing.markupMultiplier,
    setMarkupMultiplier: pricing.setManualMarkupMultiplier,
    manualServicePrice: pricing.manualServicePrice,
    setManualServicePrice: pricing.setManualServicePrice,
    pricePerGram: pricing.pricePerGram,
    productCost: pricing.productCost,
    recommendedServicePrice: pricing.recommendedServicePrice,
    servicePrice: pricing.servicePrice,

    // pre-pigmentation
    prePigmentationNeed,
    prePigmentationEnabled,
    setPrePigmentationEnabled,
    prePigmentationResult,

    favoriteRecipe,

    handleBrandIdChange,
    handleLineChange,
    handleTargetShadeCodeChange,
    handleCrossBrandMatchSelect,
    handleBlendModeChange: blendMode.handleBlendModeChange,
  };
}
