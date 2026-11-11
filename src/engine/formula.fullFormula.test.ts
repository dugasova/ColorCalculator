import { describe, it, expect } from "vitest";
import { calculateFullFormula } from "./formula";
import type { Shade } from "./shades";
import type { LiftTable } from "./levels";

// Mirrors wella.ts's specialBlondeLiftTable: 10/20 vol unusable, 30 vol -> +3, 40 vol -> +5.
const specialBlondeLiftTable: LiftTable = volume => {
  switch (volume) {
    case 30:
      return 3;
    case 40:
      return 5;
    default:
      return 0;
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
  mixingRatioChoices: [
    { colorParts: 1, developerParts: 2 },
    { colorParts: 1, developerParts: 1.5 },
  ],
  developerVolumeChoices: [6, 13],
};

describe("calculateFullFormula", () => {
  it("skips pigment/warning logic entirely when not lifting (toning or darkening)", () => {
    const targetShade: Shade = { code: "5.3", level: 5, tone: "gold" };
    const result = calculateFullFormula({ startLevel: 6, targetShade, grayPercent: 10, totalGrams: 60 });

    expect(result.underlyingPigment).toBeNull();
    expect(result.recommendedCorrectiveTone).toBeNull();
    expect(result.correctorGrams).toBeNull();
    expect(result.toneWarning).toBeNull();
    expect(result.developerVolume).toBe(10); // diff <= 0 -> gentlest developer
    expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 1 });
  });

  it("splits grams from the dye weight alone when colorGramsOverride is set, ignoring totalGrams for the split but keeping corrector grams proportional to the real mix total", () => {
    const targetShade: Shade = { code: "8.1", level: 8, tone: "ash" };
    const result = calculateFullFormula({
      startLevel: 6,
      targetShade,
      grayPercent: 0,
      totalGrams: 60,
      colorGramsOverride: 40,
    });

    expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 1.5 });
    expect(result.grams).toEqual({ colorGrams: 40, developerGrams: 60 });
    expect(result.correctorGrams).not.toBeNull();
    expect(result.correctorGrams).toBe(
      calculateFullFormula({ startLevel: 6, targetShade, grayPercent: 0, totalGrams: 100 }).correctorGrams,
    );
  });

  it("has no warning when the chosen tone matches the recommended corrective tone", () => {
    // level 8 -> underlying pigment 'yellow' -> recommended corrective tone 'violet'
    const targetShade: Shade = { code: "8.2", level: 8, tone: "violet" };
    const result = calculateFullFormula({ startLevel: 6, targetShade, grayPercent: 10, totalGrams: 60 });

    expect(result.underlyingPigment).toBe("yellow");
    expect(result.recommendedCorrectiveTone).toBe("violet");
    expect(result.correctorGrams).toBe(4); // Rule of 10: (10 - level 8) * (60g / 30g) = 4g
    expect(result.toneWarning).toBeNull();
  });

  it("warns when the chosen tone does not neutralize the revealed pigment", () => {
    // level 8 -> pigment 'yellow' -> recommended 'violet', but colorist chose 'gold'
    const targetShade: Shade = { code: "8.3", level: 8, tone: "gold" };
    const result = calculateFullFormula({ startLevel: 6, targetShade, grayPercent: 10, totalGrams: 60 });

    expect(result.underlyingPigment).toBe("yellow");
    expect(result.recommendedCorrectiveTone).toBe("violet");
    expect(result.toneWarning).toEqual({ tone: "gold", pigment: "yellow", recommended: "violet" });
  });

  it("recommends the matt tone for red/red-orange pigment and warns if it was not chosen", () => {
    // level 3 -> pigment 'red-orange' -> suggestNeutralizingTone returns 'matt'
    const targetShade: Shade = { code: "3.0", level: 3, tone: "natural" };
    const result = calculateFullFormula({ startLevel: 1, targetShade, grayPercent: 10, totalGrams: 60 });

    expect(result.underlyingPigment).toBe("red-orange");
    expect(result.recommendedCorrectiveTone).toBe("matt");
    expect(result.toneWarning).toEqual({ tone: "natural", pigment: "red-orange", recommended: "matt" });
  });

  it("returns null developerVolume and null grams when the lift exceeds what any developer can achieve, but still returns other fields", () => {
    const targetShade: Shade = { code: "10.0", level: 10, tone: "natural" };
    const result = calculateFullFormula({ startLevel: 1, targetShade, grayPercent: 90, totalGrams: 60 });

    expect(result.developerVolume).toBeNull();
    expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 2 });
    expect(result.grayCoverage.naturalRatio).toBeCloseTo(0.5);
    expect(result.grams).toBeNull();
  });

  it("passes grayPercent straight through to getGrayCoverageStrategy", () => {
    const targetShade: Shade = { code: "7.1", level: 7, tone: "ash" };
    const result = calculateFullFormula({ startLevel: 7, targetShade, grayPercent: 65, totalGrams: 60 });

    expect(result.grayCoverage).toEqual({
      naturalRatio: 0.5,
      fashionRatio: 0.5,
    });
  });

  it("threads recommendedProcessingMinutes through: demi-permanent lines get 20 min regardless of gray, permanent gets 30/45 by gray threshold", () => {
    const permanentShade: Shade = { code: "7.1", level: 7, tone: "ash" };
    expect(
      calculateFullFormula({ startLevel: 7, targetShade: permanentShade, grayPercent: 20, totalGrams: 60 })
        .recommendedProcessingMinutes,
    ).toBe(30);
    expect(
      calculateFullFormula({ startLevel: 7, targetShade: permanentShade, grayPercent: 60, totalGrams: 60 })
        .recommendedProcessingMinutes,
    ).toBe(45);
    expect(
      calculateFullFormula({
        startLevel: 6,
        targetShade: colorTouchShade,
        grayPercent: 90,
        totalGrams: 60,
        manualDeveloperVolume: 13,
      }).recommendedProcessingMinutes,
    ).toBe(20);
  });

  it("a shade's own fixedProcessingMinutes overrides the gray-percent-based default outright", () => {
    // Special Blonde calls for 50-60 min without heat regardless of gray coverage --
    // neither the low- nor high-gray branch of the default 30/45 ladder should apply.
    expect(
      calculateFullFormula({ startLevel: 6, targetShade: specialBlondeShade, grayPercent: 0, totalGrams: 60 })
        .recommendedProcessingMinutes,
    ).toBe(55);
    expect(
      calculateFullFormula({ startLevel: 6, targetShade: specialBlondeShade, grayPercent: 90, totalGrams: 60 })
        .recommendedProcessingMinutes,
    ).toBe(55);
  });

  it("splits totalGrams according to the computed mixing ratio", () => {
    // diff = 2 -> ratio 1:1.5
    const targetShade: Shade = { code: "8.1", level: 8, tone: "ash" };
    const result = calculateFullFormula({ startLevel: 6, targetShade, grayPercent: 0, totalGrams: 60 });

    expect(result.grams).toEqual({ colorGrams: 24, developerGrams: 36 });
  });

  it("uses fixedMixingRatio instead of the diff-based strategy when the shade sets one", () => {
    // start 10 -> diff = 2, which the default strategy would mix 1:1.5 -- fixedMixingRatio overrides that to 1:2
    const result = calculateFullFormula({
      startLevel: 10,
      targetShade: specialBlondeShade,
      grayPercent: 0,
      totalGrams: 60,
    });

    expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 2 });
  });

  it("uses the shade developerLiftTable instead of the default ladder to pick developer volume", () => {
    // start 9 -> diff = 3. Default maxLiftForDeveloper only reaches 3 at 40 vol, but
    // specialBlondeLiftTable reaches +3 already at 30 vol, so 30 should be picked first.
    const result = calculateFullFormula({
      startLevel: 9,
      targetShade: specialBlondeShade,
      grayPercent: 0,
      totalGrams: 60,
    });

    expect(result.developerVolume).toBe(30);
  });

  it("sets eligibilityWarning mentioning the shade and required level when startLevel is below minStartLevel", () => {
    const result = calculateFullFormula({
      startLevel: 5,
      targetShade: specialBlondeShade,
      grayPercent: 0,
      totalGrams: 60,
    });

    expect(result.eligibilityWarning).toEqual({ code: "12/0", minLevel: 6, startLevel: 5 });
  });

  it("leaves eligibilityWarning null when startLevel meets minStartLevel", () => {
    const result = calculateFullFormula({
      startLevel: 6,
      targetShade: specialBlondeShade,
      grayPercent: 0,
      totalGrams: 60,
    });

    expect(result.eligibilityWarning).toBeNull();
  });

  it("leaves eligibilityWarning null for shades without a minStartLevel", () => {
    const targetShade: Shade = { code: "5.3", level: 5, tone: "gold" };
    const result = calculateFullFormula({ startLevel: 1, targetShade, grayPercent: 0, totalGrams: 60 });

    expect(result.eligibilityWarning).toBeNull();
  });

  it("can be eligible by minStartLevel yet still unreachable by any developer in one process", () => {
    // start 6 meets minStartLevel, but diff = 6 exceeds specialBlondeLiftTable's max of +5 at 40 vol
    const result = calculateFullFormula({
      startLevel: 6,
      targetShade: specialBlondeShade,
      grayPercent: 0,
      totalGrams: 60,
    });

    expect(result.eligibilityWarning).toBeNull();
    expect(result.developerVolume).toBeNull();
  });

  it("warns that a manual-choice shade can't lift, yet still mixes with the developer the colorist picked", () => {
    // colorTouchShade is level 8, only deposits (developerVolumeChoices set) -- start 6 would need +2 levels
    const result = calculateFullFormula({
      startLevel: 6,
      targetShade: colorTouchShade,
      grayPercent: 0,
      totalGrams: 60,
      manualDeveloperVolume: 6,
    });

    expect(result.liftUnsupportedWarning).toEqual({ code: "8/73", level: 8, startLevel: 6 });
    expect(result.developerVolume).toBe(6);
    expect(result.grams).not.toBeNull();
    // it can't lift, so the hair stays at the starting level instead of reaching 8
    expect(result.achievedLevel).toBe(6);
    // and no pigment is actually revealed, since nothing was lifted
    expect(result.underlyingPigment).toBeNull();
    expect(result.recommendedCorrectiveTone).toBeNull();
    expect(result.toneWarning).toBeNull();
  });

  it("records whichever developer the colorist picked for a lift the line can't do", () => {
    expect(
      calculateFullFormula({
        startLevel: 6,
        targetShade: colorTouchShade,
        grayPercent: 0,
        totalGrams: 60,
        manualDeveloperVolume: 13,
      }).developerVolume,
    ).toBe(13);
  });

  it("still has no developer or grams for a lift the line can't do when no developer was picked", () => {
    const result = calculateFullFormula({
      startLevel: 6,
      targetShade: colorTouchShade,
      grayPercent: 0,
      totalGrams: 60,
    });

    expect(result.liftUnsupportedWarning).not.toBeNull();
    expect(result.developerVolume).toBeNull();
    expect(result.grams).toBeNull();
    expect(result.achievedLevel).toBeNull();
  });

  it("leaves liftUnsupportedWarning null and computes normally when a manual-choice shade only deposits (no lift needed)", () => {
    const result = calculateFullFormula({
      startLevel: 8,
      targetShade: colorTouchShade,
      grayPercent: 0,
      totalGrams: 60,
      manualDeveloperVolume: 13,
    });

    expect(result.liftUnsupportedWarning).toBeNull();
    expect(result.developerVolume).toBe(13);
    expect(result.grams).toEqual({ colorGrams: 20, developerGrams: 40 });
  });

  describe("manual mixing ratio for a demi-permanent shade", () => {
    it("keeps the shade's standard 1:2 when the colorist picks nothing", () => {
      const result = calculateFullFormula({
        startLevel: 8,
        targetShade: colorTouchShade,
        grayPercent: 0,
        totalGrams: 60,
        manualDeveloperVolume: 6,
      });

      expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 2 });
      expect(result.grams).toEqual({ colorGrams: 20, developerGrams: 40 });
    });

    it("mixes 1:1.5 and recalculates the developer amount when the colorist picks it", () => {
      const result = calculateFullFormula({
        startLevel: 8,
        targetShade: colorTouchShade,
        grayPercent: 0,
        totalGrams: 60,
        manualDeveloperVolume: 6,
        manualMixingRatio: {
          colorParts: 1,
          developerParts: 1.5,
        },
      });

      expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 1.5 });
      expect(result.grams?.colorGrams).toBeCloseTo(24);
      expect(result.grams?.developerGrams).toBeCloseTo(36);
    });

    it("also applies to a can't-lift formula the colorist mixes anyway", () => {
      const result = calculateFullFormula({
        startLevel: 6,
        targetShade: colorTouchShade,
        grayPercent: 0,
        totalGrams: 60,
        manualDeveloperVolume: 6,
        manualMixingRatio: {
          colorParts: 1,
          developerParts: 1.5,
        },
      });

      expect(result.liftUnsupportedWarning).not.toBeNull();
      expect(result.grams?.developerGrams).toBeCloseTo(36);
    });

    it("ignores a ratio the shade doesn't offer, so an unlisted value can never slip into a formula", () => {
      const result = calculateFullFormula({
        startLevel: 8,
        targetShade: colorTouchShade,
        grayPercent: 0,
        totalGrams: 60,
        manualDeveloperVolume: 6,
        manualMixingRatio: {
          colorParts: 1,
          developerParts: 3,
        },
      });

      expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 2 });
    });

    it("ignores a manual ratio for a shade with no ratio choices at all", () => {
      const targetShade: Shade = { code: "7.1", level: 7, tone: "ash" };
      const result = calculateFullFormula({
        startLevel: 7,
        targetShade,
        grayPercent: 0,
        totalGrams: 60,
        manualMixingRatio: {
          colorParts: 1,
          developerParts: 1.5,
        },
      });

      expect(result.mixingRatio).toEqual({ colorParts: 1, developerParts: 1 });
    });
  });

  it("leaves liftUnsupportedWarning null for shades without developerVolumeChoices even when lifting", () => {
    const targetShade: Shade = { code: "8.0", level: 8, tone: "natural" };
    const result = calculateFullFormula({ startLevel: 6, targetShade, grayPercent: 0, totalGrams: 60 });

    expect(result.liftUnsupportedWarning).toBeNull();
  });

  describe("gray-coverage developer-volume floor", () => {
    it("raises the gentlest no-lift developer (10 vol) to 20 vol once gray coverage reaches the 30% threshold", () => {
      const targetShade: Shade = { code: "7.1", level: 7, tone: "ash" };
      const result = calculateFullFormula({ startLevel: 7, targetShade, grayPercent: 30, totalGrams: 60 });

      expect(result.developerVolume).toBe(20);
    });

    it("leaves the gentlest developer alone just below the threshold", () => {
      const targetShade: Shade = { code: "7.1", level: 7, tone: "ash" };
      const result = calculateFullFormula({ startLevel: 7, targetShade, grayPercent: 29, totalGrams: 60 });

      expect(result.developerVolume).toBe(10);
    });

    it("applies the same floor when depositing darker, not just at the same level", () => {
      const targetShade: Shade = { code: "5.1", level: 5, tone: "ash" };
      const result = calculateFullFormula({ startLevel: 8, targetShade, grayPercent: 40, totalGrams: 60 });

      expect(result.developerVolume).toBe(20);
    });

    it("is a no-op once the level-lift itself already calls for 20 vol or higher", () => {
      // start 6 -> target 8 needs a 2-level lift, which the default ladder already mixes at 30 vol.
      const targetShade: Shade = { code: "8.1", level: 8, tone: "ash" };
      const result = calculateFullFormula({ startLevel: 6, targetShade, grayPercent: 90, totalGrams: 60 });

      expect(result.developerVolume).toBe(30);
    });

    it("never applies to a manual-choice (demi-permanent) shade, even with heavy gray", () => {
      // colorTouchShade only offers 6/13 vol -- the permanent-line gray floor must not
      // override the colorist's own manual choice with an unsupported volume.
      const result = calculateFullFormula({
        startLevel: 8,
        targetShade: colorTouchShade,
        grayPercent: 90,
        totalGrams: 60,
        manualDeveloperVolume: 6,
      });

      expect(result.developerVolume).toBe(6);
    });
  });

  describe("shade-level noLiftDeveloperVolume override", () => {
    it("uses the shade's own no-lift volume instead of the generic 10 vol default", () => {
      const targetShade: Shade = { code: "7.1", level: 7, tone: "ash", noLiftDeveloperVolume: 13 };
      const result = calculateFullFormula({ startLevel: 7, targetShade, grayPercent: 0, totalGrams: 60 });

      expect(result.developerVolume).toBe(13);
    });

    it("also applies when depositing darker, not just at the same level", () => {
      const targetShade: Shade = { code: "5.1", level: 5, tone: "ash", noLiftDeveloperVolume: 13 };
      const result = calculateFullFormula({ startLevel: 8, targetShade, grayPercent: 0, totalGrams: 60 });

      expect(result.developerVolume).toBe(13);
    });

    it("yields to the gray-coverage floor once gray coverage reaches the 30% threshold", () => {
      const targetShade: Shade = { code: "7.1", level: 7, tone: "ash", noLiftDeveloperVolume: 13 };
      const result = calculateFullFormula({ startLevel: 7, targetShade, grayPercent: 30, totalGrams: 60 });

      expect(result.developerVolume).toBe(20);
    });

    it("has no effect once any lift is needed -- the level-diff ladder already exceeds it", () => {
      const targetShade: Shade = { code: "8.1", level: 8, tone: "ash", noLiftDeveloperVolume: 13 };
      const result = calculateFullFormula({ startLevel: 7, targetShade, grayPercent: 0, totalGrams: 60 });

      expect(result.developerVolume).toBe(20);
    });

    it("never applies to a manual-choice (demi-permanent) shade", () => {
      const result = calculateFullFormula({
        startLevel: 8,
        targetShade: colorTouchShade,
        grayPercent: 0,
        totalGrams: 60,
        manualDeveloperVolume: 6,
      });

      expect(result.developerVolume).toBe(6);
    });
  });

  describe("acceptsPartialLift maximum-lift fallback", () => {
    it("leaves a non-opted-in shade blocked exactly as before -- specialBlondeShade has no acceptsPartialLift", () => {
      // start 6 -> diff 6 exceeds even 40 vol's +5 max lift; without opting in, this stays
      // an outright refusal (see the eligibility test above), not a best-effort fallback.
      const result = calculateFullFormula({
        startLevel: 6,
        targetShade: specialBlondeShade,
        grayPercent: 0,
        totalGrams: 60,
      });

      expect(result.developerVolume).toBeNull();
      expect(result.achievedLevel).toBeNull();
      expect(result.grams).toBeNull();
    });

    it("falls back to the strongest developer and reports the level actually reached when the nominal target is out of reach", () => {
      // start 6 -> target 12 needs +6, beyond specialBlondeLiftTable's +5 ceiling at 40 vol.
      // Falls back to 40 vol (12%) and reaches level 11 (6 + 5), not the nominal 12.
      const result = calculateFullFormula({
        startLevel: 6,
        targetShade: partialLiftSpecialBlondeShade,
        grayPercent: 0,
        totalGrams: 60,
      });

      expect(result.developerVolume).toBe(40);
      expect(result.achievedLevel).toBe(11);
      expect(result.grams).not.toBeNull();
    });

    it("computes underlying pigment, corrective tone, and corrector grams from the achieved level, not the shade's nominal level", () => {
      // start 3 -> achievedLevel 8 (3 + 5), whose own underlying pigment ('yellow') differs
      // from level 12's ('very-light-yellow') -- the corrective tone/grams must track it.
      const result = calculateFullFormula({
        startLevel: 3,
        targetShade: partialLiftSpecialBlondeShade,
        grayPercent: 0,
        totalGrams: 60,
      });

      expect(result.achievedLevel).toBe(8);
      expect(result.underlyingPigment).toBe("yellow");
      expect(result.correctorGrams).not.toBeNull();
    });

    it("does not engage when the nominal target is already fully reachable -- achievedLevel matches the shade's own level", () => {
      // start 9 -> diff 3, reachable at 30 vol without any fallback.
      const result = calculateFullFormula({
        startLevel: 9,
        targetShade: partialLiftSpecialBlondeShade,
        grayPercent: 0,
        totalGrams: 60,
      });

      expect(result.developerVolume).toBe(30);
      expect(result.achievedLevel).toBe(12);
    });

    it("has no effect on shades without their own developerLiftTable, even if opted in", () => {
      const targetShade: Shade = { code: "12.0", level: 12, tone: "natural", acceptsPartialLift: true };
      const result = calculateFullFormula({ startLevel: 1, targetShade, grayPercent: 0, totalGrams: 60 });

      // No developerLiftTable to fall back within -- stays on the default ladder (max +3
      // at 40 vol), which can't reach a +11 lift either, so this is still unreachable.
      expect(result.developerVolume).toBeNull();
      expect(result.achievedLevel).toBeNull();
    });
  });
});

