import { describe, it, expect } from "vitest";
import {
  getComplementaryCorrector,
  getCorrectionDeveloper,
  getCorrectionTechnique,
  calculateColorCorrection,
  calculateCorrectorGrams,
  calculateCorrectionTones,
  findBleachToners,
  findNeutralizingShades,
  getCorrectionTones,
  getDominantWheelTone,
  getExpectedUnwantedTone,
  getLineCorrectorCap,
  getLineMixingRatio,
  getLineCorrectorRule,
  isLineSelfNeutralizingAt,
} from "./correction";
import { BRANDS } from "./brands";
import { getCorrectorProduct } from "./correctorProducts";

describe("getComplementaryCorrector", () => {
  it("maps each unwanted tone to its opposite on the color star", () => {
    expect(getComplementaryCorrector("red")).toEqual({
      color: "green",
      qualifier: "ash-matte",
      reflections: [".13", ".31"],
    });
    expect(getComplementaryCorrector("orange")).toEqual({
      color: "blue",
      qualifier: "ash",
      reflections: [".1", ".01"],
    });
    expect(getComplementaryCorrector("yellow")).toEqual({
      color: "violet",
      qualifier: "iridescent",
      reflections: [".2"],
    });
    expect(getComplementaryCorrector("green")).toEqual({ color: "red", qualifier: "copper", reflections: [".4"] });
    expect(getComplementaryCorrector("blue")).toEqual({
      color: "orange",
      qualifier: "copper-gold",
      reflections: [".43", ".34"],
    });
    expect(getComplementaryCorrector("violet")).toEqual({ color: "yellow", qualifier: "gold", reflections: [".3"] });
  });
});

describe("getCorrectionDeveloper", () => {
  it("uses 10vol (3%) for same level or darkening", () => {
    expect(getCorrectionDeveloper(7, 7)).toEqual({ volume: 10, percent: 3 });
    expect(getCorrectionDeveloper(7, 6)).toEqual({ volume: 10, percent: 3 });
  });

  it("uses 20vol (6%) for a moderate 1-2 level lift", () => {
    expect(getCorrectionDeveloper(6, 7)).toEqual({ volume: 20, percent: 6 });
    expect(getCorrectionDeveloper(6, 8)).toEqual({ volume: 20, percent: 6 });
  });

  it("uses 30vol (9%) for a 3-level lift", () => {
    expect(getCorrectionDeveloper(5, 8)).toEqual({ volume: 30, percent: 9 });
  });

  it("uses 40vol (12%) for a 4+ level lift, capped at 40", () => {
    expect(getCorrectionDeveloper(4, 8)).toEqual({ volume: 40, percent: 12 });
    expect(getCorrectionDeveloper(2, 9)).toEqual({ volume: 40, percent: 12 });
  });
});

describe("getCorrectionTechnique", () => {
  it("recommends direct deposit when no lift is needed", () => {
    expect(getCorrectionTechnique(7, 7)).toBe("deposit");
    expect(getCorrectionTechnique(7, 6)).toBe("deposit");
  });

  it("recommends lift + tone for a moderate 1-2 level lift", () => {
    expect(getCorrectionTechnique(6, 7)).toBe("lift-tone");
    expect(getCorrectionTechnique(6, 8)).toBe("lift-tone");
  });

  it("recommends multi-step correction for a 3+ level lift", () => {
    expect(getCorrectionTechnique(5, 8)).toBe("multi-step");
    expect(getCorrectionTechnique(2, 9)).toBe("multi-step");
  });
});

describe("calculateColorCorrection", () => {
  it("combines corrector, developer, and technique for a given scenario", () => {
    const result = calculateColorCorrection(6, 8, "orange");
    expect(result).toEqual({
      unwantedTone: "orange",
      corrector: { color: "blue", qualifier: "ash", reflections: [".1", ".01"] },
      developer: { volume: 20, percent: 6 },
      technique: "lift-tone",
    });
  });
});

describe("calculateCorrectorGrams", () => {
  it("subtracts the coloring level from 10 to get grams per 30g of base color", () => {
    expect(calculateCorrectorGrams(7, 30)).toBe(3);
    expect(calculateCorrectorGrams(3, 30)).toBe(7);
  });

  it("scales proportionally with the amount of base color", () => {
    expect(calculateCorrectorGrams(7, 60)).toBe(6);
    expect(calculateCorrectorGrams(1, 15)).toBe(4.5);
  });

  it("floors at 0.5g per 30g from level 10 up, instead of the literal formula's zero -- pale-yellow/very-light-yellow undertones at high-lift depths still need a touch of violet", () => {
    expect(calculateCorrectorGrams(10, 30)).toBe(0.5);
    expect(calculateCorrectorGrams(11, 30)).toBe(0.5);
    expect(calculateCorrectorGrams(12, 30)).toBe(0.5);
  });

  it("scales the high-lift floor proportionally with the amount of base color, like every other level", () => {
    expect(calculateCorrectorGrams(10, 60)).toBe(1);
  });
});

