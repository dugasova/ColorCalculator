import { pickDeveloperVolume, type DeveloperVolume, type Level, type LiftTable } from "./levels";

export type UnwantedTone = "red" | "orange" | "yellow" | "green" | "blue" | "violet";

export type CorrectionTechnique = "deposit" | "lift-tone" | "multi-step";

export interface Corrector {
  color: UnwantedTone;
  qualifier: string;
  reflections: string[];
}

// The Oswald color star: each unwanted tone is neutralized by its direct
// opposite. Reflection codes and qualifiers follow the professional
// nomenclature used across brand charts (e.g. Wella's .1 ash, .2 violet).
const COMPLEMENTARY_CORRECTORS: Record<UnwantedTone, Corrector> = {
  red: { color: "green", qualifier: "ash-matte", reflections: [".13", ".31"] },
  orange: { color: "blue", qualifier: "ash", reflections: [".1", ".01"] },
  yellow: { color: "violet", qualifier: "iridescent", reflections: [".2"] },
  green: { color: "red", qualifier: "copper", reflections: [".4"] },
  blue: { color: "orange", qualifier: "copper-gold", reflections: [".43", ".34"] },
  violet: { color: "yellow", qualifier: "gold", reflections: [".3"] },
};

export function getComplementaryCorrector(tone: UnwantedTone): Corrector {
  return COMPLEMENTARY_CORRECTORS[tone];
}

const LIFT_MODERATE_MAX_DIFF = 2;

export interface CorrectionDeveloper {
  volume: DeveloperVolume;
  percent: number;
}

// Corrective work sits on hair that has already been processed (that's why it needs
// correcting), so it runs a deliberately gentler ladder than the from-scratch cream-color
// table in levels.ts's maxLiftForDeveloper -- 20 vol is trusted with a 2-level lift here
// where the main formula path would already step up to 30. Kept as a named LiftTable and
// fed through the same pickDeveloperVolume helper (the same way bleach.ts keeps its own
// BLEACH_LIFT_TABLE) so the difference reads as a decision, not as drift.
const CORRECTION_LIFT_TABLE: LiftTable = volume => {
  switch (volume) {
    case 6: return 0;
    case 10: return 0;
    case 13: return 0;
    case 20: return 2;
    case 30: return 3;
    case 40: return 4;
  }
};

// Mirrors the standard vol-to-percentage peroxide conversion (vol * 0.3). Beyond a
// 4-level lift no single developer is honest about the job -- getCorrectionTechnique
// already flags it "multi-step" -- so the strongest developer is what the colorist mixes
// for the lift stage, rather than pickDeveloperVolume's `null`.
export function getCorrectionDeveloper(startLevel: Level, targetLevel: Level): CorrectionDeveloper {
  const volume = pickDeveloperVolume(startLevel, targetLevel, CORRECTION_LIFT_TABLE) ?? 40;
  return { volume, percent: Math.round(volume * 0.3 * 10) / 10 };
}

export function getCorrectionTechnique(startLevel: Level, targetLevel: Level): CorrectionTechnique {
  const diff = targetLevel - startLevel;
  if (diff <= 0) return "deposit";
  if (diff <= LIFT_MODERATE_MAX_DIFF) return "lift-tone";
  return "multi-step";
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

// From level 10 up, the literal "10 minus level" reading collapses to zero -- but real
// high-lift blonde work at levels 10-12 still carries a faint pale-yellow/very-light-yellow
// undertone (see levels.ts's getUnderlyingPigment) that shows through without a touch of
// violet correction. Every major brand's own chart confirms this: Wella (0/66, "1cm/0.5g"),
// Igora Royal (0-99, "1cm/0.5g", per its own rule-of-12 for the Highlifts sub-range),
// Majirel (Mix Violet, "0.2-0.3g"), and Chromatics (Remixed Violet, "0.5-1g") all specify a
// small fixed amount at this depth rather than scaling it down to nothing -- so it never
// diminishes further as the target climbs from 10 to 12.
const RULE_OF_TEN_HIGH_LIFT_FLOOR_GRAMS_PER_30G = 0.5;

// Colorimetric "Rule of 10": subtract the depth level you're coloring at from 10 to get
// the amount of corrector needed per 30g of base color, then scale proportionally to the
// actual amount used. Traditionally read off as a length (cm) of corrector/microtone
// squeezed from the tube; measured out on a scale instead, the standard colorist
// convention treats 1cm of tube as ~1g, so the same number of grams is used directly.
export function calculateCorrectorGrams(level: Level, baseGrams: number): number {
  const gramsPer30g = level >= RULE_OF_TEN_BASE_LEVEL
    ? RULE_OF_TEN_HIGH_LIFT_FLOOR_GRAMS_PER_30G
    : RULE_OF_TEN_BASE_LEVEL - level;
  return Math.round(gramsPer30g * (baseGrams / RULE_OF_TEN_BASE_GRAMS) * 10) / 10;
}
