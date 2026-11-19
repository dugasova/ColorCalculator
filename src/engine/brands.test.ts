import { describe, it, expect } from "vitest";
import { calculateFullFormula } from "./formula";
import { IGORA_VIBRANCE_CHART, IGORA_ROYAL_CHART } from "./brands/igora";
import { REDKEN_COLOR_GELS_OILS_CHART } from "./brands/redken";
import { WELLA_SHADE_CHART, WELLA_COLOR_TOUCH_CHART } from "./brands/wella";
import { LOREAL_MAJIREL_CHART } from "./brands/loreal";
import { MATRIX_SOCOLOR_CHART, MATRIX_SUPER_SYNC_CHART } from "./brands/matrix";
import { BRANDS } from "./brands";
import type { Level } from "./levels";

describe("BRANDS.matrix", () => {
  it("has the full 62-shade SoColor Pre-Bonded Blended Natural range, every shade tagged with the socolor line", () => {
    expect(MATRIX_SOCOLOR_CHART.length).toBe(62);
    for (const shade of MATRIX_SOCOLOR_CHART) {
      expect(shade.line).toBe("socolor");
    }
  });

  it("has the full 50-shade Super Sync range, every shade tagged with the super-sync line and a fixed 1:1 single-developer-choice ratio", () => {
    expect(MATRIX_SUPER_SYNC_CHART.length).toBe(50);
    for (const shade of MATRIX_SUPER_SYNC_CHART) {
      expect(shade.line).toBe("super-sync");
      expect(shade.fixedMixingRatio).toEqual({ colorParts: 1, developerParts: 1 });
      expect(shade.developerVolumeChoices).toEqual([10]);
    }
  });

  it("decodes a two-letter reflect code into primary/secondary tone on both lines", () => {
    const socolorShade = MATRIX_SOCOLOR_CHART.find(s => s.code === "3RV");
    expect(socolorShade).toMatchObject({ level: 3, tone: "red", secondaryTone: "violet" });

    const superSyncShade = MATRIX_SUPER_SYNC_CHART.find(s => s.code === "6WN");
    expect(superSyncShade).toMatchObject({ level: 6, tone: "gold", secondaryTone: "natural" });
  });

  it("mixes 1:1 with developer regardless of level, on both lines combined in the catalog", () => {
    expect(BRANDS.matrix.shades.length).toBe(112);
    expect(BRANDS.matrix.mixingRatio(6, 7)).toEqual({ colorParts: 1, developerParts: 1 });
  });
});

describe("IGORA_VIBRANCE_CHART", () => {
  it("mixes every shade -- including the Level 10 Toners sub-range -- 1:1 with Vibrance Activator", () => {
    expect(IGORA_VIBRANCE_CHART.length).toBeGreaterThan(0);
    for (const shade of IGORA_VIBRANCE_CHART) {
      expect(shade.fixedMixingRatio).toEqual({ colorParts: 1, developerParts: 1 });
    }
  });
});

