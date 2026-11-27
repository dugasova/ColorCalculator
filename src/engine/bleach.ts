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
// requested. A colorist lifts at most MAX_LIFT_PER_SESSION levels in one sitting and
// never puts more than MAX_SCALP_DEVELOPER_VOLUME on the scalp (colorist, 2026-11-26):
// a bigger lift is split into sessions (`planBleachSessions`), with 1-2 weeks of scalp
// recovery in between.

// The lightest target a colorist lightens to: 10. Levels 11-12 exist only as the
// special-blonde (high-lift) shades' nominal depth, never as a goal after powder
// (colorist, 2026-11-19).
export const MAX_BLEACH_TARGET_LEVEL: Level = 10;
export const BLEACH_TARGET_LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// The most levels one on-scalp lightening session lifts, and the strongest developer
// it may use (9% / 30vol: 12% never goes on the scalp) -- colorist, 2026-11-26.
export const MAX_LIFT_PER_SESSION = 3;
export const MAX_SCALP_DEVELOPER_VOLUME: DeveloperVolume = 30;
// The scalp's recovery break between two lightening sessions.
export const SESSION_BREAK_MIN_WEEKS = 1;
export const SESSION_BREAK_MAX_WEEKS = 2;

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
// Off the scalp (strands in foil, lengths only) the scalp's limits don't apply: 40vol is
// allowed and one session lifts as far as it reaches.
const OFF_SCALP_MAX_LIFT_PER_SESSION = BLEACH_LIFT_TABLE[40];

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

// One sitting of a lightening plan: the levels it lifts between, its developer and time.
export interface BleachSession {
  startLevel: Level;
  targetLevel: Level;
  developerVolume: DeveloperVolume;
  processingMinutes: number;
}

// A lift beyond one session is planned over several (`sessions`); the developer, grams
// and processing time then describe the first one -- what is mixed at this visit -- and
// `targetLevel` stays the colorist's final goal.
export interface BleachFormula {
  startLevel: Level;
  targetLevel: Level;
  liftNeeded: number;
  developerVolume: DeveloperVolume | null;
  multiStepRequired: boolean;
  // Every session, in order; empty when there is nothing to lift. Missing on a visit
  // saved before 0.15, whose multi-step result carried no formula at all.
  sessions?: BleachSession[];
  // The most levels one session lifts for this application; missing before 0.15.
  maxLiftPerSession?: number;
  // The developer the colorist picked by hand, used for every session; null when picked
  // automatically. Missing before 0.15.
  manualDeveloperVolume?: DeveloperVolume | null;
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

export function pickBleachDeveloperVolume(
  startLevel: Level,
  targetLevel: Level,
  onScalp = true,
): DeveloperVolume | null {
  const liftNeeded = targetLevel - startLevel;
  if (liftNeeded <= 0) return null;
  for (const volume of BLEACH_DEVELOPER_VOLUMES) {
    if (onScalp && volume > MAX_SCALP_DEVELOPER_VOLUME) break;
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
    powderGrams: (totalGrams * powderParts) / totalParts,
    developerGrams: (totalGrams * developerParts) / totalParts,
  };
}

export function getRecommendedBleachProcessingMinutes(startLevel: Level, targetLevel: Level): number {
  const liftNeeded = Math.max(0, targetLevel - startLevel);
  return Math.min(MAX_SCALP_PROCESSING_MINUTES, BASE_PROCESSING_MINUTES + liftNeeded * PROCESSING_MINUTES_PER_LEVEL);
}

// The developers a colorist may pick by hand: none stronger than 9% on the scalp.
export function getBleachDeveloperChoices(onScalp: boolean): DeveloperVolume[] {
  return BLEACH_DEVELOPER_VOLUMES.filter(volume => !onScalp || volume <= MAX_SCALP_DEVELOPER_VOLUME);
}

// A hand-picked developer only counts where it's allowed (switching a foil step back to
// the scalp drops a 12% pick back to automatic).
function resolveManualDeveloper(manual: DeveloperVolume | null, onScalp: boolean): DeveloperVolume | null {
  return manual !== null && getBleachDeveloperChoices(onScalp).includes(manual) ? manual : null;
}

// One session's limit, and no more than a hand-picked developer lifts.
export function getMaxLiftPerSession(onScalp: boolean, manualDeveloper: DeveloperVolume | null = null): number {
  const limit = onScalp ? MAX_LIFT_PER_SESSION : OFF_SCALP_MAX_LIFT_PER_SESSION;
  return manualDeveloper !== null ? Math.min(limit, getBleachLift(manualDeveloper)) : limit;
}

// Splits a lift into as few sessions as one session's limit allows, as evenly as
// possible with the bigger lifts first (on the scalp, 3 -> 10 is 3 -> 6, 6 -> 8, 8 -> 10).
// A hand-picked developer is used for every session.
export function planBleachSessions(
  startLevel: Level,
  targetLevel: Level,
  onScalp = true,
  manualDeveloper: DeveloperVolume | null = null,
): BleachSession[] {
  const liftNeeded = targetLevel - startLevel;
  if (liftNeeded <= 0) return [];
  const manual = resolveManualDeveloper(manualDeveloper, onScalp);
  const count = Math.ceil(liftNeeded / getMaxLiftPerSession(onScalp, manual));
  const baseLift = Math.floor(liftNeeded / count);
  const biggerLifts = liftNeeded % count;
  const sessions: BleachSession[] = [];
  let from = startLevel;
  for (let index = 0; index < count; index++) {
    const to = (from + baseLift + (index < biggerLifts ? 1 : 0)) as Level;
    const developerVolume = manual ?? pickBleachDeveloperVolume(from, to, onScalp);
    if (developerVolume === null) throw new Error(`No developer lifts ${from} -> ${to}`);
    sessions.push({
      startLevel: from,
      targetLevel: to,
      developerVolume,
      processingMinutes: getRecommendedBleachProcessingMinutes(from, to),
    });
    from = to;
  }
  return sessions;
}

// `onScalp` is false for powder that doesn't touch the scalp (strands in foil, lengths
// only), which the scalp's per-session limits don't bind.
export function calculateBleachFormula(
  startLevel: Level,
  targetLevel: Level,
  totalGrams: number,
  onScalp = true,
  manualDeveloper: DeveloperVolume | null = null,
): BleachFormula {
  const liftNeeded = Math.max(0, targetLevel - startLevel);
  const manual = resolveManualDeveloper(manualDeveloper, onScalp);
  const sessions = planBleachSessions(startLevel, targetLevel, onScalp, manual);
  const firstSession = sessions[0] ?? null;
  const developerVolume = firstSession?.developerVolume ?? null;
  const multiStepRequired = sessions.length > 1;
  const mixingRatio = pickBleachMixingRatio();

  return {
    startLevel,
    targetLevel,
    liftNeeded,
    developerVolume,
    multiStepRequired,
    sessions,
    maxLiftPerSession: getMaxLiftPerSession(onScalp, manual),
    manualDeveloperVolume: manual,
    mixingRatio,
    grams: developerVolume !== null ? calculateBleachGrams(totalGrams, mixingRatio) : null,
    recommendedProcessingMinutes:
      firstSession?.processingMinutes ?? getRecommendedBleachProcessingMinutes(startLevel, targetLevel),
    maxScalpProcessingMinutes: MAX_SCALP_PROCESSING_MINUTES,
    checkIntervalMinMinutes: CHECK_INTERVAL_MIN_MINUTES,
    checkIntervalMaxMinutes: CHECK_INTERVAL_MAX_MINUTES,
  };
}
