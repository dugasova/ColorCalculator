import { describe, it, expect } from "vitest";
import { buildZonePreview } from "./zonePreview";
import { shadeToHexColor } from "./engine/color";
import type { ColorHistoryStep, BleachHistoryStep } from "./history";
import type { Shade } from "./engine/shades";

const baseColorResult: ColorHistoryStep["result"] = {
  developerVolume: 30,
  mixingRatio: { colorParts: 1, developerParts: 2 },
  grayCoverage: { naturalRatio: 0, fashionRatio: 1, note: "apply the fashion tone as-is" },
  achievedLevel: null,
  underlyingPigment: null,
  recommendedCorrectiveTone: null,
  correctorGrams: null,
  recommendedProcessingMinutes: 30,
  toneWarning: null,
  eligibilityWarning: null,
  liftUnsupportedWarning: null,
  grams: { colorGrams: 20, developerGrams: 40 },
};

const baseBleachResult: BleachHistoryStep["result"] = {
  startLevel: 6,
  targetLevel: 9,
  liftNeeded: 3,
  developerVolume: 30,
  multiStepRequired: false,
  mixingRatio: { powderParts: 1, developerParts: 2 },
  grams: { powderGrams: 20, developerGrams: 40 },
  recommendedProcessingMinutes: 35,
  maxScalpProcessingMinutes: 50,
  checkIntervalMinMinutes: 5,
  checkIntervalMaxMinutes: 10,
};

function colorStep(overrides: Partial<ColorHistoryStep> & { targetShade: Shade; startLevel: number }): ColorHistoryStep {
  return {
    kind: "color",
    brandName: "Generic",
    line: null,
    grayPercent: 0,
    applicationZone: "full-head",
    result: baseColorResult,
    additionalShade: null,
    additionalShadeGrams: null,
    blend: null,
    prePigmentation: null,
    neutralizationApplied: false,
    processingMinutes: 30,
    pricePerGram: 0.18,
    ...overrides,
  } as ColorHistoryStep;
}

function bleachStep(overrides: Partial<BleachHistoryStep> & { startLevel: number; targetLevel: number }): BleachHistoryStep {
  return {
    kind: "bleach",
    result: baseBleachResult,
    processingMinutes: 35,
    pricePerGram: 0.1,
    ...overrides,
  } as BleachHistoryStep;
}

describe("buildZonePreview", () => {
  it("returns one row per zone, ordered by first appearance, with a start swatch plus one per step", () => {
    const roots = colorStep({ strandZone: "roots", startLevel: 6, targetShade: { code: "6/97", level: 6, tone: "copper" } });
    const midLengths = colorStep({ strandZone: "mid-lengths", startLevel: 6, targetShade: { code: "8.7", level: 8, tone: "gold" } });
    const ends = colorStep({ strandZone: "ends", startLevel: 8, targetShade: { code: "8/73", level: 8, tone: "gold" } });

    const rows = buildZonePreview([roots, midLengths, ends]);

    expect(rows).toHaveLength(3);
    expect(rows.map(r => r.zoneLabel)).toEqual(["Roots", "Mid-lengths", "Ends"]);
    expect(rows.map(r => r.swatches.length)).toEqual([2, 2, 2]);
    expect(rows.map(r => r.swatches.map(s => s.caption))).toEqual([
      ["6", "6/97"],
      ["6", "8.7"],
      ["8", "8/73"],
    ]);
  });

  it("chains a bleach step and a following color step on the same zone into one row", () => {
    const bleach = bleachStep({ strandZone: "roots", startLevel: 6, targetLevel: 9 });
    const color = colorStep({ strandZone: "roots", startLevel: 9, targetShade: { code: "9.1", level: 9, tone: "ash" } });

    const rows = buildZonePreview([bleach, color]);

    expect(rows).toHaveLength(1);
    expect(rows[0].swatches).toHaveLength(3);
    expect(rows[0].swatches.map(s => s.caption)).toEqual(["6", "9", "9.1"]);
    expect(rows[0].swatches[1].hex).toBe(shadeToHexColor({ code: "9", level: 9, tone: "gold" }));
  });

  it("renders a color step's achieved level, not its nominal target, when a partial-lift fallback occurred", () => {
    const targetShade: Shade = { code: "12.1", level: 12, tone: "ash" };
    const step = colorStep({
      startLevel: 5,
      targetShade,
      result: { ...baseColorResult, achievedLevel: 10 },
    });

    const rows = buildZonePreview([step]);

    expect(rows[0].swatches[1].hex).toBe(shadeToHexColor({ ...targetShade, level: 10 }));
    expect(rows[0].swatches[1].caption).toBe("12.1");
  });

  it("resolves a compound starting-base tone to its dominant family for the start swatch", () => {
    const step = colorStep({
      startLevel: 7,
      startingBase: { kind: "colored", tone: "light-copper" },
      targetShade: { code: "7.4", level: 7, tone: "copper" },
    });

    const rows = buildZonePreview([step]);

    expect(rows[0].swatches[0].hex).toBe(shadeToHexColor({ code: "7", level: 7, tone: "copper" }));
  });

  it("gives a step with no strandZone a single row with a null zoneLabel", () => {
    const step = colorStep({ startLevel: 6, targetShade: { code: "6.0", level: 6, tone: "natural" } });

    const rows = buildZonePreview([step]);

    expect(rows).toHaveLength(1);
    expect(rows[0].zone).toBeUndefined();
    expect(rows[0].zoneLabel).toBeNull();
  });

  it("returns an empty array for an empty session", () => {
    expect(buildZonePreview([])).toEqual([]);
  });
});
