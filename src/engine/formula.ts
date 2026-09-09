import i18n from "../i18n";
import { getUnderlyingPigment, pickDeveloperVolume, pickMaxLiftVolume, type DeveloperVolume, type Level, type UnderlyingPigment } from "./levels";
import { suggestNeutralizingTone } from "./neutralize";
import { calculateCorrectorGrams } from "./correction";
import type { MixingRatio, Shade, ToneFamily } from "./shades";

export interface GrayCoverageStrategy {
  naturalRatio: number;
  fashionRatio: number;
  note: string;
}

export interface FormulaGrams {
  colorGrams: number;
  developerGrams: number;
}

export interface FullFormula {
  developerVolume: DeveloperVolume | null;
  mixingRatio: MixingRatio;
  grayCoverage: GrayCoverageStrategy;
  // The level this formula actually reaches. Equal to targetShade.level whenever the
  // target is fully reachable (the overwhelming majority of formulas); lower than it only
  // for a partial-lift fallback (see Shade.acceptsPartialLift, shades.ts - e.g. Wella
  // Special Blonde used to lift as far as a single process allows). Null alongside a null
  // developerVolume, when no lift at all is achievable.
  achievedLevel: Level | null;
  underlyingPigment: UnderlyingPigment | null;
  recommendedCorrectiveTone: ToneFamily | null;
  correctorGrams: number | null;
  recommendedProcessingMinutes: number;
  toneWarning: string | null;
  eligibilityWarning: string | null;
  liftUnsupportedWarning: string | null;
  grams: FormulaGrams | null;
}

export const GRAY_LIGHT_THRESHOLD = 30;
export const GRAY_MEDIUM_THRESHOLD = 50;
export const GRAY_HEAVY_THRESHOLD = 80;

// Wella's own Koleston Perfect / Welloxon Perfect developer guide requires at least 6%
// (20 vol) to properly cover resistant gray/white hair, even when the target is the same
// depth or darker (no lift) -- where the level-diff-only pickDeveloperVolume (levels.ts)
// would otherwise pick the gentlest 3% (10 vol), which isn't strong enough to open the
// cuticle and deposit oxidative pigment into resistant gray. Applied as a floor in
// calculateFullFormula below once gray coverage is significant (the same >=30% threshold
// as GRAY_LIGHT_THRESHOLD, which is where gray coverage first starts driving the mix at
// all -- see getGrayCoverageStrategy); a no-op whenever the level-lift itself already
// calls for 20 vol or higher.
export const GRAY_COVERAGE_MIN_DEVELOPER_VOLUME: DeveloperVolume = 20;

// Wella's own "Pure Naturals" dosing guide for stubborn gray/white coverage: blend a
// natural-base shade into the target (fashion) formula at 1/3 for 30-50% gray and 1/2 for
// 50-100% gray -- capped at half-and-half even at 100% gray, never going further toward
// pure natural. `naturalRatio`/`fashionRatio` below mirror those two documented ratios
// directly (1/3, 1/2); below GRAY_LIGHT_THRESHOLD no natural-base dose is called for at
// all. GRAY_HEAVY_THRESHOLD plays no part in this mix -- it's a separate threshold (see
// revisit.ts) for how soon a heavily-gray client should rebook, not for this ratio.
const FASHION_ONLY: GrayCoverageStrategy = Object.freeze({ naturalRatio: 0, fashionRatio: 1, get note() { return i18n.t("engine.grayCoverage.fashionOnly"); } });
const ONE_THIRD_NATURAL: GrayCoverageStrategy = Object.freeze({ naturalRatio: 1 / 3, fashionRatio: 2 / 3, get note() { return i18n.t("engine.grayCoverage.oneThirdNatural"); } });
const HALF_NATURAL: GrayCoverageStrategy = Object.freeze({ naturalRatio: 0.5, fashionRatio: 0.5, get note() { return i18n.t("engine.grayCoverage.halfNatural"); } });

export function getGrayCoverageStrategy(grayPercent: number): GrayCoverageStrategy {
  if (grayPercent < GRAY_LIGHT_THRESHOLD) {
    return FASHION_ONLY;
  }
  if (grayPercent < GRAY_MEDIUM_THRESHOLD) {
    return ONE_THIRD_NATURAL;
  }
  return HALF_NATURAL;
}