describe("getCorrectionTones", () => {
  it("cancels a warm blend with the same blended neutralizer as a lightening background", () => {
    expect(getCorrectionTones("yellow-orange")).toEqual([
      { tone: "ash", share: 0.5 },
      { tone: "violet", share: 0.5 },
    ]);
    expect(getCorrectionTones("red-orange")).toEqual([
      { tone: "matt", share: 0.75 },
      { tone: "ash", share: 0.25 },
    ]);
    expect(getCorrectionTones("orange")).toEqual([{ tone: "ash", share: 1 }]);
  });

  it("warms over-corrected hair back with the opposite warm tone", () => {
    expect(getCorrectionTones("green")).toEqual([{ tone: "red", share: 1 }]);
    expect(getCorrectionTones("blue")).toEqual([{ tone: "copper", share: 1 }]);
    expect(getCorrectionTones("violet")).toEqual([{ tone: "gold", share: 1 }]);
  });
});

describe("getDominantWheelTone", () => {
  it("shows a blend on the wheel by its first-named color", () => {
    expect(getDominantWheelTone("red-orange")).toBe("red");
    expect(getDominantWheelTone("orange-red")).toBe("orange");
    expect(getDominantWheelTone("yellow-orange")).toBe("yellow");
    expect(getDominantWheelTone("green")).toBe("green");
  });
});

describe("getExpectedUnwantedTone", () => {
  it("follows the background table, the palest backgrounds read as yellow", () => {
    expect(getExpectedUnwantedTone(6)).toBe("orange");
    expect(getExpectedUnwantedTone(8)).toBe("yellow-orange");
    expect(getExpectedUnwantedTone(10)).toBe("yellow");
    expect(getExpectedUnwantedTone(12)).toBe("yellow");
  });
});

describe("calculateCorrectionTones", () => {
  it("splits the Rule of 10 grams by the tones' shares", () => {
    // Level 8, 30 g: 2 g in all, half blue, half violet.
    expect(calculateCorrectionTones("yellow-orange", 8, 30)).toEqual([
      { tone: "ash", grams: 1 },
      { tone: "violet", grams: 1 },
    ]);
  });

  it("scales every tone down to a manufacturer cap", () => {
    // Level 4, 30 g: 6 g by the Rule of 10, capped at 10% of the dye = 3 g.
    // 2.25 + 0.75 rounds to 2.3 + 0.7, so the blend stays at the 3 g cap, not 3.1 g.
    expect(calculateCorrectionTones("red-orange", 4, 30, 0.1)).toEqual([
      { tone: "matt", grams: 2.3 },
      { tone: "ash", grams: 0.7 },
    ]);
  });
});

describe("Wella correctors for over-corrected hair", () => {
  it("cancels green with 0/44 on mid levels and 0/65 from level 8 in Koleston", () => {
    expect(getCorrectorProduct("wella", "koleston-perfect", "red", 6)).toEqual({ shade: "/4", mixtone: "0/44" });
    expect(getCorrectorProduct("wella", "koleston-perfect", "red", 8)).toEqual({ shade: "/65", mixtone: "0/65" });
  });

  it("cancels green with 0/45, and 0/56 from level 8, in Color Touch", () => {
    expect(getCorrectorProduct("wella", "color-touch", "red", 7)).toEqual({ mixtone: "0/45" });
    expect(getCorrectorProduct("wella", "color-touch", "red", 9)).toEqual({ mixtone: "0/56" });
  });

  it("cancels violet with 0/33, and the softer 0/30 from level 9, in Koleston", () => {
    expect(getCorrectorProduct("wella", "koleston-perfect", "gold", 8)).toEqual({ shade: "/3", mixtone: "0/33" });
    expect(getCorrectorProduct("wella", "koleston-perfect", "gold", 9)).toEqual({ shade: "/3", mixtone: "0/30" });
  });

  it("cancels violet with a /3 shade in Color Touch, which has no gold mixtone", () => {
    expect(getCorrectorProduct("wella", "color-touch", "gold", 9)).toEqual({ shade: "/3" });
  });

  it("cancels blue with 0/43 in Koleston", () => {
    expect(getCorrectorProduct("wella", "koleston-perfect", "copper", 7)).toEqual({ mixtone: "0/43" });
  });
});