describe("REDKEN_COLOR_GELS_OILS_CHART", () => {
  const shade = (code: string) => REDKEN_COLOR_GELS_OILS_CHART.find(s => s.code === code)!;
  const formula = (code: string, startLevel: number, grayPercent = 0) =>
    calculateFullFormula({
      startLevel: startLevel as Level,
      targetShade: shade(code),
      grayPercent,
      totalGrams: 60,
    });

  it("has the 61-shade range, mixing 1:1 on every level, Chromatics gone", () => {
    expect(REDKEN_COLOR_GELS_OILS_CHART.length).toBe(61);
    expect(BRANDS.redken.shades.some(s => s.line === "chromatics")).toBe(false);
    expect(BRANDS.redken.mixingRatio(4, 10)).toEqual({ colorParts: 1, developerParts: 1 });
    expect(shade("6GI")).toMatchObject({ tone: "gold", secondaryTone: "pearl", name: "Tenerife" });
    expect(shade("7NW")).toMatchObject({ tone: "natural", secondaryTone: "gold" });
  });

  it("lifts 1/2/3/4 levels at 10/20/30/40 vol, processing 20/30/40/45 min", () => {
    expect(formula("6N", 5)).toMatchObject({ developerVolume: 10, recommendedProcessingMinutes: 20 });
    expect(formula("7N", 5)).toMatchObject({ developerVolume: 20, recommendedProcessingMinutes: 30 });
    expect(formula("8N", 5)).toMatchObject({ developerVolume: 30, recommendedProcessingMinutes: 40 });
    expect(formula("9N", 5)).toMatchObject({ developerVolume: 40, recommendedProcessingMinutes: 45 });
    expect(formula("10N", 5).developerVolume).toBeNull();
  });

  it("covers gray at 20 vol in 30 min, without the 45-minute extension", () => {
    expect(formula("6N", 6, 80)).toMatchObject({
      developerVolume: 20,
      recommendedProcessingMinutes: 30,
      grayLiftWarning: null,
    });
  });

  it("takes no corrector and no tone warning: its shades are balanced against the background", () => {
    const result = formula("9P", 6);
    expect(result.underlyingPigment).not.toBeNull();
    expect(result.recommendedCorrectiveTone).toBeNull();
    expect(result.toneWarning).toBeNull();
  });

  it("warns when gray is lifted more than 2 levels", () => {
    expect(formula("7N", 5, 50).grayLiftWarning).toBeNull();
    expect(formula("8N", 5, 50).grayLiftWarning).toEqual({ code: "8N", maxLift: 2, lift: 3 });
    expect(formula("8N", 5, 0).grayLiftWarning).toBeNull();
  });
});

describe("IGORA_ROYAL_CHART range", () => {
  it("matches the current shade card: 133 shades, pastel 9,5- toners counted as level 10, discontinued shades gone", () => {
    expect(IGORA_ROYAL_CHART.length).toBe(133);
    expect(IGORA_ROYAL_CHART.find(s => s.code === "9,5-29")).toMatchObject({
      level: 10,
      tone: "ash",
      secondaryTone: "violet",
    });
    expect(IGORA_ROYAL_CHART.find(s => s.code === "8-46")).toMatchObject({ tone: "beige", secondaryTone: "chocolate" });
    for (const gone of ["2-0", "5-13", "5-16", "5-57", "8-88"]) {
      expect(IGORA_ROYAL_CHART.find(s => s.code === gone)).toBeUndefined();
    }
  });
});

describe("IGORA_ROYAL_CHART pastel 9,5- toners", () => {
  const pastel = IGORA_ROYAL_CHART.find(s => s.code === "9,5-1")!;

  it("mixes 1:1 with 3%, offering 1.9% for porous ends", () => {
    expect(pastel.fixedMixingRatio).toEqual({ colorParts: 1, developerParts: 1 });
    expect(pastel.developerVolumeChoices).toEqual([10, 6]);
  });

  it("tones a level-9 yellow blonde without a can't-lift warning", () => {
    const result = calculateFullFormula({
      startLevel: 9,
      targetShade: pastel,
      grayPercent: 0,
      totalGrams: 60,
      manualDeveloperVolume: 10,
    });
    expect(result.liftUnsupportedWarning).toBeNull();
    expect(result.eligibilityWarning).toBeNull();
    expect(result.developerVolume).toBe(10);
    expect(result.grams).toMatchObject({ colorGrams: 30, developerGrams: 30 });
  });

  it("warns below a level-9 pre-lightened base", () => {
    const result = calculateFullFormula({
      startLevel: 8,
      targetShade: pastel,
      grayPercent: 0,
      totalGrams: 60,
      manualDeveloperVolume: 10,
    });
    expect(result.eligibilityWarning).toEqual({ code: "9,5-1", minLevel: 9, startLevel: 8 });
    expect(result.liftUnsupportedWarning).not.toBeNull();
  });
});

