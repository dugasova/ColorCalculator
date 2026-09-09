import { describe, it, expect } from "vitest";
import { calculateFullFormula } from "./formula";
import { IGORA_VIBRANCE_CHART } from "./brands/igora";
import { WELLA_SHADE_CHART } from "./brands/wella";

describe("IGORA_VIBRANCE_CHART", () => {
  it("mixes every shade -- including the Level 10 Toners sub-range -- 1:1 with Vibrance Activator", () => {
    expect(IGORA_VIBRANCE_CHART.length).toBeGreaterThan(0);
    for (const shade of IGORA_VIBRANCE_CHART) {
      expect(shade.fixedMixingRatio).toEqual({ colorParts: 1, developerParts: 1 });
    }
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
    const result = calculateFullFormula(4, shade!, 0, 60);

    expect(result.developerVolume).toBe(40);
    expect(result.achievedLevel).toBe(9); // 4 + the documented 4-5 levels of lift at 12%
    expect(result.grams).not.toBeNull();
  });
});
