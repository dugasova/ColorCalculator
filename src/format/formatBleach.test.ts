import { describe, it, expect, afterEach } from "vitest";
import i18n from "../i18n";
import { calculateBleachFormula } from "../engine/bleach";
import { formatBleachText, formatBleachToning } from "./formatBleach";

afterEach(() => i18n.changeLanguage("en"));

describe("formatBleachToning", () => {
  it("names the background the lightening leaves and the toner that cancels it", () => {
    expect(formatBleachToning(9)).toEqual({ background: "yellow", toner: "level 9 toner, violet" });
    expect(formatBleachToning(6)).toEqual({ background: "orange", toner: "level 6 toner, ash" });
  });

  it("lists both tones of a blended background, dominant first", () => {
    expect(formatBleachToning(7).toner).toBe("level 7 toner, ash + violet");
    expect(formatBleachToning(4).toner).toBe("level 4 toner, matt + ash");
  });

  it("follows the current language", () => {
    void i18n.changeLanguage("uk");
    expect(formatBleachToning(9).toner).toBe(`тонер рівня 9, ${i18n.t("palette.toneFamily.violet").toLowerCase()}`);
  });
});

describe("formatBleachText", () => {
  it("adds the session plan when the lift takes several sessions", () => {
    const text = formatBleachText({
      startLevel: 4,
      targetLevel: 10,
      result: calculateBleachFormula(4, 10, 60),
      processingMinutes: 35,
    });
    expect(text).toContain("Session plan:");
    expect(text).toContain("Session 1: 4 → 7");
    expect(text).toContain("then a 1–2 week break");
    expect(text).toContain("Session 2: 7 → 10");
  });

  it("ends with the background and the toning when there is a formula", () => {
    const result = calculateBleachFormula(6, 8, 60);
    const text = formatBleachText({ startLevel: 6, targetLevel: 8, result, processingMinutes: 30 });
    expect(text).toContain("Background after lightening: yellow-orange");
    expect(text).toContain("Toning: level 8 toner, ash + violet");
  });

  it("says nothing about toning when nothing is lightened", () => {
    const result = calculateBleachFormula(8, 8, 60);
    const text = formatBleachText({ startLevel: 8, targetLevel: 8, result, processingMinutes: 30 });
    expect(text).not.toContain("Toning");
  });
});
