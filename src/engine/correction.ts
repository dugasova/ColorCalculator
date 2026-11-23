import {
  pickDeveloperVolume,
  DEVELOPER_VOLUME_PERCENT,
  type DeveloperVolume,
  type Level,
  type LiftTable,
} from "./levels";
import type { Brand } from "./brands";
import type { CorrectiveToneGrams } from "./formula";
import {
  assessNeutralization,
  getBackground,
  getCorrectiveTone,
  getNeutralizer,
  getShadeNeutralizingColors,
} from "./neutralize";
import type { CorrectorRule, MixingRatio, Shade, ToneFamily } from "./shades";

// The six colors of the wheel.
export type WheelTone = "red" | "orange" | "yellow" | "green" | "blue" | "violet";

// What the hair shows that the colorist wants gone: a color of the wheel, or one of the
// warm blends lifting reveals between them (the same blends as the background table in
// levels.ts, so "yellow-orange" here is cancelled exactly like a level-8 background).
export type UnwantedTone = WheelTone | "red-orange" | "orange-red" | "orange-yellow" | "yellow-orange";

export const UNWANTED_TONES: UnwantedTone[] = [
  "red",
  "red-orange",
  "orange-red",
  "orange",
  "orange-yellow",
  "yellow-orange",
  "yellow",
  "green",
  "blue",
  "violet",
];

// The wheel color a blend leans to (its first-named, dominant color).
const DOMINANT_WHEEL_TONE: Record<UnwantedTone, WheelTone> = {
  red: "red",
  "red-orange": "red",
  "orange-red": "orange",
  orange: "orange",
  "orange-yellow": "orange",
  "yellow-orange": "yellow",
  yellow: "yellow",
  green: "green",
  blue: "blue",
  violet: "violet",
};

export function getDominantWheelTone(tone: UnwantedTone): WheelTone {
  return DOMINANT_WHEEL_TONE[tone];
}

export type CorrectionTechnique = "deposit" | "lift-tone" | "multi-step";

export interface Corrector {
  color: WheelTone;
  qualifier: string;
  reflections: string[];
}

// The Oswald color star: each unwanted tone is neutralized by its direct
// opposite. Reflection codes and qualifiers follow the professional
// nomenclature used across brand charts (e.g. Wella's .1 ash, .2 violet).
const COMPLEMENTARY_CORRECTORS: Record<WheelTone, Corrector> = {
  red: { color: "green", qualifier: "ash-matte", reflections: [".13", ".31"] },
  orange: { color: "blue", qualifier: "ash", reflections: [".1", ".01"] },
  yellow: { color: "violet", qualifier: "iridescent", reflections: [".2"] },
  green: { color: "red", qualifier: "copper", reflections: [".4"] },
  blue: { color: "orange", qualifier: "copper-gold", reflections: [".43", ".34"] },
  violet: { color: "yellow", qualifier: "gold", reflections: [".3"] },
};

export function getComplementaryCorrector(tone: UnwantedTone): Corrector {
  return COMPLEMENTARY_CORRECTORS[getDominantWheelTone(tone)];
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
    case 6:
      return 0;
    case 10:
      return 0;
    case 13:
      return 0;
    case 20:
      return 2;
    case 30:
      return 3;
    case 40:
      return 4;
  }
};

