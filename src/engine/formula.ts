import {
  getUnderlyingPigment,
  pickDeveloperVolume,
  pickMaxLiftVolume,
  type DeveloperVolume,
  type Level,
  type UnderlyingPigment,
} from "./levels";
import { suggestNeutralizingTone } from "./neutralize";
import { calculateCorrectorGrams } from "./correction";
import type { Porosity } from "./canvas";
import { sameMixingRatio, type MixingRatio, type Shade, type ToneFamily } from "./shades";
import {
  GRAY_COVERAGE_MIN_DEVELOPER_VOLUME,
  GRAY_LIGHT_THRESHOLD,
  GRAY_MEDIUM_THRESHOLD,
  getGrayCoverageStrategy,
  type GrayCoverageStrategy,
} from "./grayCoverage";
import {
  calculateFormulaGrams,
  calculateFormulaGramsFromColorGrams,
  getMixingRatio,
  type FormulaGrams,
} from "./formulaGrams";

// The full color formula: developer, ratio, grams, corrective guidance and warnings for
// one target shade. Gray-coverage rules live in ./grayCoverage and weight splits in
// ./formulaGrams; both are re-exported here so callers keep a single import.
export * from "./grayCoverage";
export * from "./formulaGrams";

// The engine reports warnings as data, never as text: each one carries only the
// language-independent values its message is built from, and the UI layer renders it in
// the current language (see format/formulaMessages.ts). A saved history entry therefore
// never freezes a warning in whatever language was active at save time.
//
// The chosen tone won't neutralize the pigment that lifting reveals.
export interface ToneWarning {
  tone: ToneFamily;
  pigment: UnderlyingPigment;
  recommended: ToneFamily;
}

// The shade needs a lighter natural base than the starting level (Shade.minStartLevel).
export interface EligibilityWarning {
  code: string;
  minLevel: Level;
  startLevel: Level;
}

// A deposit-only line (Shade.developerVolumeChoices) was asked to lift.
export interface LiftUnsupportedWarning {
  code: string;
  level: Level;
  startLevel: Level;
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
  toneWarning: ToneWarning | null;
  eligibilityWarning: EligibilityWarning | null;
  liftUnsupportedWarning: LiftUnsupportedWarning | null;
  grams: FormulaGrams | null;
  // Set when porosity changed what the level/gray rules alone would have recommended
  // (see applyPorosity). Absent on every result saved before porosity fed the formula.
  porosityAdjustment?: PorosityAdjustment | null;
}

// How the hair's porosity changed the recommendation, reported as data like the warnings
// above so the UI can explain it in the current language.
//  - high: `developerVolume` is one grade gentler than `fromDeveloperVolume`.
//  - low: `recommendedProcessingMinutes` already includes `addedMinutes`.
export type PorosityAdjustment =
  | { kind: "developer-lowered"; fromDeveloperVolume: DeveloperVolume }
  | { kind: "processing-extended"; addedMinutes: number };

// Processing time recommendations mirror standard manufacturer instructions: a shade's own
// `fixedProcessingMinutes` (e.g. Wella Special Blonde's 50-60 min without heat, see
// brands/wella.ts) wins outright when set; otherwise demi-permanent, deposit-only lines
// (e.g. Wella Color Touch, identified by developerVolumeChoices) process in 20 minutes,
// and permanent color processes in 30 minutes, extended to 45 for resistant/heavy gray
// coverage (the same >=50% gray threshold that drives the half-natural Pure Naturals dose, see grayCoverage.ts).
const DEMI_PERMANENT_PROCESSING_MINUTES = 20;
const STANDARD_PROCESSING_MINUTES = 30;
const EXTENDED_PROCESSING_MINUTES = 45;

// Highly porous hair (raised or damaged cuticle) takes developer faster and lifts more
// easily, so the auto-picked developer drops one grade on the 10/20/30/40 vol ladder --
// never below 10 vol, and never below GRAY_COVERAGE_MIN_DEVELOPER_VOLUME once gray
// coverage calls for that floor: unopened gray won't take pigment, which is worse than a
// slightly strong developer. The lift itself is treated as unchanged (the gentler
// developer reaches the same level on porous hair).
const POROSITY_DEVELOPER_LADDER: DeveloperVolume[] = [10, 20, 30, 40];

