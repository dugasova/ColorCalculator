import { describe, it, expect, afterEach } from "vitest";
import i18n from "../i18n";
import { BRANDS } from "../engine/brands";
import { calculateFullFormula } from "../engine/formula";
import type { Shade } from "../engine/shades";
import {
  buildMixCorrector,
  formatMixCorrector,
  formatCorrectiveTones,
  formatLiftUnsupportedWarning,
  formatToneWarning,
  isBackgroundCoveredByShade,
} from "./formulaMessages";
import { buildMixSummary } from "./formatFormula";

afterEach(() => i18n.changeLanguage("en"));

const lift = (targetShade: Shade, startLevel: 6 | 7 = 6) =>
  calculateFullFormula({ startLevel, targetShade, grayPercent: 0, totalGrams: 60 });

describe("Igora correctors in the formula calculator", () => {
  const igora = { brandId: "igora", line: "royal" };
  const royal = { line: "royal", correctorRule: "rule-of-11" as const };

  it("doses by the Rule of 11, keeps 0-22 for the blue part, and adds developer 1:1", () => {
    // 6 -> 8 over 60 g: 3 cm = 1.5 g per 30 g, less 40% = 0.9 g, doubled = 1.8 g, half each.
    const result = lift({ code: "8-5", level: 8, tone: "gold", ...royal });
    expect(formatCorrectiveTones(result, igora)).toBe("0.9 g 0-22 + 0.9 g 0-11 (+ 1.8 g developer)");
  });

  it("shares a tone's grams between 0-11 and 0-99 when the colorist takes both", () => {
    // 8 -> 9 over 60 g: 2 cm = 1 g per 30 g, less 40% = 0.6 g, doubled = 1.2 g of violet.
    const result = lift({ code: "9-0", level: 9, tone: "natural", ...royal }, 7);
    expect(buildMixCorrector(result, igora)?.parts).toEqual([{ name: "0-11", grams: 1.2 }]);
    expect(buildMixCorrector(result, igora, { violet: "shade" })?.parts).toEqual([{ name: "0-99", grams: 1.2 }]);
    expect(buildMixCorrector(result, igora, { violet: "both" })?.parts).toEqual([
      { name: "0-11", grams: 0.6 },
      { name: "0-99", grams: 0.6 },
    ]);
  });

  it("adds nothing to a self-neutralizing 12- shade, and does not warn about its tone", () => {
    const special = BRANDS.igora.shades.find(shade => shade.line === "royal" && shade.code === "12-0")!;
    const run = (targetShade: Shade) =>
      calculateFullFormula({ startLevel: 7, targetShade, grayPercent: 0, totalGrams: 60 });
    const result = run(special);
    expect(result.achievedLevel).not.toBeNull();
    expect(result.recommendedCorrectiveTone).toBeNull();
    expect(result.toneWarning).toBeNull();
    // The same lift on a shade without its own neutralization does take a corrector.
    expect(run({ ...special, selfNeutralizing: undefined }).recommendedCorrectiveTone).not.toBeNull();
  });
});

