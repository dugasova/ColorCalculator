import type { ApplicationZone } from "../../engine/applicationZone";
import type { PrePigmentationResult } from "../../engine/prePigmentation";
import { saveFormulaToHistory, type ColorHistoryStep } from "../../history";
import { trackEvent } from "../../productAnalytics";
import type { WriteOutcome } from "../../firestoreWrite";
import { useStock } from "../../palette";
import { findStockShortages, type StockShortage } from "../../stock";
import type { SessionDetails } from "./SessionDetailsPanel";
import type { FormulaHair, FormulaMix, FormulaPricing, FormulaProduct } from "./formulaResultsModel";

export interface FormulaSaveParams {
  product: FormulaProduct;
  hair: FormulaHair;
  mix: FormulaMix;
  applicationZone: ApplicationZone;
  prePigmentationResult: PrePigmentationResult | null;
  neutralizationApplied: boolean;
  appliedBy: string;
  processingMinutes: number;
  pricing: FormulaPricing;
}

export interface FormulaSave {
  // The persistable record for this mix -- also what `shortages` below is computed
  // against, so both read from the exact same object instead of a second literal that
  // could drift from what actually gets saved.
  step: ColorHistoryStep;
  shortages: StockShortage[];
  handleSave: (details: SessionDetails) => Promise<WriteOutcome>;
}

// Builds this formula's persistable ColorHistoryStep, checks it against live stock levels,
// and saves it to history -- the one piece of FormulaResults that isn't pure rendering,
// pulled out to match the rest of this directory's thin-component convention (see
// useClientLink, usePhotoUpload, useHistoryData).
export function useFormulaSave(params: FormulaSaveParams): FormulaSave {
  const {
    product,
    hair,
    mix,
    applicationZone,
    prePigmentationResult,
    neutralizationApplied,
    appliedBy,
    processingMinutes,
    pricing,
  } = params;

  const step: ColorHistoryStep = {
    kind: "color",
    brandId: product.brandId,
    brandName: product.brandName,
    line: product.line,
    targetShade: mix.targetShade,
    startLevel: hair.startLevel,
    grayPercent: hair.grayPercent,
    applicationZone,
    canvas: hair.canvas,
    result: mix.result,
    additionalShade: mix.additionalShade,
    additionalShadeGrams: mix.additionalShadeGrams,
    additionalShade2: mix.additionalShade2 ?? null,
    additionalShade2Grams: mix.additionalShade2Grams ?? null,
    blend: mix.blend,
    prePigmentation: prePigmentationResult,
    neutralizationApplied,
    naturalBase: mix.naturalBase,
    processingMinutes,
    pricePerGram: pricing.pricePerGram,
  };

  const shortages: StockShortage[] = findStockShortages([step], useStock());

  const handleSave = (details: SessionDetails) => {
    return saveFormulaToHistory({
      clientName: details.clientName,
      clientId: details.clientId,
      note: details.note,
      appliedBy,
      steps: [step],
      markupMultiplier: pricing.markupMultiplier,
      productCost: pricing.productCost,
      servicePrice: pricing.servicePrice,
      patchTestDate: details.patchTestDate,
      allergyNotes: details.allergyNotes,
      patchTestOverride: details.patchTestOverride,
      beforePhotoFile: details.beforePhotoFile,
      afterPhotoFile: details.afterPhotoFile,
    }).then(outcome => {
      trackEvent("formula_saved", { kind: "single", step_count: 1, offline: outcome === "queued" ? 1 : 0 });
      return outcome;
    });
  };

  return { step, shortages, handleSave };
}
