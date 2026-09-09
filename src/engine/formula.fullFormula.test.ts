import { describe, it, expect } from "vitest";
import { calculateFullFormula } from "./formula";
import type { Shade } from "./shades";
import type { LiftTable } from "./levels";

// Mirrors wella.ts's specialBlondeLiftTable: 10/20 vol unusable, 30 vol -> +3, 40 vol -> +5.
const specialBlondeLiftTable: LiftTable = (volume) => {
  switch (volume) {
    case 30: return 3;
    case 40: return 5;
    default: return 0;
  }
};

const specialBlondeShade: Shade = {
  code: "12/0",
  level: 12,
  tone: "natural",
  fixedMixingRatio: { colorParts: 1, developerParts: 2 },
  minStartLevel: 6,
  developerLiftTable: specialBlondeLiftTable,
  fixedProcessingMinutes: 55,
};

const partialLiftSpecialBlondeShade: Shade = { ...specialBlondeShade, acceptsPartialLift: true };

const colorTouchShade: Shade = {
  code: "8/73",
  level: 8,
  tone: "chocolate",
  secondaryTone: "gold",
  fixedMixingRatio: { colorParts: 1, developerParts: 2 },
  developerVolumeChoices: [6, 13],
};

describe("calculateFullFormula", () => {
  it("skips pigment/warning logic entirely when not lifting (toning or darkening)", () => {
    const targetShade: Shade = { code: "5.3", level: 5, tone: "gold" };
    const result = calculateFullFormula(6, targetShade, 10, 60);

    expect(result.underlyingPigment).toBeNull();
    expect(result.recommendedCorrectiveTone).toBeNull();
    expect(result.correctorGrams).toBeNull();
    expect(result.toneWarning).toBeNull();
    expect(result.developerVolume).toBe(10); // diff <= 0 -> gentlest developer
    expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 1 });
  });

  it("has no warning when the chosen tone matches the recommended corrective tone", () => {
    // level 8 -> underlying pigment 'yellow' -> recommended corrective tone 'violet'
    const targetShade: Shade = { code: "8.2", level: 8, tone: "violet" };
    const result = calculateFullFormula(6, targetShade, 10, 60);

    expect(result.underlyingPigment).toBe("yellow");
    expect(result.recommendedCorrectiveTone).toBe("violet");
    expect(result.correctorGrams).toBe(4); // Rule of 10: (10 - level 8) * (60g / 30g) = 4g
    expect(result.toneWarning).toBeNull();
  });

  it("warns when the chosen tone does not neutralize the revealed pigment", () => {
    // level 8 -> pigment 'yellow' -> recommended 'violet', but colorist chose 'gold'
    const targetShade: Shade = { code: "8.3", level: 8, tone: "gold" };
    const result = calculateFullFormula(6, targetShade, 10, 60);

    expect(result.underlyingPigment).toBe("yellow");
    expect(result.recommendedCorrectiveTone).toBe("violet");
    expect(result.toneWarning).toContain("gold");
    expect(result.toneWarning).toContain("violet");
  });

  it("recommends the matt tone for red/red-orange pigment and warns if it was not chosen", () => {
    // level 3 -> pigment 'red-orange' -> suggestNeutralizingTone returns 'matt'
    const targetShade: Shade = { code: "3.0", level: 3, tone: "natural" };
    const result = calculateFullFormula(1, targetShade, 10, 60);

    expect(result.underlyingPigment).toBe("red-orange");
    expect(result.recommendedCorrectiveTone).toBe("matt");
    expect(result.toneWarning).toContain("matt");
  });

  it("returns null developerVolume and null grams when the lift exceeds what any developer can achieve, but still returns other fields", () => {
    const targetShade: Shade = { code: "10.0", level: 10, tone: "natural" };
    const result = calculateFullFormula(1, targetShade, 90, 60);

    expect(result.developerVolume).toBeNull();
    expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 2 });
    expect(result.grayCoverage.naturalRatio).toBeCloseTo(0.5);
    expect(result.grams).toBeNull();
  });

  it("passes grayPercent straight through to getGrayCoverageStrategy", () => {
    const targetShade: Shade = { code: "7.1", level: 7, tone: "ash" };
    const result = calculateFullFormula(7, targetShade, 65, 60);

    expect(result.grayCoverage).toEqual({ naturalRatio: 0.5, fashionRatio: 0.5, note: "equal parts natural base and fashion tone" });
  });

  it("threads recommendedProcessingMinutes through: demi-permanent lines get 20 min regardless of gray, permanent gets 30/45 by gray threshold", () => {
    const permanentShade: Shade = { code: "7.1", level: 7, tone: "ash" };
    expect(calculateFullFormula(7, permanentShade, 20, 60).recommendedProcessingMinutes).toBe(30);
    expect(calculateFullFormula(7, permanentShade, 60, 60).recommendedProcessingMinutes).toBe(45);
    expect(calculateFullFormula(6, colorTouchShade, 90, 60, undefined, 13).recommendedProcessingMinutes).toBe(20);
  });

  it("a shade's own fixedProcessingMinutes overrides the gray-percent-based default outright", () => {
    // Special Blonde calls for 50-60 min without heat regardless of gray coverage --
    // neither the low- nor high-gray branch of the default 30/45 ladder should apply.
    expect(calculateFullFormula(6, specialBlondeShade, 0, 60).recommendedProcessingMinutes).toBe(55);
    expect(calculateFullFormula(6, specialBlondeShade, 90, 60).recommendedProcessingMinutes).toBe(55);
  });

  it("splits totalGrams according to the computed mixing ratio", () => {
    // diff = 2 -> ratio 1:1.5
    const targetShade: Shade = { code: "8.1", level: 8, tone: "ash" };
    const result = calculateFullFormula(6, targetShade, 0, 60);

    expect(result.grams).toEqual({ colorGrams: 24, developerGrams: 36 });
  });

  it("uses fixedMixingRatio instead of the diff-based strategy when the shade sets one", () => {
    // start 10 -> diff = 2, which the default strategy would mix 1:1.5 -- fixedMixingRatio overrides that to 1:2
    const result = calculateFullFormula(10, specialBlondeShade, 0, 60);

    expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 2 });
  });

  it("uses the shade developerLiftTable instead of the default ladder to pick developer volume", () => {
    // start 9 -> diff = 3. Default maxLiftForDeveloper only reaches 3 at 40 vol, but
    // specialBlondeLiftTable reaches +3 already at 30 vol, so 30 should be picked first.
    const result = calculateFullFormula(9, specialBlondeShade, 0, 60);

    expect(result.developerVolume).toBe(30);
  });

  it("sets eligibilityWarning mentioning the shade and required level when startLevel is below minStartLevel", () => {
    const result = calculateFullFormula(5, specialBlondeShade, 0, 60);

    expect(result.eligibilityWarning).toContain("12/0");
    expect(result.eligibilityWarning).toContain("6");
  });

  it("leaves eligibilityWarning null when startLevel meets minStartLevel", () => {
    const result = calculateFullFormula(6, specialBlondeShade, 0, 60);

    expect(result.eligibilityWarning).toBeNull();
  });

  it("leaves eligibilityWarning null for shades without a minStartLevel", () => {
    const targetShade: Shade = { code: "5.3", level: 5, tone: "gold" };
    const result = calculateFullFormula(1, targetShade, 0, 60);

    expect(result.eligibilityWarning).toBeNull();
  });

  it("can be eligible by minStartLevel yet still unreachable by any developer in one process", () => {
    // start 6 meets minStartLevel, but diff = 6 exceeds specialBlondeLiftTable's max of +5 at 40 vol
    const result = calculateFullFormula(6, specialBlondeShade, 0, 60);

    expect(result.eligibilityWarning).toBeNull();
    expect(result.developerVolume).toBeNull();
  });

  it("sets liftUnsupportedWarning and nulls out developerVolume/grams when a manual-choice shade would need to lift", () => {
    // colorTouchShade is level 8, only deposits (developerVolumeChoices set) -- start 6 would need +2 levels
    const result = calculateFullFormula(6, colorTouchShade, 0, 60, undefined, 6);

    expect(result.liftUnsupportedWarning).toContain("8/73");
    expect(result.developerVolume).toBeNull();
    expect(result.grams).toBeNull();
    // no pigment is actually revealed since the line can't lift in the first place
    expect(result.underlyingPigment).toBeNull();
    expect(result.recommendedCorrectiveTone).toBeNull();
    expect(result.toneWarning).toBeNull();
  });

  it("leaves liftUnsupportedWarning null and computes normally when a manual-choice shade only deposits (no lift needed)", () => {
    const result = calculateFullFormula(8, colorTouchShade, 0, 60, undefined, 13);

    expect(result.liftUnsupportedWarning).toBeNull();
    expect(result.developerVolume).toBe(13);
    expect(result.grams).toEqual({ colorGrams: 20, developerGrams: 40 });
  });

  it("leaves liftUnsupportedWarning null for shades without developerVolumeChoices even when lifting", () => {
    const targetShade: Shade = { code: "8.0", level: 8, tone: "natural" };
    const result = calculateFullFormula(6, targetShade, 0, 60);

    expect(result.liftUnsupportedWarning).toBeNull();
  });

  describe("gray-coverage developer-volume floor", () => {
    it("raises the gentlest no-lift developer (10 vol) to 20 vol once gray coverage reaches the 30% threshold", () => {
      const targetShade: Shade = { code: "7.1", level: 7, tone: "ash" };
      const result = calculateFullFormula(7, targetShade, 30, 60);

      expect(result.developerVolume).toBe(20);
    });

    it("leaves the gentlest developer alone just below the threshold", () => {
      const targetShade: Shade = { code: "7.1", level: 7, tone: "ash" };
      const result = calculateFullFormula(7, targetShade, 29, 60);

      expect(result.developerVolume).toBe(10);
    });

    it("applies the same floor when depositing darker, not just at the same level", () => {
      const targetShade: Shade = { code: "5.1", level: 5, tone: "ash" };
      const result = calculateFullFormula(8, targetShade, 40, 60);

      expect(result.developerVolume).toBe(20);
    });

    it("is a no-op once the level-lift itself already calls for 20 vol or higher", () => {
      // start 6 -> target 8 needs a 2-level lift, which the default ladder already mixes at 30 vol.
      const targetShade: Shade = { code: "8.1", level: 8, tone: "ash" };
      const result = calculateFullFormula(6, targetShade, 90, 60);

      expect(result.developerVolume).toBe(30);
    });

    it("never applies to a manual-choice (demi-permanent) shade, even with heavy gray", () => {
      // colorTouchShade only offers 6/13 vol -- the permanent-line gray floor must not
      // override the colorist's own manual choice with an unsupported volume.
      const result = calculateFullFormula(8, colorTouchShade, 90, 60, undefined, 6);

      expect(result.developerVolume).toBe(6);
    });
  });

  describe("shade-level noLiftDeveloperVolume override", () => {
    it("uses the shade's own no-lift volume instead of the generic 10 vol default", () => {
      const targetShade: Shade = { code: "7.1", level: 7, tone: "ash", noLiftDeveloperVolume: 13 };
      const result = calculateFullFormula(7, targetShade, 0, 60);

      expect(result.developerVolume).toBe(13);
    });

    it("also applies when depositing darker, not just at the same level", () => {
      const targetShade: Shade = { code: "5.1", level: 5, tone: "ash", noLiftDeveloperVolume: 13 };
      const result = calculateFullFormula(8, targetShade, 0, 60);

      expect(result.developerVolume).toBe(13);
    });

    it("yields to the gray-coverage floor once gray coverage reaches the 30% threshold", () => {
      const targetShade: Shade = { code: "7.1", level: 7, tone: "ash", noLiftDeveloperVolume: 13 };
      const result = calculateFullFormula(7, targetShade, 30, 60);

      expect(result.developerVolume).toBe(20);
    });

    it("has no effect once any lift is needed -- the level-diff ladder already exceeds it", () => {
      const targetShade: Shade = { code: "8.1", level: 8, tone: "ash", noLiftDeveloperVolume: 13 };
      const result = calculateFullFormula(7, targetShade, 0, 60);

      expect(result.developerVolume).toBe(20);
    });

    it("never applies to a manual-choice (demi-permanent) shade", () => {
      const result = calculateFullFormula(8, colorTouchShade, 0, 60, undefined, 6);

      expect(result.developerVolume).toBe(6);
    });
  });

  describe("acceptsPartialLift maximum-lift fallback", () => {
    it("leaves a non-opted-in shade blocked exactly as before -- specialBlondeShade has no acceptsPartialLift", () => {
      // start 6 -> diff 6 exceeds even 40 vol's +5 max lift; without opting in, this stays
      // an outright refusal (see the eligibility test above), not a best-effort fallback.
      const result = calculateFullFormula(6, specialBlondeShade, 0, 60);

      expect(result.developerVolume).toBeNull();
      expect(result.achievedLevel).toBeNull();
      expect(result.grams).toBeNull();
    });

    it("falls back to the strongest developer and reports the level actually reached when the nominal target is out of reach", () => {
      // start 6 -> target 12 needs +6, beyond specialBlondeLiftTable's +5 ceiling at 40 vol.
      // Falls back to 40 vol (12%) and reaches level 11 (6 + 5), not the nominal 12.
      const result = calculateFullFormula(6, partialLiftSpecialBlondeShade, 0, 60);

      expect(result.developerVolume).toBe(40);
      expect(result.achievedLevel).toBe(11);
      expect(result.grams).not.toBeNull();
    });

    it("computes underlying pigment, corrective tone, and corrector grams from the achieved level, not the shade's nominal level", () => {
      // start 3 -> achievedLevel 8 (3 + 5), whose own underlying pigment ('yellow') differs
      // from level 12's ('very-light-yellow') -- the corrective tone/grams must track it.
      const result = calculateFullFormula(3, partialLiftSpecialBlondeShade, 0, 60);

      expect(result.achievedLevel).toBe(8);
      expect(result.underlyingPigment).toBe("yellow");
      expect(result.correctorGrams).not.toBeNull();
    });

    it("does not engage when the nominal target is already fully reachable -- achievedLevel matches the shade's own level", () => {
      // start 9 -> diff 3, reachable at 30 vol without any fallback.
      const result = calculateFullFormula(9, partialLiftSpecialBlondeShade, 0, 60);

      expect(result.developerVolume).toBe(30);
      expect(result.achievedLevel).toBe(12);
    });

    it("has no effect on shades without their own developerLiftTable, even if opted in", () => {
      const targetShade: Shade = { code: "12.0", level: 12, tone: "natural", acceptsPartialLift: true };
      const result = calculateFullFormula(1, targetShade, 0, 60);

      // No developerLiftTable to fall back within -- stays on the default ladder (max +3
      // at 40 vol), which can't reach a +11 lift either, so this is still unreachable.
      expect(result.developerVolume).toBeNull();
      expect(result.achievedLevel).toBeNull();
    });
  });
});