// Low-porosity (tight, glassy cuticle) hair takes pigment slowly: the developer stays as
// picked and the recommended time is extended instead.
export const LOW_POROSITY_EXTRA_PROCESSING_MINUTES = 5;

function lowerDeveloperForHighPorosity(volume: DeveloperVolume, grayPercent: number): DeveloperVolume {
  const index = POROSITY_DEVELOPER_LADDER.indexOf(volume);
  if (index <= 0) return volume;
  const lowered = POROSITY_DEVELOPER_LADDER[index - 1];
  if (grayPercent >= GRAY_LIGHT_THRESHOLD && lowered < GRAY_COVERAGE_MIN_DEVELOPER_VOLUME) return volume;
  return lowered;
}

// Applies porosity on top of the developer/time the level and gray rules produced. Leaves
// alone whatever the product line or the colorist fixed rather than the calculator
// picking it: a manually chosen developer (Shade.developerVolumeChoices), a line's own
// no-lift developer (Shade.noLiftDeveloperVolume), and a manufacturer-fixed processing
// time (Shade.fixedProcessingMinutes).
function applyPorosity(
  porosity: Porosity,
  targetShade: Shade,
  grayPercent: number,
  isLifting: boolean,
  developerVolume: DeveloperVolume | null,
  recommendedProcessingMinutes: number,
): {
  developerVolume: DeveloperVolume | null;
  recommendedProcessingMinutes: number;
  adjustment: PorosityAdjustment | null;
} {
  const unchanged = { developerVolume, recommendedProcessingMinutes, adjustment: null };
  if (developerVolume === null) return unchanged;

  if (porosity === "high") {
    const developerIsFixed =
      targetShade.developerVolumeChoices !== undefined ||
      (!isLifting && targetShade.noLiftDeveloperVolume !== undefined);
    if (developerIsFixed) return unchanged;
    const lowered = lowerDeveloperForHighPorosity(developerVolume, grayPercent);
    if (lowered === developerVolume) return unchanged;
    return {
      developerVolume: lowered,
      recommendedProcessingMinutes,
      adjustment: { kind: "developer-lowered", fromDeveloperVolume: developerVolume },
    };
  }

  if (porosity === "low" && targetShade.fixedProcessingMinutes === undefined) {
    return {
      developerVolume,
      recommendedProcessingMinutes: recommendedProcessingMinutes + LOW_POROSITY_EXTRA_PROCESSING_MINUTES,
      adjustment: { kind: "processing-extended", addedMinutes: LOW_POROSITY_EXTRA_PROCESSING_MINUTES },
    };
  }

  return unchanged;
}

export function getRecommendedProcessingMinutes(targetShade: Shade, grayPercent: number): number {
  if (targetShade.fixedProcessingMinutes !== undefined) {
    return targetShade.fixedProcessingMinutes;
  }
  if (targetShade.developerVolumeChoices !== undefined) {
    return DEMI_PERMANENT_PROCESSING_MINUTES;
  }
  return grayPercent >= GRAY_MEDIUM_THRESHOLD ? EXTENDED_PROCESSING_MINUTES : STANDARD_PROCESSING_MINUTES;
}

// Step 1 of calculateFullFormula: the developer volume before any partial-lift fallback.
// A shade with its own developerVolumeChoices (demi-permanent lines) always defers to
// the colorist's manual pick instead of the auto-picked ladder -- including when the
// target is lighter than the start level (see liftUnsupportedWarning in
// calculateFullFormula): such a line can't lift, but a colorist may go ahead anyway, and
// the developer they chose is what must be mixed and recorded. Otherwise picks via the
// level-diff lift ladder, then applies two floors: gray coverage forces at least
// GRAY_COVERAGE_MIN_DEVELOPER_VOLUME (Wella/Welloxon's own resistant-gray guidance, see
// grayCoverage.ts), and a same-depth-or-darker shade with its own noLiftDeveloperVolume
// uses that instead of the ladder's gentlest default.
function resolveDeveloperVolume(
  startLevel: Level,
  targetShade: Shade,
  grayPercent: number,
  isLifting: boolean,
  manualDeveloperVolume: DeveloperVolume | undefined,
): DeveloperVolume | null {
  if (targetShade.developerVolumeChoices !== undefined) return manualDeveloperVolume ?? null;

  const autoPicked = pickDeveloperVolume(startLevel, targetShade.level, targetShade.developerLiftTable);
  if (autoPicked === null) return null;
  if (grayPercent >= GRAY_LIGHT_THRESHOLD && autoPicked < GRAY_COVERAGE_MIN_DEVELOPER_VOLUME) {
    return GRAY_COVERAGE_MIN_DEVELOPER_VOLUME;
  }
  if (!isLifting && targetShade.noLiftDeveloperVolume !== undefined) {
    return targetShade.noLiftDeveloperVolume;
  }
  return autoPicked;
}

