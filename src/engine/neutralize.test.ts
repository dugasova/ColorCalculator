import { describe, it, expect } from "vitest";
import { assessNeutralization, getBackground, getNeutralizer, getToningRecommendation } from "./neutralize";
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
    // so does Wella's /9, charted as slate-grey; other brands' greys bring blue only
    expect(assessNeutralization({ tone: "slate-grey", line: "koleston-perfect" }, 8).coverage).toBe("full");
    expect(assessNeutralization({ tone: "slate-grey", line: "color-touch" }, 9).coverage).toBe("full");
    expect(assessNeutralization({ tone: "slate-grey" }, 8).coverage).toBe("partial");
    expect(assessNeutralization({ tone: "slate-grey" }, 9).coverage).toBe("none");
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

describe("Matrix's own background chart", () => {
  it("reads the European card's dark orange at level 5 as orange, on Matrix lines only", () => {
    expect(getBackground(5, "socolor")).toBe("orange");
    expect(getBackground(5, "super-sync")).toBe("orange");
    expect(getBackground(4, "socolor")).toBe("red-orange");
    expect(getBackground(7, "socolor")).toBe("orange-yellow");
    expect(getBackground(8, "socolor")).toBe("yellow-orange");
    expect(getBackground(5, "koleston-perfect")).toBe("orange-red");
    expect(getBackground(5)).toBe("orange-red");
  });

  it("uses Matrix's pigment balance, dominant color first", () => {
    expect(getNeutralizer("red-orange", "socolor")).toEqual([
      { color: "green", share: 0.5 },
      { color: "blue", share: 0.5 },
    ]);
    expect(getNeutralizer("orange-yellow", "socolor")).toEqual([
      { color: "blue", share: 0.6 },
      { color: "violet", share: 0.4 },
    ]);
    expect(getNeutralizer("yellow", "super-sync")).toEqual([
      { color: "violet", share: 0.8 },
      { color: "blue", share: 0.2 },
    ]);
    // gold (yellow-orange) at 8 keeps the generic half and half
    expect(getNeutralizer("yellow-orange", "socolor")).toEqual(getNeutralizer("yellow-orange"));
    expect(getNeutralizer("yellow")).toEqual([{ color: "violet", share: 1 }]);
    for (let level = 1; level <= 12; level++) {
      const total = getNeutralizer(getBackground(level as Level, "socolor"), "socolor").reduce(
        (sum, part) => sum + part.share,
        0,
      );
      expect(total).toBeCloseTo(1);
    }
  });

  it("assesses SoColor ash, ash-violet and pearl shades by that chart", () => {
    // 5A and 6A on orange: the blue alone is enough
    expect(assessNeutralization({ tone: "ash", line: "socolor" }, 5).coverage).toBe("full");
    expect(assessNeutralization({ tone: "ash", line: "socolor" }, 6).coverage).toBe("full");
    // 7A on light orange: the blue is there, the violet 40% is not
    expect(assessNeutralization({ tone: "ash", line: "socolor" }, 7)).toEqual({
      background: "orange-yellow",
      coverage: "partial",
      missing: [{ tone: "violet", share: 0.4 }],
    });
    // 9A cannot handle a yellow background alone (colorist): violet 80% is missing
    expect(assessNeutralization({ tone: "ash", line: "socolor" }, 9).missing).toEqual([{ tone: "violet", share: 0.8 }]);
    expect(assessNeutralization({ tone: "ash", secondaryTone: "violet", line: "socolor" }, 8).coverage).toBe("full");
    expect(assessNeutralization({ tone: "pearl", line: "socolor" }, 10).coverage).toBe("full");
    // red-orange at 4: green and blue half and half
    expect(assessNeutralization({ tone: "natural", line: "socolor" }, 4).missing).toEqual([
      { tone: "matt", share: 0.5 },
      { tone: "ash", share: 0.5 },
    ]);
  });

  it("leaves out a neutralizer part too small to dose", () => {
    // pale yellow is violet 90% + blue 10%: the 10% is not asked of 10V
    expect(assessNeutralization({ tone: "violet", line: "super-sync" }, 10).coverage).toBe("full");
    expect(assessNeutralization({ tone: "natural", line: "super-sync" }, 10).missing).toEqual([
      { tone: "violet", share: 0.9 },
    ]);
    // ...but blue 20% at level 9 is
    expect(assessNeutralization({ tone: "violet", line: "super-sync" }, 9).missing).toEqual([
      { tone: "ash", share: 0.2 },
    ]);
  });

  it("does not count Matrix's Titanium as a neutralizer", () => {
    expect(assessNeutralization({ tone: "slate-grey", line: "super-sync" }, 6)).toEqual({
      background: "orange",
      coverage: "none",
      missing: [{ tone: "ash", share: 1 }],
    });
    // other brands' greys stay blue
    expect(assessNeutralization({ tone: "slate-grey", line: "shades-eq" }, 6).coverage).toBe("full");
    expect(assessNeutralization({ tone: "slate-grey" }, 6).coverage).toBe("full");
  });

  it("tones Matrix toner after bleach by its own chart", () => {
    expect(getToningRecommendation(5, "socolor")).toEqual({ background: "orange", tones: ["ash"] });
    expect(getToningRecommendation(9, "super-sync")).toEqual({ background: "yellow", tones: ["violet", "ash"] });
    expect(getToningRecommendation(9)).toEqual({ background: "yellow", tones: ["violet"] });
  });
});
