import { describe, it, expect } from "vitest";
import { getGrayCoverageStrategy, getMixingRatio, calculateFormulaGrams, calculateFormulaGramsFromColorGrams, applyAdditionalShade, splitShadeBlend, splitNaturalBase, findNaturalBaseCandidates, getRecommendedProcessingMinutes } from "./formula";
import type { Shade } from "./shades";
import { BRANDS } from "./brands";

describe("getGrayCoverageStrategy", () => {
  it("returns pure fashion tone below 30% gray", () => {
    expect(getGrayCoverageStrategy(0)).toEqual({ naturalRatio: 0, fashionRatio: 1, note: "apply the fashion tone as-is" });
    expect(getGrayCoverageStrategy(29)).toEqual({ naturalRatio: 0, fashionRatio: 1, note: "apply the fashion tone as-is" });
  });

  it("returns a one-third natural dose in the [30, 50) range -- Wella's Pure Naturals ratio for that gray tier", () => {
    expect(getGrayCoverageStrategy(30)).toEqual({ naturalRatio: 1 / 3, fashionRatio: 2 / 3, note: "one-third natural base blended in for extra gray coverage" });
    expect(getGrayCoverageStrategy(49)).toEqual({ naturalRatio: 1 / 3, fashionRatio: 2 / 3, note: "one-third natural base blended in for extra gray coverage" });
  });

  it("returns a 50/50 split at 50% gray and above, capped there even at 100% -- never past Wella's documented half-natural ratio", () => {
    expect(getGrayCoverageStrategy(50)).toEqual({ naturalRatio: 0.5, fashionRatio: 0.5, note: "equal parts natural base and fashion tone" });
    expect(getGrayCoverageStrategy(79)).toEqual({ naturalRatio: 0.5, fashionRatio: 0.5, note: "equal parts natural base and fashion tone" });
    expect(getGrayCoverageStrategy(100)).toEqual({ naturalRatio: 0.5, fashionRatio: 0.5, note: "equal parts natural base and fashion tone" });
  });

  it("always sums natural and fashion ratios to 1", () => {
    for (const gray of [0, 15, 30, 40, 50, 65, 80, 95, 100]) {
      const { naturalRatio, fashionRatio } = getGrayCoverageStrategy(gray);
      expect(naturalRatio + fashionRatio).toBeCloseTo(1);
    }
  });
});

describe("getMixingRatio", () => {
  it("uses 1:1 when no lift is needed (target <= start)", () => {
    expect(getMixingRatio(6, 6)).toEqual({ colorParts: 1, developerParts: 1 });
    expect(getMixingRatio(6, 4)).toEqual({ colorParts: 1, developerParts: 1 });
  });

  it("uses 1:1.5 for a moderate lift of 1-2 levels", () => {
    expect(getMixingRatio(6, 7)).toEqual({ colorParts: 1, developerParts: 1.5 });
    expect(getMixingRatio(6, 8)).toEqual({ colorParts: 1, developerParts: 1.5 });
  });

  it("uses 1:2 for a high lift of 3+ levels", () => {
    expect(getMixingRatio(4, 7)).toEqual({ colorParts: 1, developerParts: 2 });
    expect(getMixingRatio(1, 10)).toEqual({ colorParts: 1, developerParts: 2 });
  });
});

describe("calculateFormulaGrams", () => {
  it("splits total grams proportionally for a 1:1 ratio", () => {
    expect(calculateFormulaGrams(60, { colorParts: 1, developerParts: 1 })).toEqual({
      colorGrams: 30,
      developerGrams: 30,
    });
  });

  it("splits total grams proportionally for a 1:1.5 ratio", () => {
    expect(calculateFormulaGrams(60, { colorParts: 1, developerParts: 1.5 })).toEqual({
      colorGrams: 24,
      developerGrams: 36,
    });
  });

  it("splits total grams proportionally for a 1:2 ratio", () => {
    expect(calculateFormulaGrams(60, { colorParts: 1, developerParts: 2 })).toEqual({
      colorGrams: 20,
      developerGrams: 40,
    });
  });

  it("always accounts for the full total", () => {
    const { colorGrams, developerGrams } = calculateFormulaGrams(90, { colorParts: 1, developerParts: 1.5 });
    expect(colorGrams + developerGrams).toBeCloseTo(90);
  });
});

describe("calculateFormulaGramsFromColorGrams", () => {
  it("derives developer 1:1 from the dye weight alone", () => {
    expect(calculateFormulaGramsFromColorGrams(40, { colorParts: 1, developerParts: 1 })).toEqual({
      colorGrams: 40,
      developerGrams: 40,
    });
  });

  it("derives developer 1:1.5 from the dye weight alone", () => {
    expect(calculateFormulaGramsFromColorGrams(40, { colorParts: 1, developerParts: 1.5 })).toEqual({
      colorGrams: 40,
      developerGrams: 60,
    });
  });

  it("derives developer 1:2 from the dye weight alone", () => {
    expect(calculateFormulaGramsFromColorGrams(40, { colorParts: 1, developerParts: 2 })).toEqual({
      colorGrams: 40,
      developerGrams: 80,
    });
  });
});