describe("formatCorrectiveTones", () => {
  it("lists a blended corrector tone by tone", () => {
    expect(formatCorrectiveTones(lift({ code: "8.3", level: 8, tone: "gold" }))).toBe("2 g ash + 2 g violet");
  });

  it("names only the part the shade does not bring", () => {
    expect(formatCorrectiveTones(lift({ code: "8.1", level: 8, tone: "ash" }))).toBe("2 g violet");
  });

  it("is null when the shade's own tone cancels the background, which is then reported as covered", () => {
    const result = lift({ code: "9.2", level: 9, tone: "violet" }, 7);
    expect(formatCorrectiveTones(result)).toBeNull();
    expect(isBackgroundCoveredByShade(result)).toBe(true);
  });

  it("is null, and nothing is covered, when the formula does not lift", () => {
    const result = lift({ code: "6.1", level: 6, tone: "ash" });
    expect(formatCorrectiveTones(result)).toBeNull();
    expect(isBackgroundCoveredByShade(result)).toBe(false);
  });

  it("still reads a result saved before correctors could be blends", () => {
    const saved = { recommendedCorrectiveTone: "violet" as const, correctorGrams: 4 };
    expect(formatCorrectiveTones(saved)).toBe("4 g violet");
    expect(isBackgroundCoveredByShade({ ...saved, underlyingPigment: "yellow" })).toBe(false);
  });

  it("names the corrector by the brand's own shade suffix and mixtone", () => {
    const result = lift({ code: "8.3", level: 8, tone: "gold" });
    const wella = { brandId: "wella", line: "koleston-perfect" };
    expect(formatCorrectiveTones(result, wella)).toBe("2 g /8 or 0/88 + 2 g /6 or 0/66");
    // L'Oréal's mixtones belong to one line each (INOA Mix, Majirel Booster); Dia has none.
    expect(formatCorrectiveTones(result, { brandId: "loreal", line: "inoa" })).toBe(
      "2 g .1 or Mix Blue + 2 g .2 or Mix Violet",
    );
    expect(formatCorrectiveTones(result, { brandId: "loreal", line: "majirel" })).toBe(
      "2 g .1 or Booster Blue + 2 g .2 or Booster Violet",
    );
    expect(formatCorrectiveTones(result, { brandId: "loreal", line: "dia-color" })).toBe("2 g .1 + 2 g .2");
    expect(formatToneWarning(result.toneWarning!, wella)).toContain("/8 or 0/88 + /6 or 0/66");
  });

  it("uses the line's own mixtones, and only the shade suffix where the line has none", () => {
    const colorTouch = { brandId: "wella", line: "color-touch" };
    expect(formatCorrectiveTones(lift({ code: "8.3", level: 8, tone: "gold" }), colorTouch)).toBe(
      "2 g /8 or 0/88 + 2 g /6 or 0/68",
    );
    const dark = calculateFullFormula({
      startLevel: 2,
      targetShade: { code: "3.0", level: 3, tone: "natural" },
      grayPercent: 0,
      totalGrams: 60,
    });
    expect(formatCorrectiveTones(dark, colorTouch)).toMatch(/^\d+ g \/2$/);
  });

  it("names Matrix's correctors by real shades of the line, with the developer they take", () => {
    const matrix = { brandId: "matrix", line: "socolor" };
    // No boosters: the blue is the nearest A shade (no 8A in SoColor, so 9A from 8 up),
    // the violet the ready 8AV below level 9.
    expect(formatCorrectiveTones(lift({ code: "8G", level: 8, tone: "gold", line: "socolor" }), matrix)).toBe(
      "2 g 9A + 2 g 8AV (+ 4 g developer)",
    );
    const dark = calculateFullFormula({
      startLevel: 2,
      targetShade: { code: "3N", level: 3, tone: "natural", line: "socolor" },
      grayPercent: 0,
      totalGrams: 60,
      mixingRatioStrategy: () => ({ colorParts: 1, developerParts: 1 }),
    });
    // The Rule of 10 asks for 14 g on a 2 -> 3 lift, uncapped now that SoBoost's 25% is gone.
    expect(dark.correctorGrams).toBe(14);
    // Against red: a Jade shade, one level darker first on 4–7 and none at 3 or 2, so 4NJ.
    expect(formatCorrectiveTones(dark, matrix)).toBe("14 g 4NJ (+ 14 g developer)");
    // Super Sync by its own shades, 1:1 with developer too.
    expect(
      formatCorrectiveTones(lift({ code: "8.3", level: 8, tone: "gold" }), { brandId: "matrix", line: "super-sync" }),
    ).toBe("2 g 8A + 2 g 8V (+ 4 g developer)");
  });

  it("scales the corrector down to a manufacturer's cap on its share of the dye", () => {
    // 14 g by the Rule of 10; 30 g of dye at a 25% cap takes 7.5 g at most.
    const capped = calculateFullFormula({
      startLevel: 2,
      targetShade: { code: "3N", level: 3, tone: "natural", maxCorrectorShareOfColor: 0.25 },
      grayPercent: 0,
      totalGrams: 60,
      mixingRatioStrategy: () => ({ colorParts: 1, developerParts: 1 }),
    });
    expect(capped.correctorGrams).toBe(7.5);
  });

  it("falls back to the tone's name for a brand with no corrector table", () => {
    expect(formatCorrectiveTones(lift({ code: "8.3", level: 8, tone: "gold" }), { brandId: "igora", line: null })).toBe(
      "2 g ash + 2 g violet",
    );
  });

  it("names the tones in the current language", () => {
    void i18n.changeLanguage("uk");
    expect(formatCorrectiveTones(lift({ code: "8.3", level: 8, tone: "gold" }))).toBe(
      "2 г попелястий + 2 г фіолетовий",
    );
  });
});

