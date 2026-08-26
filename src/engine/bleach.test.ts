import { describe, it, expect } from 'vitest';
import {
  getBleachLift,
  pickBleachDeveloperVolume,
  pickBleachMixingRatio,
  calculateBleachGrams,
  getRecommendedBleachProcessingMinutes,
  calculateBleachFormula,
} from './bleach';

describe('getBleachLift', () => {
  it('maps each developer volume to its single-session bleach lift', () => {
    expect(getBleachLift(6)).toBe(3);
    expect(getBleachLift(10)).toBe(4);
    expect(getBleachLift(13)).toBe(5);
    expect(getBleachLift(20)).toBe(6);
    expect(getBleachLift(30)).toBe(7);
    expect(getBleachLift(40)).toBe(8);
  });
});

describe('pickBleachDeveloperVolume', () => {
  it('picks the gentlest volume that reaches the requested lift', () => {
    expect(pickBleachDeveloperVolume(1, 2)).toBe(6); // needs 1, 6vol covers up to 3
    expect(pickBleachDeveloperVolume(1, 4)).toBe(6); // needs 3, exactly 6vol's max
    expect(pickBleachDeveloperVolume(1, 5)).toBe(10); // needs 4, 6vol falls short
    expect(pickBleachDeveloperVolume(1, 6)).toBe(13); // needs 5
    expect(pickBleachDeveloperVolume(1, 7)).toBe(20); // needs 6
    expect(pickBleachDeveloperVolume(1, 8)).toBe(30); // needs 7
    expect(pickBleachDeveloperVolume(1, 9)).toBe(40); // needs 8, 40vol's max
  });

  it('returns null when the target is at or below the start level', () => {
    expect(pickBleachDeveloperVolume(6, 6)).toBeNull();
    expect(pickBleachDeveloperVolume(6, 4)).toBeNull();
  });

  it('returns null when the lift exceeds what 40vol can achieve in one session', () => {
    expect(pickBleachDeveloperVolume(1, 10)).toBeNull(); // needs 9, more than 40vol's 8
  });
});

describe('pickBleachMixingRatio', () => {
  it('always uses the standard 1:2 powder:developer mix', () => {
    expect(pickBleachMixingRatio()).toEqual({ powderParts: 1, developerParts: 2 });
  });
});

describe('calculateBleachGrams', () => {
  it('splits total grams by the given powder:developer ratio', () => {
    expect(calculateBleachGrams(90, { powderParts: 1, developerParts: 2 })).toEqual({ powderGrams: 30, developerGrams: 60 });
  });

  it('sums back to the total amount', () => {
    const grams = calculateBleachGrams(90, { powderParts: 1, developerParts: 2 });
    expect(grams.powderGrams + grams.developerGrams).toBe(90);
  });
});

describe('getRecommendedBleachProcessingMinutes', () => {
  it('scales up with the amount of lift needed', () => {
    expect(getRecommendedBleachProcessingMinutes(6, 7)).toBe(25);
    expect(getRecommendedBleachProcessingMinutes(6, 8)).toBe(30);
    expect(getRecommendedBleachProcessingMinutes(6, 9)).toBe(35);
  });

  it('is capped at 50 minutes regardless of how much lift is requested', () => {
    expect(getRecommendedBleachProcessingMinutes(1, 8)).toBe(50);
    expect(getRecommendedBleachProcessingMinutes(1, 9)).toBe(50);
  });
});

describe('calculateBleachFormula', () => {
  it('computes a full formula for an achievable lift', () => {
    const formula = calculateBleachFormula(4, 6, 90);
    expect(formula).toEqual({
      startLevel: 4,
      targetLevel: 6,
      liftNeeded: 2,
      developerVolume: 6,
      multiStepRequired: false,
      mixingRatio: { powderParts: 1, developerParts: 2 },
      grams: { powderGrams: 30, developerGrams: 60 },
      recommendedProcessingMinutes: 30,
      maxScalpProcessingMinutes: 50,
      checkIntervalMinMinutes: 5,
      checkIntervalMaxMinutes: 10,
    });
  });

  it('returns no-lift-needed fields when the target is at or below the start level', () => {
    const formula = calculateBleachFormula(6, 6, 90);
    expect(formula.developerVolume).toBeNull();
    expect(formula.grams).toBeNull();
    expect(formula.multiStepRequired).toBe(false);
    expect(formula.liftNeeded).toBe(0);
  });

  it('flags multi-step as required when the lift exceeds a single session', () => {
    const formula = calculateBleachFormula(1, 10, 90);
    expect(formula.developerVolume).toBeNull();
    expect(formula.grams).toBeNull();
    expect(formula.multiStepRequired).toBe(true);
    expect(formula.liftNeeded).toBe(9);
    expect(formula.maxScalpProcessingMinutes).toBe(50);
  });
});
