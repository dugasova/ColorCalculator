import { describe, it, expect } from "vitest";
import type { Level } from "./levels";
import {
  getBleachLift,
  getBleachDeveloperChoices,
  pickBleachDeveloperVolume,
  planBleachSessions,
  pickBleachMixingRatio,
  calculateBleachGrams,
  getRecommendedBleachProcessingMinutes,
  calculateBleachFormula,
} from "./bleach";

describe("getBleachLift", () => {
  it("maps each developer volume to its single-session bleach lift", () => {
    expect(getBleachLift(6)).toBe(3);
    expect(getBleachLift(10)).toBe(4);
    expect(getBleachLift(13)).toBe(5);
    expect(getBleachLift(20)).toBe(6);
    expect(getBleachLift(30)).toBe(7);
    expect(getBleachLift(40)).toBe(8);
  });
});

describe("pickBleachDeveloperVolume", () => {
  it("picks the gentlest volume that reaches the requested lift", () => {
    expect(pickBleachDeveloperVolume(1, 2)).toBe(6); // needs 1, 6vol covers up to 3
    expect(pickBleachDeveloperVolume(1, 4)).toBe(6); // needs 3, exactly 6vol's max
    expect(pickBleachDeveloperVolume(1, 5)).toBe(10); // needs 4, 6vol falls short
    expect(pickBleachDeveloperVolume(1, 6)).toBe(13); // needs 5
    expect(pickBleachDeveloperVolume(1, 7)).toBe(20); // needs 6
    expect(pickBleachDeveloperVolume(1, 8)).toBe(30); // needs 7, 30vol (9%) is the scalp's ceiling
  });

  it("returns null when the target is at or below the start level", () => {
    expect(pickBleachDeveloperVolume(6, 6)).toBeNull();
    expect(pickBleachDeveloperVolume(6, 4)).toBeNull();
  });

  it("never picks 40vol (12%): it does not go on the scalp", () => {
    expect(pickBleachDeveloperVolume(1, 9)).toBeNull(); // needs 8, only 40vol would reach it
  });
});

describe("pickBleachMixingRatio", () => {
  it("always uses the standard 1:2 powder:developer mix", () => {
    expect(pickBleachMixingRatio()).toEqual({ powderParts: 1, developerParts: 2 });
  });
});

describe("calculateBleachGrams", () => {
  it("splits total grams by the given powder:developer ratio", () => {
    expect(calculateBleachGrams(90, { powderParts: 1, developerParts: 2 })).toEqual({
      powderGrams: 30,
      developerGrams: 60,
    });
  });

  it("sums back to the total amount", () => {
    const grams = calculateBleachGrams(90, { powderParts: 1, developerParts: 2 });
    expect(grams.powderGrams + grams.developerGrams).toBe(90);
  });
});

describe("getRecommendedBleachProcessingMinutes", () => {
  it("scales up with the amount of lift needed", () => {
    expect(getRecommendedBleachProcessingMinutes(6, 7)).toBe(25);
    expect(getRecommendedBleachProcessingMinutes(6, 8)).toBe(30);
    expect(getRecommendedBleachProcessingMinutes(6, 9)).toBe(35);
  });

  it("is capped at 50 minutes regardless of how much lift is requested", () => {
    expect(getRecommendedBleachProcessingMinutes(1, 8)).toBe(50);
    expect(getRecommendedBleachProcessingMinutes(1, 9)).toBe(50);
  });
});