// Step 2: Special Blonde-style "maximum lift" shades (Shade.acceptsPartialLift) are
// routinely chosen purely to lift as far as a single process safely allows, not to
// guarantee this shade's own nominal level - e.g. Special Blonde from level 5 toward
// level 12, even though its own 12%-developer ceiling only reaches level 10. Falls back
// to the strongest developer the shade's own lift table supports and reports the level
// it actually reaches, rather than refusing to compute a formula at all just because the
// nominal target is out of reach. `developerVolume` here is Step 1's result -- once it's
// non-null, the nominal target is already fully reachable, so achievedLevel is just the
// shade's own level and no fallback is needed.
function resolvePartialLiftFallback(
  startLevel: Level,
  targetShade: Shade,
  isLifting: boolean,
  developerVolume: DeveloperVolume | null,
): { developerVolume: DeveloperVolume | null; achievedLevel: Level | null } {
  if (developerVolume !== null) return { developerVolume, achievedLevel: targetShade.level };
  if (!isLifting || targetShade.acceptsPartialLift !== true || targetShade.developerLiftTable === undefined) {
    return { developerVolume: null, achievedLevel: null };
  }
  const fallbackVolume = pickMaxLiftVolume(targetShade.developerLiftTable);
  const fallbackLift = targetShade.developerLiftTable(fallbackVolume);
  if (fallbackLift <= 0) return { developerVolume: null, achievedLevel: null };
  return { developerVolume: fallbackVolume, achievedLevel: (startLevel + fallbackLift) as Level };
}

// Step 3: no pigment is actually revealed if the line can't lift in the first place, or
// lifts to nowhere (achievedLevel null alongside developerVolume null) -- underlying
// pigment, corrective tone, corrector grams, and the tone-mismatch warning only make
// sense once real lift happened.
function deriveCorrectiveGuidance(
  targetShade: Shade,
  isActuallyLifting: boolean,
  achievedLevel: Level | null,
  totalGrams: number,
): {
  underlyingPigment: UnderlyingPigment | null;
  recommendedCorrectiveTone: ToneFamily | null;
  correctorGrams: number | null;
  toneWarning: ToneWarning | null;
} {
  const underlyingPigment = isActuallyLifting && achievedLevel !== null ? getUnderlyingPigment(achievedLevel) : null;
  const recommendedCorrectiveTone = underlyingPigment !== null ? suggestNeutralizingTone(underlyingPigment) : null;
  const correctorGrams =
    recommendedCorrectiveTone !== null && achievedLevel !== null
      ? calculateCorrectorGrams(achievedLevel, totalGrams)
      : null;
  const toneWarning =
    underlyingPigment !== null && recommendedCorrectiveTone !== null && recommendedCorrectiveTone !== targetShade.tone
      ? { tone: targetShade.tone, pigment: underlyingPigment, recommended: recommendedCorrectiveTone }
      : null;
  return { underlyingPigment, recommendedCorrectiveTone, correctorGrams, toneWarning };
}

// A manual ratio only counts when the shade actually offers it (Shade.mixingRatioChoices);
// otherwise the shade's own fixed ratio, or the brand's level-diff strategy, decides.
function resolveMixingRatio(
  startLevel: Level,
  targetShade: Shade,
  mixingRatioStrategy: (startLevel: Level, targetLevel: Level) => MixingRatio,
  manualMixingRatio: MixingRatio | undefined,
): MixingRatio {
  if (
    manualMixingRatio !== undefined &&
    targetShade.mixingRatioChoices?.some(choice => sameMixingRatio(choice, manualMixingRatio))
  ) {
    return manualMixingRatio;
  }
  return targetShade.fixedMixingRatio ?? mixingRatioStrategy(startLevel, targetShade.level);
}