// Processing time recommendations mirror standard manufacturer instructions: a shade's own
// `fixedProcessingMinutes` (e.g. Wella Special Blonde's 50-60 min without heat, see
// brands/wella.ts) wins outright when set; otherwise demi-permanent, deposit-only lines
// (e.g. Wella Color Touch, identified by developerVolumeChoices) process in 20 minutes,
// and permanent color processes in 30 minutes, extended to 45 for resistant/heavy gray
// coverage (the same >=50% gray threshold that drives the half-natural Pure Naturals dose above).
const DEMI_PERMANENT_PROCESSING_MINUTES = 20;
const STANDARD_PROCESSING_MINUTES = 30;
const EXTENDED_PROCESSING_MINUTES = 45;

export function getRecommendedProcessingMinutes(targetShade: Shade, grayPercent: number): number {
  if (targetShade.fixedProcessingMinutes !== undefined) {
    return targetShade.fixedProcessingMinutes;
  }
  if (targetShade.developerVolumeChoices !== undefined) {
    return DEMI_PERMANENT_PROCESSING_MINUTES;
  }
  return grayPercent >= GRAY_MEDIUM_THRESHOLD ? EXTENDED_PROCESSING_MINUTES : STANDARD_PROCESSING_MINUTES;
}

const NO_LIFT_MAX_DIFF = 0;
const MODERATE_LIFT_MAX_DIFF = 2;

export function getMixingRatio(startLevel: Level, targetLevel: Level): MixingRatio {
  const diff = targetLevel - startLevel;
  if (diff <= NO_LIFT_MAX_DIFF) {
    return { colorParts: 1, developerParts: 1 };
  }
  if (diff <= MODERATE_LIFT_MAX_DIFF) {
    return { colorParts: 1, developerParts: 1.5 };
  }
  return { colorParts: 1, developerParts: 2 };
}

export function calculateFormulaGrams(totalGrams: number, ratio: MixingRatio): FormulaGrams {
  const totalParts = ratio.colorParts + ratio.developerParts;
  const colorGrams = totalGrams * ratio.colorParts / totalParts;
  const developerGrams = totalGrams * ratio.developerParts / totalParts;
  return { colorGrams, developerGrams };
}

// Blends in an extra shade the colorist chooses at their own discretion (e.g. a small
// corrective addition), on top of the calculated primary mix. The colorist enters the
// additional shade's grams by hand; the developer amount is recalculated automatically so
// the color:developer ratio stays correct for the new, larger total color weight.
export function applyAdditionalShade(grams: FormulaGrams, ratio: MixingRatio, additionalColorGrams: number): FormulaGrams {
  const colorGrams = grams.colorGrams + additionalColorGrams;
  const developerGrams = colorGrams * ratio.developerParts / ratio.colorParts;
  return { colorGrams, developerGrams };
}

export interface ShadeBlendSplit {
  primaryGrams: number;
  secondaryGrams: number;
}

// Splits a shade's already-calculated color total between two component shades by ratio,
// for approximating a shade that's out of stock (e.g. no 7/13 on hand -> blend 7/1 and
// 7/3 at a 70/30 split). Unlike `applyAdditionalShade`, the color/developer weight
// `calculateFullFormula` produced is left untouched -- the two components share that
// single total rather than growing it, since together they stand in for the one missing
// shade. Callers should only pair shades `canBlendShades` (see shades.ts) accepts.
export function splitShadeBlend(colorGrams: number, primaryPercent: number): ShadeBlendSplit {
  const ratio = Math.min(100, Math.max(0, primaryPercent)) / 100;
  return {
    primaryGrams: colorGrams * ratio,
    secondaryGrams: colorGrams * (1 - ratio),
  };
}

