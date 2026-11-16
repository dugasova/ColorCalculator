import { describe, it, expect } from "vitest";
import { buildZonePreview } from "./zonePreview";
import { shadeToHexColor } from "./engine/color";
import type { ColorHistoryStep, BleachHistoryStep } from "./history";
import type { Shade } from "./engine/shades";

const baseColorResult: ColorHistoryStep["result"] = {
  developerVolume: 30,
  mixingRatio: { colorParts: 1, developerParts: 2 },
  grayCoverage: { naturalRatio: 0, fashionRatio: 1 },
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

function colorStep(
  overrides: Partial<ColorHistoryStep> & { targetShade: Shade; startLevel: number },
): ColorHistoryStep {
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

function bleachStep(
  overrides: Partial<BleachHistoryStep> & { startLevel: number; targetLevel: number },
): BleachHistoryStep {
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
    const roots = colorStep({
      strandZone: "roots",
      startLevel: 6,
      targetShade: { code: "6/97", level: 6, tone: "copper" },
    });
    const midLengths = colorStep({
      strandZone: "mid-lengths",
      startLevel: 6,
      targetShade: { code: "8.7", level: 8, tone: "gold" },
    });
    const ends = colorStep({
      strandZone: "ends",
      startLevel: 8,
      targetShade: { code: "8/73", level: 8, tone: "gold" },
    });

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
    const color = colorStep({
      strandZone: "roots",
      startLevel: 9,
      targetShade: { code: "9.1", level: 9, tone: "ash" },
    });

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

describe("buildZonePreview: foil placement", () => {
  const strandsBleach = bleachStep({
    strandZone: "full-head",
    foil: { group: "strands-1", percent: 30 },
    startLevel: 4,
    targetLevel: 8,
  });
  const restColor = colorStep({
    strandZone: "full-head",
    foil: { group: "outside", percent: null },
    startLevel: 4,
    targetShade: { code: "5.07", level: 5, tone: "natural" },
  });

  it("splits a zone worked in foils into one row per group of hair, instead of one chain", () => {
    const rows = buildZonePreview([strandsBleach, restColor]);

    expect(rows.map(row => [row.zoneLabel, row.swatches.map(s => s.caption)])).toEqual([
      ["Full head · Strands 1 (in foil), ~30%", ["4", "8"]],
      ["Full head · Hair outside the foil", ["4", "5.07"]],
    ]);
    expect(rows.map(row => row.foilGroup)).toEqual(["strands-1", "outside"]);
  });

  it("adds a later all-hair step to every group of the zone", () => {
    const toner = colorStep({
      strandZone: "full-head",
      startLevel: 8,
      targetShade: { code: "9.1", level: 9, tone: "ash" },
    });

    const rows = buildZonePreview([strandsBleach, restColor, toner]);

    expect(rows.map(row => row.swatches.map(s => s.caption))).toEqual([
      ["4", "8", "9.1"],
      ["4", "5.07", "9.1"],
    ]);
  });

  it("shows the hair outside the foil at its starting level when no step touches it", () => {
    const rows = buildZonePreview([strandsBleach]);

    expect(rows.map(row => [row.foilGroup, row.swatches.map(s => s.caption)])).toEqual([
      ["strands-1", ["4", "8"]],
      ["outside", ["4"]],
    ]);
  });

  it("keeps two sets of strands apart and leaves other zones as single rows", () => {
    const secondSet = bleachStep({
      strandZone: "full-head",
      foil: { group: "strands-2", percent: null },
      startLevel: 4,
      targetLevel: 10,
    });
    const roots = colorStep({
      strandZone: "roots",
      startLevel: 4,
      targetShade: { code: "5.0", level: 5, tone: "natural" },
    });

    const rows = buildZonePreview([strandsBleach, secondSet, roots]);

    expect(rows.map(row => [row.zoneLabel, row.swatches.map(s => s.caption)])).toEqual([
      ["Full head · Strands 1 (in foil), ~30%", ["4", "8"]],
      ["Full head · Strands 2 (in foil)", ["4", "10"]],
      ["Full head · Hair outside the foil", ["4"]],
      ["Roots", ["4", "5.0"]],
    ]);
    expect(rows[3].foilGroup).toBeNull();
  });
});
