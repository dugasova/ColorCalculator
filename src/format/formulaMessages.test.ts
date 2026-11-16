import { describe, it, expect, afterEach } from "vitest";
import i18n from "../i18n";
import { calculateFullFormula } from "../engine/formula";
import type { Shade } from "../engine/shades";
import { formatCorrectiveTones, formatToneWarning, isBackgroundCoveredByShade } from "./formulaMessages";

afterEach(() => i18n.changeLanguage("en"));

const lift = (targetShade: Shade, startLevel: 6 | 7 = 6) =>
  calculateFullFormula({ startLevel, targetShade, grayPercent: 0, totalGrams: 60 });

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
    // L'Oréal's mixtones belong to one line each: Majirel Mix has no blue, Dia has none.
    expect(formatCorrectiveTones(result, { brandId: "loreal", line: "inoa" })).toBe(
      "2 g .1 or Mix Blue + 2 g .2 or Mix Violet",
    );
    expect(formatCorrectiveTones(result, { brandId: "loreal", line: "majirel" })).toBe("2 g .1 + 2 g .2 or Mix Violet");
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

  it("names Matrix SoColor's boosters and the developer they take, capped at a quarter of the dye", () => {
    const matrix = { brandId: "matrix", line: "socolor" };
    const cap = { line: "socolor", maxCorrectorShareOfColor: 0.25 };
    expect(formatCorrectiveTones(lift({ code: "8G", level: 8, tone: "gold", ...cap }), matrix)).toBe(
      "2 g SoBoost Blue + 2 g SoBoost Violet (+ 4 g developer)",
    );
    // The Rule of 10 asks for 14 g on a 2 -> 3 lift; 30 g of dye takes 7.5 g at most.
    const dark = calculateFullFormula({
      startLevel: 2,
      targetShade: { code: "3N", level: 3, tone: "natural", ...cap },
      grayPercent: 0,
      totalGrams: 60,
      mixingRatioStrategy: () => ({ colorParts: 1, developerParts: 1 }),
    });
    expect(dark.correctorGrams).toBe(7.5);
    expect(formatCorrectiveTones(dark, matrix)).toBe("7.5 g SoBoost Green (+ 7.5 g developer)");
    // Super Sync has no boosters.
    expect(
      formatCorrectiveTones(lift({ code: "8.3", level: 8, tone: "gold" }), { brandId: "matrix", line: "super-sync" }),
    ).toBe("2 g ash + 2 g violet");
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
