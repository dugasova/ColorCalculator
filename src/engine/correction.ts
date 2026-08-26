import type { DeveloperVolume, Level } from "./levels";

export type UnwantedTone = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet';

export type CorrectionTechnique = 'deposit' | 'lift-tone' | 'multi-step';

export interface Corrector {
  color: UnwantedTone;
  qualifier: string;
  reflections: string[];
}

// The Oswald color star: each unwanted tone is neutralized by its direct
// opposite. Reflection codes and qualifiers follow the professional
// nomenclature used across brand charts (e.g. Wella's .1 ash, .2 violet).
const COMPLEMENTARY_CORRECTORS: Record<UnwantedTone, Corrector> = {
  red: { color: 'green', qualifier: 'ash-matte', reflections: ['.13', '.31'] },
  orange: { color: 'blue', qualifier: 'ash', reflections: ['.1', '.01'] },
  yellow: { color: 'violet', qualifier: 'iridescent', reflections: ['.2'] },
  green: { color: 'red', qualifier: 'copper', reflections: ['.4'] },
  blue: { color: 'orange', qualifier: 'copper-gold', reflections: ['.43', '.34'] },
  violet: { color: 'yellow', qualifier: 'gold', reflections: ['.3'] },
};

export function getComplementaryCorrector(tone: UnwantedTone): Corrector {
  return COMPLEMENTARY_CORRECTORS[tone];
}

const LIFT_MODERATE_MAX_DIFF = 2;
const LIFT_HIGH_DIFF = 3;

export interface CorrectionDeveloper {
  volume: DeveloperVolume;
  percent: number;
}

// Mirrors the standard vol-to-percentage peroxide conversion (vol * 0.3).
export function getCorrectionDeveloper(startLevel: Level, targetLevel: Level): CorrectionDeveloper {
  const diff = targetLevel - startLevel;
  const volume: DeveloperVolume = diff <= 0 ? 10 : diff <= LIFT_MODERATE_MAX_DIFF ? 20 : diff === LIFT_HIGH_DIFF ? 30 : 40;
  return { volume, percent: Math.round(volume * 0.3 * 10) / 10 };
}

export function getCorrectionTechnique(startLevel: Level, targetLevel: Level): CorrectionTechnique {
  const diff = targetLevel - startLevel;
  if (diff <= 0) return 'deposit';
  if (diff <= LIFT_MODERATE_MAX_DIFF) return 'lift-tone';
  return 'multi-step';
}

export interface ColorCorrectionResult {
  unwantedTone: UnwantedTone;
  corrector: Corrector;
  developer: CorrectionDeveloper;
  technique: CorrectionTechnique;
}

export function calculateColorCorrection(startLevel: Level, targetLevel: Level, unwantedTone: UnwantedTone): ColorCorrectionResult {
  return {
    unwantedTone,
    corrector: getComplementaryCorrector(unwantedTone),
    developer: getCorrectionDeveloper(startLevel, targetLevel),
    technique: getCorrectionTechnique(startLevel, targetLevel),
  };
}

const RULE_OF_TEN_BASE_GRAMS = 30;
const RULE_OF_TEN_BASE_LEVEL = 10;

// Colorimetric "Rule of 10": subtract the depth level you're coloring at from 10 to get
// the amount of corrector needed per 30g of base color, then scale proportionally to the
// actual amount used. Traditionally read off as a length (cm) of corrector/microtone
// squeezed from the tube; measured out on a scale instead, the standard colorist
// convention treats 1cm of tube as ~1g, so the same number of grams is used directly.
export function calculateCorrectorGrams(level: Level, baseGrams: number): number {
  const gramsPer30g = Math.max(0, RULE_OF_TEN_BASE_LEVEL - level);
  return Math.round(gramsPer30g * (baseGrams / RULE_OF_TEN_BASE_GRAMS) * 10) / 10;
}
