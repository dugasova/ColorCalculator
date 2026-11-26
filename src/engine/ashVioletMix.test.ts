import { describe, expect, it } from "vitest";
import { getAshVioletMix, getAshVioletToningHint, splitAshViolet } from "./ashVioletMix";
import { calculateFullFormula } from "./formula";
import { BRANDS } from "./brands";
import { MATRIX_SOCOLOR_CHART, MATRIX_SUPER_SYNC_CHART } from "./brands/matrix";
import type { Level } from "./levels";

const superSync = (code: string) => MATRIX_SUPER_SYNC_CHART.find(shade => shade.code === code)!;

describe("getAshVioletMix", () => {
  it("pairs Super Sync's pure ash shades with the violet one, the first ratio by default", () => {
    expect(getAshVioletMix(superSync("8A"))).toEqual({
      ashCode: "8A",
      violetCode: "8V",
      ratio: { ashParts: 2, violetParts: 1 },
      choices: [
        { ashParts: 2, violetParts: 1 },
        { ashParts: 1, violetParts: 1 },
      ],
    });
    expect(getAshVioletMix(superSync("10A"))?.ratio).toEqual({ ashParts: 1, violetParts: 2 });
    expect(getAshVioletMix(superSync("11A"))?.ratio).toEqual({ ashParts: 1, violetParts: 3 });
  });

  it("takes the colorist's second ratio, and ignores one the level does not offer", () => {
    expect(getAshVioletMix(superSync("10A"), { ashParts: 1, violetParts: 3 })?.ratio).toEqual({
      ashParts: 1,
      violetParts: 3,
    });
    expect(getAshVioletMix(superSync("10A"), { ashParts: 2, violetParts: 1 })?.ratio).toEqual({
      ashParts: 1,
      violetParts: 2,
    });
  });

  it("takes no mix off Super Sync's pure ash at 8, 10, 11, nor in SoColor", () => {
    expect(getAshVioletMix(superSync("6A"))).toBeNull();
    expect(getAshVioletMix(superSync("9NA"))).toBeNull();
    expect(getAshVioletMix(superSync("8V"))).toBeNull();
    expect(getAshVioletMix(MATRIX_SOCOLOR_CHART.find(shade => shade.code === "9A")!)).toBeNull();
  });
});

describe("splitAshViolet", () => {
  it("splits to 0.1 g, the two adding up", () => {
    expect(splitAshViolet(30, { ashParts: 2, violetParts: 1 })).toEqual({ ashGrams: 20, violetGrams: 10 });
    expect(splitAshViolet(30, { ashParts: 1, violetParts: 3 })).toEqual({ ashGrams: 7.5, violetGrams: 22.5 });
    expect(splitAshViolet(10, { ashParts: 1, violetParts: 2 })).toEqual({ ashGrams: 3.3, violetGrams: 6.7 });
  });
});

describe("the formula with an ash + violet mix", () => {
  const formula = (code: string, startLevel: Level) =>
    calculateFullFormula({
      startLevel,
      targetShade: superSync(code),
      grayPercent: 0,
      totalGrams: 60,
      mixingRatioStrategy: BRANDS.matrix.mixingRatio,
      manualDeveloperVolume: 10,
    });

  it("reports the mix and lets its violet half cancel the background: no corrector", () => {
    const result = formula("8A", 7);
    expect(result.ashVioletMix?.violetCode).toBe("8V");
    expect(result.underlyingPigment).not.toBeNull();
    expect(result.correctiveTones).toEqual([]);
    expect(result.recommendedCorrectiveTone).toBeNull();
  });

  it("applies when toning on the shade's own level too", () => {
    expect(formula("10A", 10).ashVioletMix?.ratio).toEqual({ ashParts: 1, violetParts: 2 });
  });

  it("is null for any other shade", () => {
    expect(formula("8P", 7).ashVioletMix).toBeNull();
  });
});

describe("getAshVioletToningHint", () => {
  it("names Super Sync's toner mix after powder, 9NA + 10NV on a 9", () => {
    expect(getAshVioletToningHint("super-sync", 8)).toEqual({
      codes: ["8A", "8V"],
      ratios: [
        { ashParts: 2, violetParts: 1 },
        { ashParts: 1, violetParts: 1 },
      ],
    });
    expect(getAshVioletToningHint("super-sync", 9)).toEqual({
      codes: ["9NA", "10NV"],
      ratios: [{ ashParts: 1, violetParts: 1 }],
    });
    expect(getAshVioletToningHint("super-sync", 11)?.codes).toEqual(["11A", "11V"]);
    expect(getAshVioletToningHint("super-sync", 7)).toBeNull();
    expect(getAshVioletToningHint("socolor", 8)).toBeNull();
  });
});
