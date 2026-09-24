import type { BleachHistoryStep, ColorHistoryStep, FormulaHistoryEntry } from "./history";

export const COLOR_FULL_FORMULA: ColorHistoryStep["result"] = {
  developerVolume: 20,
  mixingRatio: { colorParts: 1, developerParts: 1 },
  grayCoverage: { naturalRatio: 0, fashionRatio: 1, note: "" },
  achievedLevel: 7,
  underlyingPigment: null,
  recommendedCorrectiveTone: null,
  correctorGrams: null,
  recommendedProcessingMinutes: 30,
  toneWarning: null,
  eligibilityWarning: null,
  liftUnsupportedWarning: null,
  grams: { colorGrams: 30, developerGrams: 30 },
};

export function makeColorStep(overrides: Partial<ColorHistoryStep> = {}): ColorHistoryStep {
  return {
    kind: "color",
    brandName: "Generic",
    line: null,
    targetShade: { code: "7.1", level: 7, tone: "ash" },
    startLevel: 7,
    grayPercent: 0,
    canvas: { porosity: "normal", thickness: "medium", chemicalHistory: [] },
    applicationZone: "full-head",
    result: COLOR_FULL_FORMULA,
    additionalShade: null,
    additionalShadeGrams: null,
    additionalShade2: null,
    additionalShade2Grams: null,
    blend: null,
    prePigmentation: null,
    neutralizationApplied: false,
    processingMinutes: 30,
    pricePerGram: 0.18,
    ...overrides,
  };
}

export function makeBleachStep(overrides: Partial<BleachHistoryStep> = {}): BleachHistoryStep {
  return {
    kind: "bleach",
    startLevel: 6,
    canvas: { porosity: "normal", thickness: "medium", chemicalHistory: [] },
    targetLevel: 9,
    result: {
      startLevel: 6, targetLevel: 9, liftNeeded: 3, developerVolume: 30, multiStepRequired: false,
      mixingRatio: { powderParts: 1, developerParts: 2 }, grams: { powderGrams: 20, developerGrams: 40 },
      recommendedProcessingMinutes: 35, maxScalpProcessingMinutes: 50, checkIntervalMinMinutes: 5, checkIntervalMaxMinutes: 10,
    },
    processingMinutes: 35,
    pricePerGram: 0.1,
    ...overrides,
  };
}

export function makeEntry(overrides: Partial<FormulaHistoryEntry> & { clientName: string }): FormulaHistoryEntry {
  return {
    id: "id",
    clientId: null,
    note: "",
    appliedBy: "stylist",
    appliedAt: null,
    steps: [makeColorStep()],
    markupMultiplier: 4,
    productCost: null,
    servicePrice: null,
    patchTestDate: "",
    allergyNotes: "",
    patchTestOverride: true,
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    ...overrides,
  };
}
