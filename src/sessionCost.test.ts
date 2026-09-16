import { describe, it, expect } from "vitest";
import { actualGramsScale, stepTotalGrams, calculateSessionProductCost } from "./sessionCost";
import type { ColorHistoryStep, BleachHistoryStep } from "./history";

function makeColorStep(overrides: Partial<ColorHistoryStep> = {}): ColorHistoryStep {
  return {
    kind: "color",
    brandId: "wella",
    brandName: "Wella",
    line: "Koleston Perfect",
    targetShade: { code: "7/1", level: 7, tone: "ash", line: "Koleston Perfect" },
    startLevel: 6,
    grayPercent: 0,
    applicationZone: "full-head",
    result: {
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
    },
    additionalShade: null,
    additionalShadeGrams: null,
    blend: null,
    prePigmentation: null,
    neutralizationApplied: false,
    processingMinutes: 30,
    pricePerGram: 0.2,
    ...overrides,
  };
}

const bleachStep: BleachHistoryStep = {
  kind: "bleach",
  startLevel: 6,
  targetLevel: 9,
  result: {
    startLevel: 6,
    targetLevel: 9,
    liftNeeded: 3,
    developerVolume: 30,
    multiStepRequired: false,
    mixingRatio: { powderParts: 1, developerParts: 2 },
    recommendedProcessingMinutes: 35,
    maxScalpProcessingMinutes: 50,
    checkIntervalMinMinutes: 5,
    checkIntervalMaxMinutes: 10,
    grams: { powderGrams: 20, developerGrams: 40 },
  },
  processingMinutes: 35,
  pricePerGram: 0.1,
};

describe("actualGramsScale", () => {
  it("is 1 when no actual figure was recorded", () => {
    expect(actualGramsScale(makeColorStep({ actualColorGrams: undefined }))).toBe(1);
    expect(actualGramsScale(makeColorStep({ actualColorGrams: null }))).toBe(1);
  });

  it("scales by actual/computed when an actual figure is recorded", () => {
    expect(actualGramsScale(makeColorStep({ actualColorGrams: 45 }))).toBe(1.5);
  });

  it("is 1 when there are no computed grams to scale against", () => {
    const step = makeColorStep({ actualColorGrams: 45, result: { ...makeColorStep().result, grams: null } });
    expect(actualGramsScale(step)).toBe(1);
  });
});

describe("stepTotalGrams", () => {
  it("scales the whole mix (dye + developer) by the actual/computed ratio", () => {
    const step = makeColorStep({ actualColorGrams: 45 });
    expect(stepTotalGrams(step)).toBe(90);
  });

  it("returns the unscaled total when no actual figure was recorded", () => {
    expect(stepTotalGrams(makeColorStep({ actualColorGrams: null }))).toBe(60);
    expect(stepTotalGrams(makeColorStep({ actualColorGrams: undefined }))).toBe(60);
  });

  it("sums powder and developer for a bleach step, ignoring actual dye figures", () => {
    expect(stepTotalGrams(bleachStep)).toBe(60);
  });

  it("returns 0 for a step with no computed grams", () => {
    const step = makeColorStep({ result: { ...makeColorStep().result, grams: null } });
    expect(stepTotalGrams(step)).toBe(0);
  });
});

describe("calculateSessionProductCost", () => {
  it("returns null for an empty session", () => {
    expect(calculateSessionProductCost([])).toBeNull();
  });

  it("sums each step's product cost using its own pricePerGram", () => {
    const steps = [makeColorStep({ pricePerGram: 0.2 }), makeColorStep({ pricePerGram: 0.1 })];
    // Each step: 60g * pricePerGram
    expect(calculateSessionProductCost(steps)).toBeCloseTo(60 * 0.2 + 60 * 0.1, 5);
  });
});