describe("L'Oréal correctors for over-corrected hair", () => {
  it("uses Majirel's warm boosters and a gold shade, which has no booster", () => {
    expect(getCorrectorProduct("loreal", "majirel", "red", 7)).toEqual({ shade: ".6", mixtone: "Booster Red" });
    expect(getCorrectorProduct("loreal", "majirel", "red", 8)).toEqual({ shade: ".6", mixtone: "Booster Magenta" });
    expect(getCorrectorProduct("loreal", "majirel", "copper", 7)).toEqual({ shade: ".4", mixtone: "Booster Orange" });
    expect(getCorrectorProduct("loreal", "majirel", "gold", 9)).toEqual({ shade: ".3" });
  });

  it("corrects Dia Color with palette shades only", () => {
    expect(getCorrectorProduct("loreal", "dia-color", "red", 6)).toEqual({ shade: ".6" });
    expect(getCorrectorProduct("loreal", "dia-color", "copper", 8)).toEqual({ shade: ".4" });
    expect(getCorrectorProduct("loreal", "dia-color", "gold", 9)).toEqual({ shade: ".3" });
  });
});

describe("Matrix SoColor correctors for over-corrected hair", () => {
  it("offers a SoBoost booster or a shade named by its letter", () => {
    expect(getCorrectorProduct("matrix", "socolor", "red", 7)).toEqual({ shade: "R", mixtone: "SoBoost Red" });
    expect(getCorrectorProduct("matrix", "socolor", "copper", 7)).toEqual({ shade: "C", mixtone: "SoBoost Copper" });
    expect(getCorrectorProduct("matrix", "socolor", "gold", 9)).toEqual({ shade: "G", mixtone: "SoBoost Yellow" });
  });
});

describe("Color Touch against blue", () => {
  it("uses 0/34, its only orange-copper mixtone", () => {
    expect(getCorrectorProduct("wella", "color-touch", "copper", 8)).toEqual({ shade: "/34", mixtone: "0/34" });
  });
});

describe("line helpers", () => {
  it("finds the line's shades at the level that cancel the unwanted tone themselves", () => {
    const codes = findNeutralizingShades(BRANDS.wella, "koleston-perfect", "orange", 8).map(shade => shade.code);
    expect(codes).toContain("8/1");
    expect(codes).toContain("8/38"); // gold does not deepen a plain orange
    expect(codes).not.toContain("8/0");
    expect(codes).not.toContain("8/3");
  });

  it("leaves out a shade whose other tone strengthens the one being corrected", () => {
    // 8/41 brings ash, but its red deepens orange.
    expect(findNeutralizingShades(BRANDS.wella, "koleston-perfect", "orange", 8).map(s => s.code)).not.toContain(
      "8/41",
    );
    // 8/38 brings pearl, but its gold deepens the yellow of a yellow-orange background.
    const blend = findNeutralizingShades(BRANDS.wella, "koleston-perfect", "yellow-orange", 8).map(s => s.code);
    expect(blend).toEqual(expect.arrayContaining(["8/96", "8/97"]));
    expect(blend).not.toContain("8/38");
  });

  it("takes the line's own fixed ratio (Color Touch 1:2) over the brand's", () => {
    expect(getLineMixingRatio(BRANDS.wella, "color-touch", 6, 8)).toEqual({ colorParts: 1, developerParts: 2 });
    expect(getLineMixingRatio(BRANDS.wella, "koleston-perfect", 6, 8)).toEqual({ colorParts: 1, developerParts: 1 });
  });

  it("knows Matrix SoColor caps the corrector at 25% of the dye", () => {
    expect(getLineCorrectorCap(BRANDS.matrix, "socolor")).toBe(0.25);
    expect(getLineCorrectorCap(BRANDS.wella, "koleston-perfect")).toBeUndefined();
  });
});