describe("IGORA_ROYAL_CHART Highlifts 12-series overrides", () => {
  it("recommends 45 min for every Highlifts 12-series shade", () => {
    const highlifts12Shades = IGORA_ROYAL_CHART.filter(s => s.level === 12);
    expect(highlifts12Shades.length).toBeGreaterThan(0);
    for (const shade of highlifts12Shades) {
      expect(shade.fixedProcessingMinutes).toBe(45);
    }
  });

  it("leaves the rest of the Igora Royal chart on the gray-percent-based default", () => {
    const standardShades = IGORA_ROYAL_CHART.filter(s => s.level !== 12);
    expect(standardShades.length).toBeGreaterThan(0);
    for (const shade of standardShades) {
      expect(shade.fixedProcessingMinutes).toBeUndefined();
    }
  });

  it("marks every Highlifts 12-series shade acceptsPartialLift", () => {
    const highlifts12Shades = IGORA_ROYAL_CHART.filter(s => s.level === 12);
    for (const shade of highlifts12Shades) {
      expect(shade.acceptsPartialLift).toBe(true);
    }
  });

  it("end-to-end: a real Highlifts 12-series shade lifts as far as 12% developer allows and reports that level", () => {
    const shade = IGORA_ROYAL_CHART.find(s => s.code === "12-1");
    // Starting from level 6, should lift up to 5 levels with 40 vol
    const result = calculateFullFormula({ startLevel: 6, targetShade: shade!, grayPercent: 0, totalGrams: 60 });

    expect(result.developerVolume).toBe(40);
    expect(result.achievedLevel).toBe(11); // 6 + 5 levels of lift
    expect(result.grams).not.toBeNull();
  });
});

describe("WELLA_SHADE_CHART processing-time and no-lift-developer overrides", () => {
  it("recommends 55 min (midpoint of the documented 50-60 min without heat) for every Special Blonde shade", () => {
    const specialBlondeShades = WELLA_SHADE_CHART.filter(s => s.level === 12);
    expect(specialBlondeShades.length).toBeGreaterThan(0);
    for (const shade of specialBlondeShades) {
      expect(shade.fixedProcessingMinutes).toBe(55);
    }
  });

  it("leaves the rest of the Koleston Perfect chart on the gray-percent-based default", () => {
    const nonSpecialBlondeShades = WELLA_SHADE_CHART.filter(s => s.level !== 12);
    expect(nonSpecialBlondeShades.length).toBeGreaterThan(0);
    for (const shade of nonSpecialBlondeShades) {
      expect(shade.fixedProcessingMinutes).toBeUndefined();
    }
  });

  it("defaults the rest of the Koleston Perfect chart to 4% (13 vol) instead of 3% for same-depth/darker work", () => {
    const nonSpecialBlondeShades = WELLA_SHADE_CHART.filter(s => s.level !== 12);
    expect(nonSpecialBlondeShades.length).toBeGreaterThan(0);
    for (const shade of nonSpecialBlondeShades) {
      expect(shade.noLiftDeveloperVolume).toBe(13);
    }
  });

  it("leaves Special Blonde without a no-lift override -- its own instructions don't cover that case", () => {
    const specialBlondeShades = WELLA_SHADE_CHART.filter(s => s.level === 12);
    for (const shade of specialBlondeShades) {
      expect(shade.noLiftDeveloperVolume).toBeUndefined();
    }
  });

  it("marks every Special Blonde shade acceptsPartialLift -- routinely used as a maximum-lift tool, not a fixed target tone", () => {
    const specialBlondeShades = WELLA_SHADE_CHART.filter(s => s.level === 12);
    for (const shade of specialBlondeShades) {
      expect(shade.acceptsPartialLift).toBe(true);
    }
  });

  it("leaves the rest of the Koleston Perfect chart without acceptsPartialLift", () => {
    const nonSpecialBlondeShades = WELLA_SHADE_CHART.filter(s => s.level !== 12);
    for (const shade of nonSpecialBlondeShades) {
      expect(shade.acceptsPartialLift).toBeUndefined();
    }
  });

  it("end-to-end: a real Special Blonde shade lifts as far as 12% Welloxon allows and reports that level, not its own nominal 12", () => {
    const shade = WELLA_SHADE_CHART.find(s => s.code === "12/1");
    const result = calculateFullFormula({ startLevel: 4, targetShade: shade!, grayPercent: 0, totalGrams: 60 });

    expect(result.developerVolume).toBe(40);
    expect(result.achievedLevel).toBe(9); // 4 + the documented 4-5 levels of lift at 12%
    expect(result.grams).not.toBeNull();
  });
});