export function calculateFullFormula(
  startLevel: Level,
  targetShade: Shade,
  grayPercent: number,
  totalGrams: number,
  mixingRatioStrategy: (startLevel: Level, targetLevel: Level) => MixingRatio = getMixingRatio,
  manualDeveloperVolume?: DeveloperVolume
): FullFormula {
  const isLifting = targetShade.level > startLevel;
  const mixingRatio = targetShade.fixedMixingRatio ?? mixingRatioStrategy(startLevel, targetShade.level);
  const grayCoverage = getGrayCoverageStrategy(grayPercent);

  let liftUnsupportedWarning: string | null = null;
  if (targetShade.developerVolumeChoices !== undefined && isLifting) {
    liftUnsupportedWarning = i18n.t("engine.liftUnsupportedWarning", { code: targetShade.code, level: targetShade.level, startLevel });
  }

  let developerVolume = liftUnsupportedWarning !== null
    ? null
    : targetShade.developerVolumeChoices
      ? (manualDeveloperVolume ?? null)
      : pickDeveloperVolume(startLevel, targetShade.level, targetShade.developerLiftTable);
  if (developerVolume !== null && targetShade.developerVolumeChoices === undefined) {
    if (grayPercent >= GRAY_LIGHT_THRESHOLD && developerVolume < GRAY_COVERAGE_MIN_DEVELOPER_VOLUME) {
      developerVolume = GRAY_COVERAGE_MIN_DEVELOPER_VOLUME;
    } else if (!isLifting && targetShade.noLiftDeveloperVolume !== undefined) {
      developerVolume = targetShade.noLiftDeveloperVolume;
    }
  }

  // Special Blonde-style "maximum lift" shades (Shade.acceptsPartialLift) are routinely
  // chosen purely to lift as far as a single process safely allows, not to guarantee this
  // shade's own nominal level - e.g. Special Blonde from level 5 toward level 12, even
  // though its own 12%-developer ceiling only reaches level 10. Falls back to the
  // strongest developer the shade's own lift table supports and reports the level that
  // actually reaches (achievedLevel below), rather than refusing to compute a formula at
  // all just because the nominal target is out of reach.
  let achievedLevel: Level | null = developerVolume !== null ? targetShade.level : null;
  if (
    developerVolume === null && isLifting
    && targetShade.acceptsPartialLift === true && targetShade.developerLiftTable !== undefined
  ) {
    const fallbackVolume = pickMaxLiftVolume(targetShade.developerLiftTable);
    const fallbackLift = targetShade.developerLiftTable(fallbackVolume);
    if (fallbackLift > 0) {
      developerVolume = fallbackVolume;
      achievedLevel = (startLevel + fallbackLift) as Level;
    }
  }

  // No pigment is actually revealed if the line can't lift in the first place, or lifts
  // to nowhere (achievedLevel null alongside developerVolume null).
  const isActuallyLifting = isLifting && liftUnsupportedWarning === null && achievedLevel !== null;
  const underlyingPigment = isActuallyLifting && achievedLevel !== null ? getUnderlyingPigment(achievedLevel) : null;
  const recommendedCorrectiveTone = underlyingPigment !== null ? suggestNeutralizingTone(underlyingPigment) : null;
  const correctorGrams = recommendedCorrectiveTone !== null && achievedLevel !== null ? calculateCorrectorGrams(achievedLevel, totalGrams) : null;
  const recommendedProcessingMinutes = getRecommendedProcessingMinutes(targetShade, grayPercent);

  let toneWarning: string | null = null;
  if (isActuallyLifting && recommendedCorrectiveTone !== targetShade.tone) {
    toneWarning = i18n.t("engine.toneWarning", { tone: targetShade.tone, pigment: underlyingPigment, recommended: recommendedCorrectiveTone });
  }

  let eligibilityWarning: string | null = null;
  if (targetShade.minStartLevel !== undefined && startLevel < targetShade.minStartLevel) {
    eligibilityWarning = i18n.t("engine.eligibilityWarning", { code: targetShade.code, minLevel: targetShade.minStartLevel, startLevel });
  }

  const grams = developerVolume !== null ? calculateFormulaGrams(totalGrams, mixingRatio) : null;

  return {
    developerVolume,
    mixingRatio,
    grayCoverage,
    achievedLevel,
    underlyingPigment,
    recommendedCorrectiveTone,
    correctorGrams,
    recommendedProcessingMinutes,
    toneWarning,
    eligibilityWarning,
    liftUnsupportedWarning,
    grams,
  };
}