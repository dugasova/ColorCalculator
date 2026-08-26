import type { DeveloperVolume, Level } from "./levels";

// Off-the-shelf lightening powder ("bleach") behaves differently from cream
// color and is deliberately kept out of `maxLiftForDeveloper` in levels.ts,
// which models cream-color lift. Bleach lifts more aggressively per volume
// of developer than cream color does, and — unlike cream color, which can't
// lift at all below 20vol — bleach powder can already lift hair at 6/10/13vol
// too; see BLEACH_LIFT_TABLE below for the exact per-volume lift achievable
// in a single sitting. It is mixed with developer at a standard 1:2
// powder:developer ratio for on-scalp application. On-scalp bleach is capped
// at a widely-cited 50-minute safety ceiling regardless of how much lift is
// still needed, with the result checked visually every 5-10 minutes
// throughout; the recommended total time starts around 20 minutes for a
// minimal lift and scales up toward that 50-minute cap as more lift is
// requested. Anything beyond what 40vol (the strongest single-session
// option) can deliver requires a separate multi-step session, with 1-2
// weeks of scalp recovery in between.

const BLEACH_LIFT_TABLE: Record<DeveloperVolume, number> = {
  6: 3,
  10: 4,
  13: 5,
  20: 6,
  30: 7,
  40: 8,
};

// Ascending order (gentlest first) so `pickBleachDeveloperVolume` picks the
// gentlest volume that reaches the requested lift.
const BLEACH_DEVELOPER_VOLUMES: DeveloperVolume[] = [6, 10, 13, 20, 30, 40];

const DEFAULT_BLEACH_MIXING_RATIO: BleachMixingRatio = Object.freeze({ powderParts: 1, developerParts: 2 });

const BASE_PROCESSING_MINUTES = 20;
const PROCESSING_MINUTES_PER_LEVEL = 5;
const MAX_SCALP_PROCESSING_MINUTES = 50;
const CHECK_INTERVAL_MIN_MINUTES = 5;
const CHECK_INTERVAL_MAX_MINUTES = 10;

export interface BleachMixingRatio {
  powderParts: number;
  developerParts: number;
}

export interface BleachGrams {
  powderGrams: number;
  developerGrams: number;
}

export interface BleachFormula {
  startLevel: Level;
  targetLevel: Level;
  liftNeeded: number;
  developerVolume: DeveloperVolume | null;
  multiStepRequired: boolean;
  mixingRatio: BleachMixingRatio;
  grams: BleachGrams | null;
  recommendedProcessingMinutes: number;
  maxScalpProcessingMinutes: number;
  checkIntervalMinMinutes: number;
  checkIntervalMaxMinutes: number;
}

export function getBleachLift(volume: DeveloperVolume): number {
  return BLEACH_LIFT_TABLE[volume];
}

export function pickBleachDeveloperVolume(startLevel: Level, targetLevel: Level): DeveloperVolume | null {
  const liftNeeded = targetLevel - startLevel;
  if (liftNeeded <= 0) return null;
  for (const volume of BLEACH_DEVELOPER_VOLUMES) {
    if (getBleachLift(volume) >= liftNeeded) return volume;
  }
  return null;
}

export function pickBleachMixingRatio(): BleachMixingRatio {
  return DEFAULT_BLEACH_MIXING_RATIO;
}

export function calculateBleachGrams(totalGrams: number, ratio: BleachMixingRatio): BleachGrams {
  const { powderParts, developerParts } = ratio;
  const totalParts = powderParts + developerParts;
  return {
    powderGrams: totalGrams * powderParts / totalParts,
    developerGrams: totalGrams * developerParts / totalParts,
  };
}

export function getRecommendedBleachProcessingMinutes(startLevel: Level, targetLevel: Level): number {
  const liftNeeded = Math.max(0, targetLevel - startLevel);
  return Math.min(MAX_SCALP_PROCESSING_MINUTES, BASE_PROCESSING_MINUTES + liftNeeded * PROCESSING_MINUTES_PER_LEVEL);
}

export function calculateBleachFormula(startLevel: Level, targetLevel: Level, totalGrams: number): BleachFormula {
  const liftNeeded = Math.max(0, targetLevel - startLevel);
  const developerVolume = pickBleachDeveloperVolume(startLevel, targetLevel);
  const multiStepRequired = liftNeeded > 0 && developerVolume === null;
  const mixingRatio = pickBleachMixingRatio();

  return {
    startLevel,
    targetLevel,
    liftNeeded,
    developerVolume,
    multiStepRequired,
    mixingRatio,
    grams: developerVolume !== null ? calculateBleachGrams(totalGrams, mixingRatio) : null,
    recommendedProcessingMinutes: getRecommendedBleachProcessingMinutes(startLevel, targetLevel),
    maxScalpProcessingMinutes: MAX_SCALP_PROCESSING_MINUTES,
    checkIntervalMinMinutes: CHECK_INTERVAL_MIN_MINUTES,
    checkIntervalMaxMinutes: CHECK_INTERVAL_MAX_MINUTES,
  };
}