describe("calculateFullFormula: porosity", () => {
  const shade = (level: Shade["level"]): Shade => ({ code: `${level}.1`, level, tone: "ash" });
  const formula = (overrides: Partial<Parameters<typeof calculateFullFormula>[0]>) =>
    calculateFullFormula({ startLevel: 6, targetShade: shade(8), grayPercent: 0, totalGrams: 60, ...overrides });

  it("leaves the formula untouched for normal porosity, and by default", () => {
    expect(formula({ porosity: "normal" })).toEqual(formula({}));
    expect(formula({}).porosityAdjustment).toBeNull();
  });

  it.each([
    { lift: 1, target: 7, from: 20, to: 10 },
    { lift: 2, target: 8, from: 30, to: 20 },
    { lift: 3, target: 9, from: 40, to: 30 },
  ] as const)("high porosity lowers a $lift-level lift from $from vol to $to vol", ({ target, from, to }) => {
    expect(formula({ targetShade: shade(target) }).developerVolume).toBe(from);
    const result = formula({ targetShade: shade(target), porosity: "high" });
    expect(result.developerVolume).toBe(to);
    expect(result.porosityAdjustment).toEqual({ kind: "developer-lowered", fromDeveloperVolume: from });
  });

  it("high porosity still counts the target as reached, with the same time and corrective guidance", () => {
    const normal = formula({});
    const high = formula({ porosity: "high" });
    expect(high.achievedLevel).toBe(8);
    expect(high.recommendedProcessingMinutes).toBe(normal.recommendedProcessingMinutes);
    expect(high.underlyingPigment).toBe(normal.underlyingPigment);
    expect(high.grams).toEqual(normal.grams);
  });

  it("high porosity has nothing to lower at the gentlest developer", () => {
    const result = formula({ startLevel: 8, porosity: "high" });
    expect(result.developerVolume).toBe(10);
    expect(result.porosityAdjustment).toBeNull();
  });

  it("gray coverage wins over high porosity: never below 20 vol from 30% gray", () => {
    // No lift: the gray floor raises 10 -> 20 vol, and porosity must not undo it.
    const noLift = formula({ startLevel: 8, grayPercent: 40, porosity: "high" });
    expect(noLift.developerVolume).toBe(20);
    expect(noLift.porosityAdjustment).toBeNull();
    // 2-level lift: 30 vol may still drop to 20, which satisfies the floor.
    const lifting = formula({ grayPercent: 40, porosity: "high" });
    expect(lifting.developerVolume).toBe(20);
    expect(lifting.porosityAdjustment).toEqual({ kind: "developer-lowered", fromDeveloperVolume: 30 });
    // Under 30% gray there is no floor.
    expect(formula({ targetShade: shade(7), grayPercent: 20, porosity: "high" }).developerVolume).toBe(10);
  });

  it("high porosity leaves a developer the colorist or the line fixed", () => {
    const manual = formula({
      startLevel: 8,
      targetShade: colorTouchShade,
      manualDeveloperVolume: 13,
      porosity: "high",
    });
    expect(manual.developerVolume).toBe(13);
    expect(manual.porosityAdjustment).toBeNull();

    const lineFixed: Shade = { code: "7.1", level: 7, tone: "ash", noLiftDeveloperVolume: 20 };
    const noLift = formula({ startLevel: 7, targetShade: lineFixed, porosity: "high" });
    expect(noLift.developerVolume).toBe(20);
    expect(noLift.porosityAdjustment).toBeNull();
  });

  it("high porosity changes nothing when the target is not achievable at all", () => {
    const result = formula({ startLevel: 2, targetShade: shade(9), porosity: "high" });
    expect(result.developerVolume).toBeNull();
    expect(result.porosityAdjustment).toBeNull();
  });

  it("low porosity keeps the developer and extends the recommended time by 5 minutes", () => {
    const normal = formula({});
    const low = formula({ porosity: "low" });
    expect(low.developerVolume).toBe(normal.developerVolume);
    expect(low.recommendedProcessingMinutes).toBe(normal.recommendedProcessingMinutes + 5);
    expect(low.porosityAdjustment).toEqual({ kind: "processing-extended", addedMinutes: 5 });
    // on top of the heavy-gray extension, too
    expect(formula({ grayPercent: 60, porosity: "low" }).recommendedProcessingMinutes).toBe(50);
  });

  it("low porosity leaves a manufacturer-fixed processing time alone", () => {
    const fixed: Shade = { ...shade(8), fixedProcessingMinutes: 55 };
    const result = formula({ targetShade: fixed, porosity: "low" });
    expect(result.recommendedProcessingMinutes).toBe(55);
    expect(result.porosityAdjustment).toBeNull();
  });
});