export interface FullFormulaInput {
  startLevel: Level;
  targetShade: Shade;
  grayPercent: number;
  totalGrams: number;
  // The brand's level-diff ratio strategy (Brand.mixingRatio); the generic one by default.
  mixingRatioStrategy?: (startLevel: Level, targetLevel: Level) => MixingRatio;
  manualDeveloperVolume?: DeveloperVolume;
  manualMixingRatio?: MixingRatio;
  // Lets a colorist enter the dye weight directly (e.g. "40 g of color per root
  // touch-up") instead of a total mix weight -- developer is then derived from it via
  // the resolved ratio (see calculateFormulaGramsFromColorGrams) rather than backed out
  // of `totalGrams`. When set, `totalGrams` is still used for anything unrelated to the
  // color:developer split itself (e.g. corrector grams), scaled to match the resulting
  // real total so those figures stay proportional to what's actually being mixed.
  colorGramsOverride?: number;
  // The hair's porosity (HairCanvas.porosity); "normal" leaves the formula as the level
  // and gray rules alone produce it. See applyPorosity.
  porosity?: Porosity;
}

export function calculateFullFormula({
  startLevel,
  targetShade,
  grayPercent,
  totalGrams,
  mixingRatioStrategy = getMixingRatio,
  manualDeveloperVolume,
  manualMixingRatio,
  colorGramsOverride,
  porosity = "normal",
}: FullFormulaInput): FullFormula {
  const isLifting = targetShade.level > startLevel;
  const mixingRatio = resolveMixingRatio(startLevel, targetShade, mixingRatioStrategy, manualMixingRatio);
  const grayCoverage = getGrayCoverageStrategy(grayPercent);

  const liftUnsupportedWarning =
    targetShade.developerVolumeChoices !== undefined && isLifting
      ? { code: targetShade.code, level: targetShade.level, startLevel }
      : null;

  const pickedVolume = resolveDeveloperVolume(startLevel, targetShade, grayPercent, isLifting, manualDeveloperVolume);
  const { developerVolume: levelDeveloperVolume, achievedLevel: reachableLevel } = resolvePartialLiftFallback(
    startLevel,
    targetShade,
    isLifting,
    pickedVolume,
  );
  // A line that can't lift, mixed anyway with the developer the colorist picked, only
  // deposits: the hair stays at its starting level rather than reaching the shade's own.
  const achievedLevel = liftUnsupportedWarning !== null && levelDeveloperVolume !== null ? startLevel : reachableLevel;
  const {
    developerVolume,
    recommendedProcessingMinutes,
    adjustment: porosityAdjustment,
  } = applyPorosity(
    porosity,
    targetShade,
    grayPercent,
    isLifting,
    levelDeveloperVolume,
    getRecommendedProcessingMinutes(targetShade, grayPercent),
  );

  // No pigment is actually revealed if the line can't lift in the first place, or lifts
  // to nowhere (achievedLevel null alongside developerVolume null).
  const isActuallyLifting = isLifting && liftUnsupportedWarning === null && achievedLevel !== null;
  const grams =
    developerVolume !== null
      ? colorGramsOverride !== undefined
        ? calculateFormulaGramsFromColorGrams(colorGramsOverride, mixingRatio)
        : calculateFormulaGrams(totalGrams, mixingRatio)
      : null;
  // Corrector grams scale with the real mix total when the dye weight was entered directly.
  const correctorBaseGrams =
    colorGramsOverride !== undefined && grams !== null ? grams.colorGrams + grams.developerGrams : totalGrams;
  const { underlyingPigment, recommendedCorrectiveTone, correctorGrams, toneWarning } = deriveCorrectiveGuidance(
    targetShade,
    isActuallyLifting,
    achievedLevel,
    correctorBaseGrams,
  );
  const eligibilityWarning =
    targetShade.minStartLevel !== undefined && startLevel < targetShade.minStartLevel
      ? { code: targetShade.code, minLevel: targetShade.minStartLevel, startLevel }
      : null;

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
    porosityAdjustment,
  };
}
