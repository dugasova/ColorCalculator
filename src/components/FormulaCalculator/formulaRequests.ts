import type { Porosity, HairThickness, ChemicalHistory } from "../../engine/canvas";
import type { DeveloperVolume, Level } from "../../engine/levels";
import { APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE, type ApplicationZone, type GramsInputMode } from "../../engine/applicationZone";
import type { BrandId } from "../../engine/brands";
import type { MixingRatio } from "../../engine/shades";
import type { RepeatFormulaRequest } from "../../history";
import type { FavoriteFormulaRecipe } from "../../favoriteFormulas";

// Every FormulaCalculator input a repeat/favorite request can restore -- the state owned
// by useShadeFormulaState/useHairCanvasState plus useFormulaCalculatorState's own
// pricing/blend/pre-pigmentation fields, keyed by the state's own name.
export interface FormulaFormValues {
  porosity: Porosity;
  thickness: HairThickness;
  chemicalHistory: ChemicalHistory[];
  brandId: BrandId;
  line: string | null;
  targetShadeCode: string;
  startLevel: Level;
  grayPercent: number;
  applicationZone: ApplicationZone;
  gramsInputMode: GramsInputMode;
  totalGrams: number;
  colorGrams: number;
  manualDeveloperVolume: DeveloperVolume | undefined;
  manualMixingRatio: MixingRatio | undefined;
  manualProcessingMinutes: number | undefined;
  manualPricePerGram: number | undefined;
  manualMarkupMultiplier: number | undefined;
  manualServicePrice: number | undefined;
  additionalShadeCode: string | null;
  additionalShadeGrams: number;
  additionalShade2Code: string | null;
  additionalShade2Grams: number;
  blendModeEnabled: boolean;
  blendShadeACode: string | null;
  blendShadeBCode: string | null;
  blendPrimaryPercent: number;
  neutralizationApplied: boolean;
  prePigmentationEnabled: boolean;
}

export type FormulaFormSetters = { [K in keyof FormulaFormValues]: (value: FormulaFormValues[K]) => void };

// History's "Repeat formula": restores the whole past session, client diagnostics and
// pricing included. A legacy entry saved before the hair canvas / second additional shade
// existed falls back to the same defaults a fresh calculator starts with. The grams input
// mode isn't saved on the entry, so it's re-derived from the restored zone.
export function repeatRequestToFormValues(request: RepeatFormulaRequest): FormulaFormValues {
  return {
    porosity: request.canvas?.porosity ?? "normal",
    thickness: request.canvas?.thickness ?? "medium",
    chemicalHistory: request.canvas?.chemicalHistory ?? [],
    brandId: request.brandId,
    line: request.line,
    targetShadeCode: request.targetShadeCode,
    startLevel: request.startLevel,
    grayPercent: request.grayPercent,
    applicationZone: request.applicationZone,
    gramsInputMode: APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE[request.applicationZone],
    totalGrams: request.totalGrams,
    colorGrams: request.colorGrams,
    manualDeveloperVolume: request.manualDeveloperVolume,
    manualMixingRatio: request.manualMixingRatio,
    manualProcessingMinutes: request.processingMinutes,
    manualPricePerGram: request.pricePerGram,
    manualMarkupMultiplier: request.markupMultiplier,
    manualServicePrice: request.servicePrice,
    additionalShadeCode: request.additionalShadeCode,
    additionalShadeGrams: request.additionalShadeGrams,
    additionalShade2Code: request.additionalShade2Code ?? null,
    additionalShade2Grams: request.additionalShade2Grams ?? 0,
    blendModeEnabled: request.blendShadeACode !== null && request.blendShadeBCode !== null,
    blendShadeACode: request.blendShadeACode,
    blendShadeBCode: request.blendShadeBCode,
    blendPrimaryPercent: request.blendPrimaryPercent,
    neutralizationApplied: false,
    prePigmentationEnabled: request.prePigmentationEnabled,
  };
}

// A saved favorite's recipe (src/favoriteFormulas.ts). Deliberately never touches
// startLevel/grayPercent/canvas/markup/pre-pigmentation: a favorite is a shade+mix recipe
// to reuse for the client *already* on screen, not a whole past session to restore. Resets
// the manual price/service-price overrides exactly like handleBrandIdChange does, so price
// re-derives from the (possibly new) brand -- those two keys are present with `undefined`
// on purpose, see applyFormValues.
export function applyFavoriteRecipe(recipe: FavoriteFormulaRecipe): Partial<FormulaFormValues> {
  return {
    brandId: recipe.brandId,
    line: recipe.line,
    targetShadeCode: recipe.targetShadeCode,
    applicationZone: recipe.applicationZone,
    gramsInputMode: recipe.gramsInputMode,
    totalGrams: recipe.totalGrams,
    colorGrams: recipe.colorGrams,
    manualDeveloperVolume: recipe.manualDeveloperVolume ?? undefined,
    manualMixingRatio: recipe.manualMixingRatio ?? undefined,
    manualProcessingMinutes: recipe.manualProcessingMinutes ?? undefined,
    additionalShadeCode: recipe.additionalShadeCode,
    additionalShadeGrams: recipe.additionalShadeGrams,
    additionalShade2Code: recipe.additionalShade2Code,
    additionalShade2Grams: recipe.additionalShade2Grams,
    blendModeEnabled: recipe.blendShadeACode !== null && recipe.blendShadeBCode !== null,
    blendShadeACode: recipe.blendShadeACode,
    blendShadeBCode: recipe.blendShadeBCode,
    blendPrimaryPercent: recipe.blendPrimaryPercent,
    neutralizationApplied: false,
    manualPricePerGram: undefined,
    manualServicePrice: undefined,
  };
}

// Calls the setter for every key present in `values`. Presence is checked by key, not by
// value: an explicit `undefined` (e.g. a favorite resetting manualPricePerGram) is a real
// assignment, while a missing key means "leave this field alone".
export function applyFormValues(values: Partial<FormulaFormValues>, setters: FormulaFormSetters): void {
  const applyField = <K extends keyof FormulaFormValues>(key: K) => {
    setters[key](values[key] as FormulaFormValues[K]);
  };
  for (const key of Object.keys(values) as (keyof FormulaFormValues)[]) {
    applyField(key);
  }
}
