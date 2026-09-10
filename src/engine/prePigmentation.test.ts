import { describe, it, expect } from "vitest";
import {
  getPrePigmentationNeed,
  getPrePigmentFillerTone,
  findExampleFillerShade,
  calculateFillerGrams,
  calculatePrePigmentation,
} from "./prePigmentation";
import type { Shade } from "./shades";

describe("getPrePigmentationNeed", () => {
  it("is not needed for same level or a 1-level drop", () => {
    expect(getPrePigmentationNeed(6, 6)).toBe("none");
    expect(getPrePigmentationNeed(7, 6)).toBe("none");
  });

  it("is recommended for a 2-3 level drop", () => {
    expect(getPrePigmentationNeed(9, 7)).toBe("recommended");
    expect(getPrePigmentationNeed(9, 6)).toBe("recommended");
  });

  it("is required in the same session for a 4-6 level drop", () => {
    expect(getPrePigmentationNeed(9, 5)).toBe("required-same-session");
    expect(getPrePigmentationNeed(9, 3)).toBe("required-same-session");
  });

  it("is required over two visits for a 7+ level drop", () => {
    expect(getPrePigmentationNeed(9, 2)).toBe("required-multi-visit");
    expect(getPrePigmentationNeed(10, 2)).toBe("required-multi-visit");
  });
});

describe("getPrePigmentFillerTone", () => {
  it("maps each underlying pigment to its matching filler tone family", () => {
    expect(getPrePigmentFillerTone("red")).toBe("red");
    expect(getPrePigmentFillerTone("red-orange")).toBe("red");
    expect(getPrePigmentFillerTone("orange")).toBe("copper");
    expect(getPrePigmentFillerTone("orange-yellow")).toBe("copper");
    expect(getPrePigmentFillerTone("yellow-orange")).toBe("gold");
    expect(getPrePigmentFillerTone("yellow")).toBe("gold");
    expect(getPrePigmentFillerTone("pale-yellow")).toBe("gold");
    expect(getPrePigmentFillerTone("very-light-yellow")).toBe("gold");
  });
});

describe("findExampleFillerShade", () => {
  it("finds a matching Generic-chart shade for the target level and filler tone", () => {
    expect(findExampleFillerShade(7, "gold")).toEqual({ code: "7.3", level: 7, tone: "gold" });
  });

  it("finds the level-6 copper/red shades -- level 6 previously had a data gap missing both tones present at every neighboring level (5, 7-10)", () => {
    expect(findExampleFillerShade(6, "copper")).toEqual({ code: "6.4", level: 6, tone: "copper" });
    expect(findExampleFillerShade(6, "red")).toEqual({ code: "6.5", level: 6, tone: "red" });
  });

  it("returns null when the Generic chart has no shade at that level/tone", () => {
    expect(findExampleFillerShade(4, "red")).toBeNull();
  });

  it("searches a passed brand/line chart instead of Generic when one is given", () => {
    const wellaFixture: Shade[] = [{ code: "5/4", level: 5, tone: "copper", line: "koleston-perfect" }];
    expect(findExampleFillerShade(5, "copper", wellaFixture)).toEqual(wellaFixture[0]);
  });

  it("returns null when the passed chart has no match, even where Generic would", () => {
    // Generic has a 7.3 gold shade (see the first test above); an empty chart has none.
    expect(findExampleFillerShade(7, "gold", [])).toBeNull();
  });
});

describe("calculateFillerGrams", () => {
  it("splits total grams evenly for the standard 1:1 filler:water ratio", () => {
    expect(calculateFillerGrams(30, { fillerParts: 1, diluentParts: 1 })).toEqual({ fillerGrams: 15, diluentGrams: 15 });
    expect(calculateFillerGrams(45, { fillerParts: 1, diluentParts: 1 })).toEqual({ fillerGrams: 22.5, diluentGrams: 22.5 });
  });
});

describe("calculatePrePigmentation", () => {
  it("is a no-op when no pre-pigmentation is needed", () => {
    expect(calculatePrePigmentation(6, 6, 30)).toEqual({
      need: "none",
      underlyingPigment: null,
      fillerTone: null,
      exampleFillerShade: null,
      mixingRatio: null,
      grams: null,
      fillerProcessingMinutes: null,
      multiVisitGapDays: null,
      finalStepMixingRatio: { colorParts: 1, developerParts: 1 },
      finalStepDeveloperVolume: 10,
    });
  });

  it("recommends a gold filler for a moderate 2-level drop", () => {
    expect(calculatePrePigmentation(9, 7, 45)).toEqual({
      need: "recommended",
      underlyingPigment: "yellow-orange",
      fillerTone: "gold",
      exampleFillerShade: { code: "7.3", level: 7, tone: "gold" },
      mixingRatio: { fillerParts: 1, diluentParts: 1 },
      grams: { fillerGrams: 22.5, diluentGrams: 22.5 },
      fillerProcessingMinutes: 10,
      multiVisitGapDays: null,
      finalStepMixingRatio: { colorParts: 1, developerParts: 1 },
      finalStepDeveloperVolume: 10,
    });
  });

  it("requires a same-session copper filler for a 4-level drop", () => {
    expect(calculatePrePigmentation(9, 5, 30)).toEqual({
      need: "required-same-session",
      underlyingPigment: "orange",
      fillerTone: "copper",
      exampleFillerShade: { code: "5.4", level: 5, tone: "copper" },
      mixingRatio: { fillerParts: 1, diluentParts: 1 },
      grams: { fillerGrams: 15, diluentGrams: 15 },
      fillerProcessingMinutes: 15,
      multiVisitGapDays: null,
      finalStepMixingRatio: { colorParts: 1, developerParts: 1 },
      finalStepDeveloperVolume: 10,
    });
  });

  it("recommends a filler shade from the passed brand/line chart instead of Generic when one is given", () => {
    const wellaFixture: Shade[] = [{ code: "5/4", level: 5, tone: "copper", line: "koleston-perfect" }];
    const result = calculatePrePigmentation(9, 5, 30, wellaFixture);
    expect(result.exampleFillerShade).toEqual(wellaFixture[0]);
  });

  it("requires a multi-visit red filler for a large 8-level drop, with no Generic example at level 2", () => {
    expect(calculatePrePigmentation(10, 2, 60)).toEqual({
      need: "required-multi-visit",
      underlyingPigment: "red",
      fillerTone: "red",
      exampleFillerShade: null,
      mixingRatio: { fillerParts: 1, diluentParts: 1 },
      grams: { fillerGrams: 30, diluentGrams: 30 },
      fillerProcessingMinutes: 15,
      multiVisitGapDays: { min: 7, max: 14 },
      finalStepMixingRatio: { colorParts: 1, developerParts: 1 },
      finalStepDeveloperVolume: 10,
    });
  });
});