describe("applyAdditionalShade", () => {
  it("adds the additional grams to the color total and recalculates developer for the same ratio", () => {
    // Primary mix was 30g color : 30g developer (1:1). Adding 10g of another shade should
    // grow color to 40g and developer to 40g, keeping the 1:1 ratio.
    expect(applyAdditionalShade({ colorGrams: 30, developerGrams: 30 }, { colorParts: 1, developerParts: 1 }, 10)).toEqual({
      colorGrams: 40,
      developerGrams: 40,
    });
  });

  it("scales developer by the mixing ratio, not 1:1, for a lifting ratio", () => {
    // 1:1.5 ratio: adding 10g color requires 15g more developer to stay proportional.
    expect(applyAdditionalShade({ colorGrams: 24, developerGrams: 36 }, { colorParts: 1, developerParts: 1.5 }, 10)).toEqual({
      colorGrams: 34,
      developerGrams: 51,
    });
  });

  it("is a no-op when no additional grams are added", () => {
    expect(applyAdditionalShade({ colorGrams: 30, developerGrams: 30 }, { colorParts: 1, developerParts: 1 }, 0)).toEqual({
      colorGrams: 30,
      developerGrams: 30,
    });
  });
});

describe("splitShadeBlend", () => {
  it("splits the color total evenly at 50%", () => {
    expect(splitShadeBlend(30, 50)).toEqual({ primaryGrams: 15, secondaryGrams: 15 });
  });

  it("splits the color total unevenly, e.g. 70/30", () => {
    const { primaryGrams, secondaryGrams } = splitShadeBlend(30, 70);
    expect(primaryGrams).toBeCloseTo(21);
    expect(secondaryGrams).toBeCloseTo(9);
  });

  it("leaves the total untouched -- unlike applyAdditionalShade it never grows it", () => {
    const { primaryGrams, secondaryGrams } = splitShadeBlend(30, 70);
    expect(primaryGrams + secondaryGrams).toBe(30);
  });

  it("clamps an out-of-range percent to [0, 100]", () => {
    expect(splitShadeBlend(30, 130)).toEqual({ primaryGrams: 30, secondaryGrams: 0 });
    expect(splitShadeBlend(30, -10)).toEqual({ primaryGrams: 0, secondaryGrams: 30 });
  });
});

describe("getRecommendedProcessingMinutes", () => {
  const permanentShade: Shade = { code: "7.1", level: 7, tone: "ash" };
  const colorTouchShade: Shade = { code: "8/73", level: 8, tone: "chocolate", developerVolumeChoices: [6, 13] };

  it("recommends 20 minutes for deposit-only lines with developerVolumeChoices, regardless of gray percent", () => {
    expect(getRecommendedProcessingMinutes(colorTouchShade, 0)).toBe(20);
    expect(getRecommendedProcessingMinutes(colorTouchShade, 90)).toBe(20);
  });

  it("recommends 30 minutes for permanent color below 50% gray", () => {
    expect(getRecommendedProcessingMinutes(permanentShade, 0)).toBe(30);
    expect(getRecommendedProcessingMinutes(permanentShade, 49)).toBe(30);
  });

  it("recommends 45 minutes for permanent color at 50% gray or above", () => {
    expect(getRecommendedProcessingMinutes(permanentShade, 50)).toBe(45);
    expect(getRecommendedProcessingMinutes(permanentShade, 100)).toBe(45);
  });
});

describe("splitNaturalBase", () => {
  it("carves the natural share out of the base weight without changing the total", () => {
    const third = splitNaturalBase(30, 1 / 3);
    expect(third.fashionGrams).toBeCloseTo(20);
    expect(third.naturalGrams).toBeCloseTo(10);
    expect(third.fashionGrams + third.naturalGrams).toBeCloseTo(30);
    expect(splitNaturalBase(30, 0.5)).toEqual({ fashionGrams: 15, naturalGrams: 15 });
  });

  it("leaves everything fashion when no natural dose is called for", () => {
    expect(splitNaturalBase(30, 0)).toEqual({ fashionGrams: 30, naturalGrams: 0 });
  });
});

describe("findNaturalBaseCandidates", () => {
  const koleston = BRANDS.wella.shades.filter(s => s.line === "koleston-perfect");
  const ash7 = koleston.find(s => s.code === "7/1")!;

  it("offers the target level's naturals from the same line, double-natural (Pure Naturals) first", () => {
    const codes = findNaturalBaseCandidates(ash7, koleston).map(s => s.code);
    expect(codes[0]).toBe("7/00");
    expect(codes).toEqual(expect.arrayContaining(["7/0", "77/0"]));
  });

  it("never offers a natural with a secondary fashion reflect (e.g. 7/01) as the base", () => {
    expect(findNaturalBaseCandidates(ash7, koleston).map(s => s.code)).not.toContain("7/01");
  });

  it("falls back to the plain natural when the line has no double natural", () => {
    const generic = BRANDS.generic.shades;
    const target: Shade = { code: "7.1", level: 7, tone: "ash" };
    expect(findNaturalBaseCandidates(target, generic).map(s => s.code)).toEqual(["7.0"]);
  });

  it("offers nothing when the target is itself natural, or the line has no natural at that level", () => {
    expect(findNaturalBaseCandidates(koleston.find(s => s.code === "7/0")!, koleston)).toEqual([]);
    expect(findNaturalBaseCandidates(ash7, [ash7])).toEqual([]);
  });
});