// The strength actually printed on each developer's bottle (see DEVELOPER_VOLUME_PERCENT
// in levels.ts), not a flat vol-to-percentage conversion. Beyond a 4-level lift no single
// developer is honest about the job -- getCorrectionTechnique already flags it
// "multi-step" -- so the strongest developer is what the colorist mixes for the lift
// stage, rather than pickDeveloperVolume's `null`.
export function getCorrectionDeveloper(startLevel: Level, targetLevel: Level): CorrectionDeveloper {
  const volume = pickDeveloperVolume(startLevel, targetLevel, CORRECTION_LIFT_TABLE) ?? 40;
  return { volume, percent: DEVELOPER_VOLUME_PERCENT[volume] };
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

export function calculateColorCorrection(
  startLevel: Level,
  targetLevel: Level,
  unwantedTone: UnwantedTone,
): ColorCorrectionResult {
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
// and Majirel (Mix Violet, "0.2-0.3g") all specify a
// small fixed amount at this depth rather than scaling it down to nothing -- so it never
// diminishes further as the target climbs from 10 to 12.
const RULE_OF_TEN_HIGH_LIFT_FLOOR_GRAMS_PER_30G = 0.5;

// Colorimetric "Rule of 10": subtract the depth level you're coloring at from 10 to get
// the amount of corrector needed per 30g of base color, then scale proportionally to the
// actual amount used. Traditionally read off as a length (cm) of corrector/microtone
// squeezed from the tube; measured out on a scale instead, the standard colorist
// convention treats 1cm of tube as ~1g, so the same number of grams is used directly.
//
// Igora doses its mixtones by its own Rule of 11 instead (colorist, 2026-11-17): 11 minus
// the level gives centimetres of mixtone per 30 g of color, 1 cm being 0.5 g; on levels
// 8–10 the result is cut by 30–50% so the cool pigment does not oversaturate (40% here,
// the middle). Above 10 it stays at level 10's amount.
const RULE_OF_ELEVEN_BASE_LEVEL = 11;
const RULE_OF_ELEVEN_GRAMS_PER_CM = 0.5;
const RULE_OF_ELEVEN_LIGHT_FROM_LEVEL = 8;
const RULE_OF_ELEVEN_LIGHT_REDUCTION = 0.4;

function getCorrectorGramsPer30g(level: Level, rule: CorrectorRule): number {
  if (rule === "rule-of-11") {
    const cm = RULE_OF_ELEVEN_BASE_LEVEL - Math.min(level, 10);
    const reduction = level >= RULE_OF_ELEVEN_LIGHT_FROM_LEVEL ? 1 - RULE_OF_ELEVEN_LIGHT_REDUCTION : 1;
    return cm * RULE_OF_ELEVEN_GRAMS_PER_CM * reduction;
  }
  return level >= RULE_OF_TEN_BASE_LEVEL ? RULE_OF_TEN_HIGH_LIFT_FLOOR_GRAMS_PER_30G : RULE_OF_TEN_BASE_LEVEL - level;
}

export function calculateCorrectorGrams(level: Level, baseGrams: number, rule: CorrectorRule = "rule-of-10"): number {
  return Math.round(getCorrectorGramsPer30g(level, rule) * (baseGrams / RULE_OF_TEN_BASE_GRAMS) * 10) / 10;
}

// Over-corrected hair (green, blue or violet) is warmed back with the opposite warm tone.
// The other unwanted tones are a lightening background, cancelled by the same blended
// neutralizer the formula calculator uses (neutralize.ts).
const WARM_CORRECTIVE_TONE: Partial<Record<UnwantedTone, ToneFamily>> = {
  green: "red",
  blue: "copper",
  violet: "gold",
};

export interface CorrectionTonePart {
  tone: ToneFamily;
  // This tone's part of the whole corrector; the parts add up to 1.
  share: number;
}

// The corrective tones for an unwanted tone, dominant first.
// `line` picks the manufacturer's own pigment balance where it has one (Matrix).
export function getCorrectionTones(unwanted: UnwantedTone, line?: string | null): CorrectionTonePart[] {
  const warm = WARM_CORRECTIVE_TONE[unwanted];
  if (warm !== undefined) return [{ tone: warm, share: 1 }];
  // Every remaining UnwantedTone is also an UnderlyingPigment.
  return getNeutralizer(unwanted as Exclude<UnwantedTone, "green" | "blue" | "violet">, line).map(part => ({
    tone: getCorrectiveTone(part.color),
    share: part.share,
  }));
}

// The tone a lightening background usually shows at `level`: the warm tone to expect, and
// the colorist's starting guess, as the line's manufacturer charts it. The palest
// backgrounds are plain yellow here.
export function getExpectedUnwantedTone(level: Level, line?: string | null): UnwantedTone {
  const pigment = getBackground(level, line);
  return pigment === "pale-yellow" || pigment === "very-light-yellow" ? "yellow" : pigment;
}

// The corrector by the Rule of 10 at the level being colored, split by the tones' shares.
// `maxShareOfColor` is a manufacturer cap on corrector weight against the dye (Matrix
// SoColor 25%): every tone is scaled by the same factor, so the blend keeps its proportions.
export function calculateCorrectionTones(
  unwanted: UnwantedTone,
  level: Level,
  baseGrams: number,
  maxShareOfColor?: number,
  rule: CorrectorRule = "rule-of-10",
  line?: string | null,
): CorrectiveToneGrams[] {
  const wholeGrams = calculateCorrectorGrams(level, baseGrams, rule);
  const maxGrams = maxShareOfColor !== undefined ? baseGrams * maxShareOfColor : Infinity;
  const scale = wholeGrams > maxGrams ? maxGrams / wholeGrams : 1;
  return roundCorrectorGrams(
    getCorrectionTones(unwanted, line).map(part => ({ tone: part.tone, grams: wholeGrams * scale * part.share })),
  );
}

// Rounds each tone's grams to 0.1 g so the parts still add up to their rounded sum: 0.9 g
// half and half is 0.5 + 0.4, not 0.5 + 0.5. The last tone takes what the rounding of the
// others leaves.
export function roundCorrectorGrams(parts: CorrectiveToneGrams[]): CorrectiveToneGrams[] {
  const roundedTotal = Math.round(parts.reduce((sum, part) => sum + part.grams, 0) * 10);
  let assigned = 0;
  return parts.map((part, index) => {
    const tenths = index === parts.length - 1 ? roundedTotal - assigned : Math.round(part.grams * 10);
    assigned += tenths;
    return { tone: part.tone, grams: tenths / 10 };
  });
}

// The tone families whose shades warm back over-corrected hair. Green is cancelled by red,
// and mahogany (red-violet) does it too (Wella /5, /65).
const WARM_SHADE_TONES: Partial<Record<UnwantedTone, ToneFamily[]>> = {
  green: ["red", "mahogany"],
  blue: ["copper"],
  violet: ["gold"],
};

// Tone families that strengthen a wheel color: a shade carrying one of them deepens the
// very tone being corrected, whatever else it brings (colorist, 2026-11-17: 8/41 turns
// orange stronger, 8/38 the yellow of a yellow-orange background). Wella's /4 is charted
// red, so red counts against orange too.
const AMPLIFYING_TONES: Record<WheelTone, ToneFamily[]> = {
  red: ["red", "mahogany", "copper"],
  orange: ["copper", "red"],
  yellow: ["gold"],
  green: ["matt"],
  blue: ["ash"],
  violet: ["violet"],
};

// The wheel colors an unwanted tone is made of: both for a blend.
const UNWANTED_TONE_COLORS: Record<UnwantedTone, WheelTone[]> = {
  red: ["red"],
  "red-orange": ["red", "orange"],
  "orange-red": ["orange", "red"],
  orange: ["orange"],
  "orange-yellow": ["orange", "yellow"],
  "yellow-orange": ["yellow", "orange"],
  yellow: ["yellow"],
  green: ["green"],
  blue: ["blue"],
  violet: ["violet"],
};

function getShadeTones(shade: Shade): ToneFamily[] {
  return [shade.tone, ...(shade.secondaryTone !== undefined ? [shade.secondaryTone] : [])];
}

function amplifiesUnwantedTone(shade: Shade, unwanted: UnwantedTone): boolean {
  const amplifying = UNWANTED_TONE_COLORS[unwanted].flatMap(color => AMPLIFYING_TONES[color]);
  return getShadeTones(shade).some(tone => amplifying.includes(tone));
}

function cancelsUnwantedTone(shade: Shade, unwanted: UnwantedTone): boolean {
  if (amplifiesUnwantedTone(shade, unwanted)) return false;
  const shadeTones = getShadeTones(shade);
  const warm = WARM_SHADE_TONES[unwanted];
  if (warm !== undefined) return shadeTones.some(tone => warm.includes(tone));
  const carried = getShadeNeutralizingColors(shade);
  return getNeutralizer(unwanted as Exclude<UnwantedTone, "green" | "blue" | "violet">, shade.line).every(part =>
    carried.has(part.color),
  );
}

function getLineShades(brand: Brand, line: string | null): Shade[] {
  return brand.shades.filter(shade => (shade.line ?? null) === line);
}

// Shades of the line at `level` whose own tone already cancels the unwanted one, and none
// of whose tones strengthens it: a toner that needs no corrector at all.
export function findNeutralizingShades(
  brand: Brand,
  line: string | null,
  unwanted: UnwantedTone,
  level: Level,
): Shade[] {
  return getLineShades(brand, line).filter(shade => shade.level === level && cancelsUnwantedTone(shade, unwanted));
}

// Shades of the line that tone hair lightened to `level`: those at that level whose own
// tone cancels the background the lightening leaves, judged as the formula calculator
// judges it (assessNeutralization: the line's own background chart, a pale yellow taking
// violet only), and none of whose tones strengthens it. Never
// a special blonde or another lifting blonde (Shade.acceptsPartialLift, Shade.highLift):
// applying one after powder is dangerous (colorist, 2026-11-19).
export function findBleachToners(brand: Brand, line: string | null, level: Level): Shade[] {
  const unwanted = getExpectedUnwantedTone(level, line);
  return getLineShades(brand, line).filter(
    shade =>
      shade.level === level &&
      shade.acceptsPartialLift !== true &&
      shade.highLift !== true &&
      !amplifiesUnwantedTone(shade, unwanted) &&
      assessNeutralization(shade, level).coverage === "full",
  );
}

// The line's mixing ratio at `level`: a shade's own fixed ratio where the line has one
// (Color Touch 1:2, Koleston's 12 series), the brand's strategy otherwise.
export function getLineMixingRatio(brand: Brand, line: string | null, startLevel: Level, level: Level): MixingRatio {
  const shades = getLineShades(brand, line);
  const atLevel = shades.find(shade => shade.level === level) ?? shades[0];
  return atLevel?.fixedMixingRatio ?? brand.mixingRatio(startLevel, level);
}

// The manufacturer's cap on corrector weight against the dye in this line, if any.
export function getLineCorrectorCap(brand: Brand, line: string | null): number | undefined {
  return getLineShades(brand, line).find(shade => shade.maxCorrectorShareOfColor !== undefined)
    ?.maxCorrectorShareOfColor;
}

// The line's own corrector dosing rule (Igora's Rule of 11), the Rule of 10 otherwise.
export function getLineCorrectorRule(brand: Brand, line: string | null): CorrectorRule {
  return getLineShades(brand, line).find(shade => shade.correctorRule !== undefined)?.correctorRule ?? "rule-of-10";
}

// Whether the line's shades at `level` all carry their own neutralization and take no
// corrector (Igora Royal's 12- series).
export function isLineSelfNeutralizingAt(brand: Brand, line: string | null, level: Level): boolean {
  const atLevel = getLineShades(brand, line).filter(shade => shade.level === level);
  return atLevel.length > 0 && atLevel.every(shade => shade.selfNeutralizing === true);
}
