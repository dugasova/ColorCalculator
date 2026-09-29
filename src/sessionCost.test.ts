import { describe, it, expect } from "vitest";
import { actualGramsScale, stepTotalGrams, calculateSessionProductCost } from "./sessionCost";
import type { ColorHistoryStep, BleachHistoryStep } from "./history";
import { COLOR_FULL_FORMULA, makeColorStep as makeSharedColorStep } from "./testFixtures";
import { calculatePrePigmentation } from "./engine/prePigmentation";

function makeColorStep(overrides: Partial<ColorHistoryStep> = {}): ColorHistoryStep {
  return makeSharedColorStep({
    brandId: "wella",
    brandName: "Wella",
    line: "Koleston Perfect",
    targetShade: { code: "7/1", level: 7, tone: "ash", line: "Koleston Perfect" },
    startLevel: 6,
    result: { ...COLOR_FULL_FORMULA, grams: { colorGrams: 30, developerGrams: 30 } },
    pricePerGram: 0.2,
    ...overrides,
  });
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
  it("scales the priced dye weight (never developer) by the actual/computed ratio", () => {
    const step = makeColorStep({ actualColorGrams: 45 });
    expect(stepTotalGrams(step)).toBe(45);
  });

  it("returns the unscaled dye weight (never developer) when no actual figure was recorded", () => {
    expect(stepTotalGrams(makeColorStep({ actualColorGrams: null }))).toBe(30);
    expect(stepTotalGrams(makeColorStep({ actualColorGrams: undefined }))).toBe(30);
  });

  it("adds the pre-pigmentation filler weight on top of the dye weight, ignoring its diluent", () => {
    const step = makeColorStep({
      prePigmentation: calculatePrePigmentation(9, 5, 40),
    });
    // 30g dye (developer excluded) + 20g filler (1:1 filler:diluent of 40g, diluent excluded) = 50g.
    expect(stepTotalGrams(step)).toBe(50);
  });

  it("uses only the powder grams for a bleach step -- never developer -- ignoring actual dye figures", () => {
    expect(stepTotalGrams(bleachStep)).toBe(20);
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

  it("sums each step's product cost using its own pricePerGram, dye only", () => {
    const steps = [makeColorStep({ pricePerGram: 0.2 }), makeColorStep({ pricePerGram: 0.1 })];
    // Each step: 30g dye (developer excluded) * pricePerGram
    expect(calculateSessionProductCost(steps)).toBeCloseTo(30 * 0.2 + 30 * 0.1, 5);
  });
});
