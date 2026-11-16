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
