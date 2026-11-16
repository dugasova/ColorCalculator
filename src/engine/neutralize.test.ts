import { describe, it, expect } from "vitest";
import { assessNeutralization, getNeutralizer } from "./neutralize";
import { getUnderlyingPigment } from "./levels";
import type { Level } from "./levels";

const colors = (level: Level) => getNeutralizer(getUnderlyingPigment(level)).map(part => part.color);

describe("getUnderlyingPigment", () => {
  it("moves from red through orange to yellow as the level rises", () => {
    expect(([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as Level[]).map(getUnderlyingPigment)).toEqual([
      "red",
      "red",
      "red",
      "red-orange",
      "orange-red",
      "orange",
      "orange-yellow",
      "yellow-orange",
      "yellow",
      "pale-yellow",
      "very-light-yellow",
      "very-light-yellow",
    ]);
  });
});

describe("getNeutralizer", () => {
  it("cancels red with green, orange with blue and yellow with violet", () => {
    expect(colors(2)).toEqual(["green"]);
    expect(colors(6)).toEqual(["blue"]);
    expect(colors(9)).toEqual(["violet"]);
    expect(colors(10)).toEqual(["violet"]);
  });

  it("blends the neutralizer for a blended background, dominant color first", () => {
    expect(getNeutralizer("red-orange")).toEqual([
      { color: "green", share: 0.75 },
      { color: "blue", share: 0.25 },
    ]);
    expect(colors(5)).toEqual(["blue", "green"]);
    expect(getNeutralizer("orange-yellow")).toEqual([
      { color: "blue", share: 0.75 },
      { color: "violet", share: 0.25 },
    ]);
    expect(getNeutralizer("yellow-orange")).toEqual([
      { color: "blue", share: 0.5 },
      { color: "violet", share: 0.5 },
    ]);
  });

  it("always adds up to a whole", () => {
    for (let level = 1; level <= 12; level++) {
      const total = getNeutralizer(getUnderlyingPigment(level as Level)).reduce((sum, part) => sum + part.share, 0);
      expect(total).toBeCloseTo(1);
    }
  });
});

describe("assessNeutralization", () => {
  it("needs no corrector when the shade's own tone cancels the whole background", () => {
    // level 6 is orange; ash is blue
    expect(assessNeutralization({ tone: "ash" }, 6)).toEqual({ background: "orange", coverage: "full", missing: [] });
    // level 9 is yellow; violet
    expect(assessNeutralization({ tone: "violet" }, 9).coverage).toBe("full");
    // pearl brings both blue and violet
    expect(assessNeutralization({ tone: "pearl" }, 8).coverage).toBe("full");
  });

  it("asks only for the part the shade does not bring", () => {
    // 8/1 lifted to level 8: yellow-orange takes blue + violet, ash brings the blue
    expect(assessNeutralization({ tone: "ash" }, 8)).toEqual({
      background: "yellow-orange",
      coverage: "partial",
      missing: [{ tone: "violet", share: 0.5 }],
    });
    expect(assessNeutralization({ tone: "violet" }, 7).missing).toEqual([{ tone: "ash", share: 0.75 }]);
  });

  it("counts the secondary tone too", () => {
    expect(assessNeutralization({ tone: "ash", secondaryTone: "violet" }, 8).coverage).toBe("full");
    expect(assessNeutralization({ tone: "gold", secondaryTone: "ash" }, 6).coverage).toBe("full");
  });

  it("asks for the whole blended corrector when the shade brings none of it", () => {
    expect(assessNeutralization({ tone: "gold" }, 8)).toEqual({
      background: "yellow-orange",
      coverage: "none",
      missing: [
        { tone: "ash", share: 0.5 },
        { tone: "violet", share: 0.5 },
      ],
    });
    expect(assessNeutralization({ tone: "natural" }, 4).missing).toEqual([
      { tone: "matt", share: 0.75 },
      { tone: "ash", share: 0.25 },
    ]);
  });

  it("does not count a neutralizing color the background does not take", () => {
    // matt (green) does nothing for a yellow background
    expect(assessNeutralization({ tone: "matt" }, 9)).toMatchObject({
      coverage: "none",
      missing: [{ tone: "violet", share: 1 }],
    });
  });
});
