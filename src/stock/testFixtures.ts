import type { ColorHistoryStep } from "../history";
import { COLOR_FULL_FORMULA, makeColorStep as makeSharedColorStep } from "../testFixtures";

// A Wella Koleston Perfect 7/1 color step mixed 1:2 (30 g color + 60 g 20 vol developer)
// -- the baseline every stock consumption/reconcile test charges against.
export function makeColorStep(overrides: Partial<ColorHistoryStep> = {}): ColorHistoryStep {
  return makeSharedColorStep({
    brandId: "wella",
    brandName: "Wella",
    line: "Koleston Perfect",
    targetShade: { code: "7/1", level: 7, tone: "ash", line: "Koleston Perfect" },
    startLevel: 6,
    result: { ...COLOR_FULL_FORMULA, mixingRatio: { colorParts: 1, developerParts: 2 }, grams: { colorGrams: 30, developerGrams: 60 } },
    pricePerGram: 0.2,
    ...overrides,
  });
}