describe("formatToneWarning", () => {
  it("names the shade's tone, the background and every tone of the corrector", () => {
    const { toneWarning } = lift({ code: "8.3", level: 8, tone: "gold" });
    expect(formatToneWarning(toneWarning!)).toBe(
      "The chosen tone 'gold' won't neutralize the yellow-orange background; add a 'ash + violet' corrector",
    );
  });

  it("still reads a warning saved with a single recommended tone", () => {
    expect(formatToneWarning({ tone: "gold", pigment: "yellow", recommended: "violet" })).toBe(
      "The chosen tone 'gold' won't neutralize the yellow background; add a 'violet' corrector",
    );
  });

  it("is fully translated", () => {
    void i18n.changeLanguage("uk");
    expect(formatToneWarning({ tone: "gold", pigment: "yellow", recommended: "violet" })).toBe(
      "Обраний тон «золотистий» не нейтралізує жовтий фон освітлення; додайте коректор «фіолетовий»",
    );
  });
});

describe("an applied corrector in the mix", () => {
  it("goes on top of the dye and brings developer of its own at the formula's ratio", () => {
    const shade: Shade = { code: "8/3", level: 8, tone: "gold" };
    const result = calculateFullFormula({
      startLevel: 6,
      targetShade: shade,
      grayPercent: 0,
      totalGrams: 60,
      mixingRatioStrategy: () => ({ colorParts: 1, developerParts: 2 }),
    });
    const corrector = buildMixCorrector(result, { brandId: "wella", line: "koleston-perfect" });
    expect(corrector).toEqual({
      parts: [
        { name: "0/88", grams: 2 },
        { name: "0/66", grams: 2 },
      ],
      developerGrams: 8,
    });
    // 20 g of dye and 40 g of developer without it
    expect(buildMixSummary(shade, result.grams!, null, 0)).toBe("8/3- 20.0 g developer 40.0 g");
    expect(buildMixSummary(shade, result.grams!, null, 0, null, 0, null, corrector)).toBe(
      "8/3- 20.0 g 0/88- 2.0 g 0/66- 2.0 g developer 48.0 g",
    );
  });

  it("is null when the formula calls for no corrector", () => {
    expect(buildMixCorrector(lift({ code: "6.1", level: 6, tone: "ash" }))).toBeNull();
  });

  it("takes each tone in the form the colorist picked and leaves out the ones skipped", () => {
    const result = lift({ code: "8/3", level: 8, tone: "gold" });
    const wella = { brandId: "wella", line: "koleston-perfect" };
    // the blue part as an ordinary /8 shade, the violet part not at all
    const corrector = buildMixCorrector(result, wella, { ash: "shade", violet: "skip" });
    expect(corrector?.parts).toEqual([{ name: "/8", grams: 2 }]);
    expect(formatMixCorrector(corrector!)).toBe("2 g /8");
    // nothing left to mix in once every tone is skipped
    expect(buildMixCorrector(result, wella, { ash: "skip", violet: "skip" })).toBeNull();
    // a line with no mixtone for the tone falls back to its shade
    expect(buildMixCorrector(result, { brandId: "loreal", line: "dia-color" }, { ash: "mixtone" })?.parts[0].name).toBe(
      ".1",
    );
  });
});

describe("formatLiftUnsupportedWarning", () => {
  it("names the base range where the line lifts a little, and 'or higher' where it lifts nothing", async () => {
    await i18n.changeLanguage("uk");
    expect(formatLiftUnsupportedWarning({ code: "11V", level: 11, startLevel: 9, minLevel: 10 })).toBe(
      "«11V» не може підняти рівень — він лише наносить колір, тому волосся вже має бути рівня 10–11, а початковий рівень — 9",
    );
    expect(formatLiftUnsupportedWarning({ code: "8/73", level: 8, startLevel: 6 })).toContain("рівня 8 або вище");
  });
});
