import type { DeveloperVolume } from "./levels";
import type { Shade } from "./shades";

// Gray coverage: how much natural base a gray percentage calls for, the developer floor
// that goes with it, and the natural shade actually dosed into a formula.

export interface GrayCoverageStrategy {
  naturalRatio: number;
  fashionRatio: number;
}

export const GRAY_LIGHT_THRESHOLD = 30;
export const GRAY_MEDIUM_THRESHOLD = 50;
export const GRAY_HEAVY_THRESHOLD = 80;

// Wella's own Koleston Perfect / Welloxon Perfect developer guide requires at least 6%
// (20 vol) to properly cover resistant gray/white hair, even when the target is the same
// depth or darker (no lift) - where the level-diff-only pickDeveloperVolume (levels.ts)
// would otherwise pick the gentlest 3% (10 vol), which isn't strong enough to open the
// cuticle and deposit oxidative pigment into resistant gray. Applied as a floor in
// calculateFullFormula (formula.ts) once gray coverage is significant (the same >=30% threshold
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
const FASHION_ONLY: GrayCoverageStrategy = Object.freeze({ naturalRatio: 0, fashionRatio: 1 });
const ONE_THIRD_NATURAL: GrayCoverageStrategy = Object.freeze({ naturalRatio: 1 / 3, fashionRatio: 2 / 3 });
const HALF_NATURAL: GrayCoverageStrategy = Object.freeze({ naturalRatio: 0.5, fashionRatio: 0.5 });

export function getGrayCoverageStrategy(grayPercent: number): GrayCoverageStrategy {
  if (grayPercent < GRAY_LIGHT_THRESHOLD) {
    return FASHION_ONLY;
  }
  if (grayPercent < GRAY_MEDIUM_THRESHOLD) {
    return ONE_THIRD_NATURAL;
  }
  return HALF_NATURAL;
}

// The natural shade actually dosed into a formula for gray coverage, and its grams --
// already carved out of the base color weight (see splitNaturalBase), never on top of it.
export interface NaturalBase {
  shade: Shade;
  grams: number;
}

export interface NaturalBaseSplit {
  fashionGrams: number;
  naturalGrams: number;
}

// Carves the gray-coverage natural-base dose (see getGrayCoverageStrategy) out of the
// already-calculated base color weight -- Wella's Pure Naturals guide doses the natural
// shade as a share *of* the color, so the total (and with it developer and cost) stays
// exactly what calculateFullFormula produced, same as splitShadeBlend (formulaGrams.ts). Any
// discretionary additional shade is applied on top afterwards, never split here.
export function splitNaturalBase(baseColorGrams: number, naturalRatio: number): NaturalBaseSplit {
  const ratio = Math.min(1, Math.max(0, naturalRatio));
  return {
    fashionGrams: baseColorGrams * (1 - ratio),
    naturalGrams: baseColorGrams * ratio,
  };
}

// A plain or double natural (7/0, 7/00, 7N, 7NN) -- not a natural with a fashion
// reflect on top (7/01). Such a target already is its own natural base.
export function isPureNatural(shade: Shade): boolean {
  return shade.tone === "natural" && (shade.secondaryTone === undefined || shade.secondaryTone === "natural");
}

// The natural shades a colorist can dose into `targetShade` for gray coverage: same line
// (`lineShades`), same level as the target. Double-natural shades (Wella /00, Redken NN --
// the "Pure Naturals" the gray-coverage guide is built around) come first, so the first
// entry is the default pick; plain naturals (/0, N) follow. Empty when the target is
// itself natural (nothing to split) or the line has no natural at that level.
export function findNaturalBaseCandidates(targetShade: Shade, lineShades: Shade[]): Shade[] {
  if (isPureNatural(targetShade)) return [];
  const naturals = lineShades.filter(s => s.level === targetShade.level && isPureNatural(s));
  return [
    ...naturals.filter(s => s.secondaryTone === "natural"),
    ...naturals.filter(s => s.secondaryTone === undefined),
  ];
}