describe("Igora's Rule of 11", () => {
  it("gives 0.5 g per cm, 11 minus the level, per 30 g of color", () => {
    expect(calculateCorrectorGrams(6, 30, "rule-of-11")).toBe(2.5);
    expect(calculateCorrectorGrams(1, 30, "rule-of-11")).toBe(5);
    expect(calculateCorrectorGrams(6, 60, "rule-of-11")).toBe(5);
  });

  it("cuts the amount by 40% on levels 8–10 and stays at level 10's above it", () => {
    expect(calculateCorrectorGrams(8, 30, "rule-of-11")).toBe(0.9); // 3 cm = 1.5 g, less 40%
    expect(calculateCorrectorGrams(10, 30, "rule-of-11")).toBe(0.3);
    expect(calculateCorrectorGrams(12, 30, "rule-of-11")).toBe(0.3);
  });

  it("is the rule of both Igora lines, the Rule of 10 elsewhere", () => {
    expect(getLineCorrectorRule(BRANDS.igora, "royal")).toBe("rule-of-11");
    expect(getLineCorrectorRule(BRANDS.igora, "vibrance")).toBe("rule-of-11");
    expect(getLineCorrectorRule(BRANDS.wella, "koleston-perfect")).toBe("rule-of-10");
  });

  it("adds no mixtone to Royal's 12- series", () => {
    expect(isLineSelfNeutralizingAt(BRANDS.igora, "royal", 12)).toBe(true);
    expect(isLineSelfNeutralizingAt(BRANDS.igora, "royal", 10)).toBe(false);
    expect(calculateCorrectionTones("yellow", 8, 30, undefined, "rule-of-11")).toEqual([
      { tone: "violet", grams: 0.9 },
    ]);
  });
});

describe("Igora mixtones", () => {
  it("are the same 0- codes in Royal and Vibrance", () => {
    for (const line of ["royal", "vibrance"]) {
      expect(getCorrectorProduct("igora", line, "ash", 6)).toEqual({ mixtone: "0-22" });
      expect(getCorrectorProduct("igora", line, "violet", 9)).toEqual({
        shade: "0-99",
        mixtone: "0-11",
        combinable: true,
      });
      expect(getCorrectorProduct("igora", line, "matt", 4)).toEqual({ mixtone: "0-33" });
      expect(getCorrectorProduct("igora", line, "copper", 7)).toEqual({ mixtone: "0-77" });
      expect(getCorrectorProduct("igora", line, "gold", 7)).toEqual({ mixtone: "0-55" });
    }
  });

  it("cancels yellow with 0-11, offering 0-99 for a pearl beige from level 9", () => {
    expect(getCorrectorProduct("igora", "royal", "violet", 7)).toEqual({ mixtone: "0-11" });
    expect(getCorrectorProduct("igora", "royal", "violet", 8)).toEqual({ mixtone: "0-11" });
    // From level 9 the colorist may take 0-99 too, alone or with 0-11.
    expect(getCorrectorProduct("igora", "royal", "violet", 9)).toEqual({
      shade: "0-99",
      mixtone: "0-11",
      combinable: true,
    });
  });

  it("keeps 0-22 for the blue part on every level", () => {
    expect(getCorrectorProduct("igora", "royal", "ash", 7)).toEqual({ mixtone: "0-22" });
    expect(getCorrectorProduct("igora", "royal", "ash", 8)).toEqual({ mixtone: "0-22" });
  });

  it("cancels green with 0-89, or 0-88 if the colorist picks it", () => {
    expect(getCorrectorProduct("igora", "royal", "red", 5)).toEqual({ shade: "0-88", mixtone: "0-89" });
  });
});

describe("findBleachToners", () => {
  it("picks the line's shades at the target level that cancel the lightened background", () => {
    // Level 9 leaves pale yellow: the violet-carrying Igora Vibrance shades tone it.
    expect(findBleachToners(BRANDS.igora, "vibrance", 9).map(shade => shade.code)).toEqual(["9-1", "9-12"]);
  });

  it("never offers a special blonde, even at its own level", () => {
    expect(findNeutralizingShades(BRANDS.wella, "koleston-perfect", "yellow", 12).length).toBeGreaterThan(0);
    expect(findBleachToners(BRANDS.wella, "koleston-perfect", 12)).toEqual([]);
  });

  it("leaves out Igora Royal's 10- Ultra Blonde Highlifts but keeps the 9,5- pastels", () => {
    const codes = findBleachToners(BRANDS.igora, "royal", 10).map(shade => shade.code);
    expect(codes.some(code => code.startsWith("10-"))).toBe(false);
    expect(codes).toContain("9,5-1");
  });

  it("is empty when the line has no such shade at that level", () => {
    expect(findBleachToners(BRANDS.igora, "vibrance", 8)).toEqual([]);
  });
});
