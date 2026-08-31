import i18n from "../i18n";
import { getUnderlyingPigment, pickDeveloperVolume, type DeveloperVolume, type Level, type UnderlyingPigment } from "./levels";
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

const FASHION_ONLY: GrayCoverageStrategy = Object.freeze({ naturalRatio: 0, fashionRatio: 1, get note() { return i18n.t('engine.grayCoverage.fashionOnly'); } });
const EQUAL_MIX: GrayCoverageStrategy = Object.freeze({ naturalRatio: 0.5, fashionRatio: 0.5, get note() { return i18n.t('engine.grayCoverage.equalMix'); } });
const BASE_DOMINANT: GrayCoverageStrategy = Object.freeze({ naturalRatio: 0.67, fashionRatio: 0.33, get note() { return i18n.t('engine.grayCoverage.baseDominant'); } });
const NATURAL_ONLY: GrayCoverageStrategy = Object.freeze({
  naturalRatio: 1,
  fashionRatio: 0,
  get note() { return i18n.t('engine.grayCoverage.naturalOnly'); },
});

export function getGrayCoverageStrategy(grayPercent: number): GrayCoverageStrategy {
  if (grayPercent < GRAY_LIGHT_THRESHOLD) {
    return FASHION_ONLY;
  }
  if (grayPercent < GRAY_MEDIUM_THRESHOLD) {
    return EQUAL_MIX;
  }
  if (grayPercent < GRAY_HEAVY_THRESHOLD) {
    return BASE_DOMINANT;
  }
  return NATURAL_ONLY;
}

// Processing time recommendations mirror standard manufacturer instructions: demi-permanent,
// deposit-only lines (e.g. Wella Color Touch, identified by developerVolumeChoices) process in
// 20 minutes; permanent color processes in 30 minutes, extended to 45 for resistant/heavy gray
// coverage (the same >=50% gray threshold that drives a base-dominant mix above).
const DEMI_PERMANENT_PROCESSING_MINUTES = 20;
const STANDARD_PROCESSING_MINUTES = 30;
const EXTENDED_PROCESSING_MINUTES = 45;

export function getRecommendedProcessingMinutes(targetShade: Shade, grayPercent: number): number {
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
    liftUnsupportedWarning = i18n.t('engine.liftUnsupportedWarning', { code: targetShade.code, level: targetShade.level, startLevel });
  }

  // No pigment is actually revealed if the line can't lift in the first place.
  const isActuallyLifting = isLifting && liftUnsupportedWarning === null;
  const underlyingPigment = isActuallyLifting ? getUnderlyingPigment(targetShade.level) : null;
  const recommendedCorrectiveTone = underlyingPigment !== null ? suggestNeutralizingTone(underlyingPigment) : null;
  const correctorGrams = recommendedCorrectiveTone !== null ? calculateCorrectorGrams(targetShade.level, totalGrams) : null;
  const recommendedProcessingMinutes = getRecommendedProcessingMinutes(targetShade, grayPercent);

  const developerVolume = liftUnsupportedWarning !== null
    ? null
    : targetShade.developerVolumeChoices
      ? (manualDeveloperVolume ?? null)
      : pickDeveloperVolume(startLevel, targetShade.level, targetShade.developerLiftTable);

  let toneWarning: string | null = null;
  if (isActuallyLifting && recommendedCorrectiveTone !== targetShade.tone) {
    toneWarning = i18n.t('engine.toneWarning', { tone: targetShade.tone, pigment: underlyingPigment, recommended: recommendedCorrectiveTone });
  }

  let eligibilityWarning: string | null = null;
  if (targetShade.minStartLevel !== undefined && startLevel < targetShade.minStartLevel) {
    eligibilityWarning = i18n.t('engine.eligibilityWarning', { code: targetShade.code, minLevel: targetShade.minStartLevel, startLevel });
  }

  const grams = developerVolume !== null ? calculateFormulaGrams(totalGrams, mixingRatio) : null;

  return {
    developerVolume,
    mixingRatio,
    grayCoverage,
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