describe("calculateBleachFormula", () => {
  it("computes a full formula for an achievable lift", () => {
    const formula = calculateBleachFormula(4, 6, 90);
    expect(formula).toEqual({
      startLevel: 4,
      targetLevel: 6,
      liftNeeded: 2,
      developerVolume: 6,
      multiStepRequired: false,
      sessions: [{ startLevel: 4, targetLevel: 6, developerVolume: 6, processingMinutes: 30 }],
      maxLiftPerSession: 3,
      manualDeveloperVolume: null,
      mixingRatio: { powderParts: 1, developerParts: 2 },
      grams: { powderGrams: 30, developerGrams: 60 },
      recommendedProcessingMinutes: 30,
      maxScalpProcessingMinutes: 50,
      checkIntervalMinMinutes: 5,
      checkIntervalMaxMinutes: 10,
    });
  });

  it("returns no-lift-needed fields when the target is at or below the start level", () => {
    const formula = calculateBleachFormula(6, 6, 90);
    expect(formula.developerVolume).toBeNull();
    expect(formula.grams).toBeNull();
    expect(formula.multiStepRequired).toBe(false);
    expect(formula.liftNeeded).toBe(0);
  });

  it("keeps a lift of up to 3 levels in one session", () => {
    const formula = calculateBleachFormula(5, 8, 90);
    expect(formula.multiStepRequired).toBe(false);
    expect(formula.sessions).toHaveLength(1);
  });

  it("plans a bigger lift over sessions and gives the first session's formula", () => {
    const formula = calculateBleachFormula(4, 10, 90);
    expect(formula.multiStepRequired).toBe(true);
    expect(formula.targetLevel).toBe(10);
    expect(formula.sessions?.map(session => [session.startLevel, session.targetLevel])).toEqual([
      [4, 7],
      [7, 10],
    ]);
    expect(formula.developerVolume).toBe(formula.sessions?.[0]?.developerVolume);
    expect(formula.grams).toEqual({ powderGrams: 30, developerGrams: 60 });
    expect(formula.recommendedProcessingMinutes).toBe(35); // 20 + 3 levels x 5
  });
});

describe("a hand-picked developer", () => {
  it("is used for every session; the 3-level split stays", () => {
    const formula = calculateBleachFormula(4, 10, 60, true, 30);
    expect(formula.manualDeveloperVolume).toBe(30);
    expect(formula.developerVolume).toBe(30);
    expect(formula.sessions?.map(session => session.developerVolume)).toEqual([30, 30]);
  });

  it("offers nothing above 9% on the scalp, and drops a 12% pick back to automatic there", () => {
    expect(getBleachDeveloperChoices(true)).toEqual([6, 10, 13, 20, 30]);
    expect(getBleachDeveloperChoices(false)).toContain(40);
    const formula = calculateBleachFormula(4, 6, 60, true, 40);
    expect(formula.manualDeveloperVolume).toBeNull();
    expect(formula.developerVolume).toBe(6);
  });

  it("off the scalp, splits by what the picked developer lifts", () => {
    // 6vol lifts 3 levels: 2 -> 10 off the scalp takes three sessions with it.
    expect(calculateBleachFormula(2, 10, 60, false, 6).sessions).toHaveLength(3);
    expect(calculateBleachFormula(2, 10, 60, false).sessions).toHaveLength(1);
  });
});

describe("planBleachSessions", () => {
  it("off the scalp, one session lifts as far as 40vol reaches", () => {
    expect(planBleachSessions(2, 10, false).map(session => session.developerVolume)).toEqual([40]);
    expect(planBleachSessions(1, 10, false)).toHaveLength(2);
  });

  it("splits evenly, bigger lifts first, at most 3 levels each", () => {
    const steps = (start: Level, target: Level) =>
      planBleachSessions(start, target).map(session => session.targetLevel - session.startLevel);
    expect(steps(6, 10)).toEqual([2, 2]);
    expect(steps(3, 10)).toEqual([3, 2, 2]);
    expect(steps(1, 10)).toEqual([3, 3, 3]);
    expect(steps(5, 7)).toEqual([2]);
    expect(steps(7, 7)).toEqual([]);
  });

  it("chains the sessions and keeps every developer within the scalp's ceiling", () => {
    const sessions = planBleachSessions(1, 10);
    expect(sessions[0]?.startLevel).toBe(1);
    expect(sessions.at(-1)?.targetLevel).toBe(10);
    sessions.slice(1).forEach((session, index) => expect(session.startLevel).toBe(sessions[index]?.targetLevel));
    sessions.forEach(session => expect(session.developerVolume).toBeLessThanOrEqual(30));
  });
});
