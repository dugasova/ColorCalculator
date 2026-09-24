import type { FullFormula } from "../../engine/formula";
import type { Shade } from "../../engine/shades";
import type { Level } from "../../engine/levels";
import type { BrandId } from "../../engine/brands";
import type { BlendSummary } from "../../engine/formatFormula";
import type { Porosity, HairThickness, ChemicalHistory } from "../../engine/canvas";
import type { ApplicationZone } from "../../engine/applicationZone";
import type { PrePigmentationResult } from "../../engine/prePigmentation";
import { saveFormulaToHistory, type ColorHistoryStep } from "../../history";
import { useStock } from "../../palette";
import { findStockShortages, type StockShortage } from "../../stock";
import type { SessionDetails } from "./SessionDetailsPanel";

export interface FormulaSaveParams {
  brandId: BrandId;
  brandName: string;
  line: string | null;
  targetShade: Shade;
  startLevel: Level;
  grayPercent: number;
  applicationZone: ApplicationZone;
  porosity: Porosity;
  thickness: HairThickness;
  chemicalHistory: ChemicalHistory[];
  result: FullFormula;
  additionalShade: Shade | null;
  additionalShadeGrams: number;
  additionalShade2?: Shade | null;
  additionalShade2Grams?: number;
  blend: BlendSummary | null;
  prePigmentationResult: PrePigmentationResult | null;
  neutralizationApplied: boolean;
  appliedBy: string;
  processingMinutes: number;
  pricePerGram: number;
  markupMultiplier: number;
  productCost: number | null;
  servicePrice: number | null;
}

export interface FormulaSave {
  // The persistable record for this mix -- also what `shortages` below is computed
  // against, so both read from the exact same object instead of a second literal that
  // could drift from what actually gets saved.
  step: ColorHistoryStep;
  shortages: StockShortage[];
  handleSave: (details: SessionDetails) => Promise<void>;
}

// Builds this formula's persistable ColorHistoryStep, checks it against live stock levels,
// and saves it to history -- the one piece of FormulaResults that isn't pure rendering,
// pulled out to match the rest of this directory's thin-component convention (see
// useClientLink, usePhotoUpload, useHistoryData).
export function useFormulaSave(params: FormulaSaveParams): FormulaSave {
  const {
    brandId, brandName, line, targetShade, startLevel, grayPercent, applicationZone,
    porosity, thickness, chemicalHistory, result, additionalShade, additionalShadeGrams,
    additionalShade2, additionalShade2Grams, blend, prePigmentationResult, neutralizationApplied,
    appliedBy, processingMinutes, pricePerGram, markupMultiplier, productCost, servicePrice,
  } = params;

  const step: ColorHistoryStep = {
    kind: "color",
    brandId,
    brandName,
    line,
    targetShade,
    startLevel,
    grayPercent,
    applicationZone,
    canvas: { porosity, thickness, chemicalHistory },
    result,
    additionalShade,
    additionalShadeGrams,
    additionalShade2: additionalShade2 ?? null,
    additionalShade2Grams: additionalShade2Grams ?? null,
    blend,
    prePigmentation: prePigmentationResult,
    neutralizationApplied,
    processingMinutes,
    pricePerGram,
  };

  const shortages: StockShortage[] = findStockShortages([step], useStock());

  const handleSave = async (details: SessionDetails) => {
    await saveFormulaToHistory({
      clientName: details.clientName,
      clientId: details.clientId,
      note: details.note,
      appliedBy,
      steps: [step],
      markupMultiplier,
      productCost,
      servicePrice,
      patchTestDate: details.patchTestDate,
      allergyNotes: details.allergyNotes,
      patchTestOverride: details.patchTestOverride,
      beforePhotoFile: details.beforePhotoFile,
      afterPhotoFile: details.afterPhotoFile,
    });
  };

  return { step, shortages, handleSave };
}