describe("LOREAL_MAJIREL_CHART High Lift / Majiblond Ultra overrides", () => {
  it("recommends 50 min for every High Lift shade", () => {
    const highLiftShades = LOREAL_MAJIREL_CHART.filter(s => s.level === 12);
    expect(highLiftShades.length).toBeGreaterThan(0);
    for (const shade of highLiftShades) {
      expect(shade.fixedProcessingMinutes).toBe(50);
    }
  });

  it("leaves the rest of the Majirel chart on the gray-percent-based default", () => {
    const standardShades = LOREAL_MAJIREL_CHART.filter(s => s.level !== 12);
    expect(standardShades.length).toBeGreaterThan(0);
    for (const shade of standardShades) {
      expect(shade.fixedProcessingMinutes).toBeUndefined();
    }
  });

  it("mixes High Lift 1:2, overriding the rest of Majirel's own 1:1.5", () => {
    const highLiftShades = LOREAL_MAJIREL_CHART.filter(s => s.level === 12);
    for (const shade of highLiftShades) {
      expect(shade.fixedMixingRatio).toEqual({ colorParts: 1, developerParts: 2 });
    }
    const standardShades = LOREAL_MAJIREL_CHART.filter(s => s.level !== 12);
    expect(standardShades.length).toBeGreaterThan(0);
    for (const shade of standardShades) {
      expect(shade.fixedMixingRatio).toEqual({ colorParts: 1, developerParts: 1.5 });
    }
  });

  it("marks every High Lift shade acceptsPartialLift, unlike the rest of the chart", () => {
    const highLiftShades = LOREAL_MAJIREL_CHART.filter(s => s.level === 12);
    for (const shade of highLiftShades) {
      expect(shade.acceptsPartialLift).toBe(true);
    }
    const standardShades = LOREAL_MAJIREL_CHART.filter(s => s.level !== 12);
    for (const shade of standardShades) {
      expect(shade.acceptsPartialLift).toBeUndefined();
    }
  });

  it("end-to-end: a real High Lift shade lifts as far as 40vol allows and reports that level", () => {
    const shade = LOREAL_MAJIREL_CHART.find(s => s.code === ".1");
    // Starting from level 6, should lift up to 5 levels with 40 vol
    const result = calculateFullFormula({ startLevel: 6, targetShade: shade!, grayPercent: 0, totalGrams: 60 });

    expect(result.developerVolume).toBe(40);
    expect(result.achievedLevel).toBe(11); // 6 + 5 levels of lift
    expect(result.grams).not.toBeNull();
  });
});

describe("Wella Color Touch mixing ratio choices", () => {
  it("offers the standard 1:2 first (the default) and 1:1.5 on every Color Touch shade", () => {
    const colorTouchShades = WELLA_COLOR_TOUCH_CHART;

    expect(colorTouchShades.length).toBeGreaterThan(0);
    for (const shade of colorTouchShades) {
      expect(shade.mixingRatioChoices).toEqual([
        { colorParts: 1, developerParts: 2 },
        { colorParts: 1, developerParts: 1.5 },
      ]);
      expect(shade.mixingRatioChoices![0]).toEqual(shade.fixedMixingRatio);
    }
  });
});
