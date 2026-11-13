import type { Level } from "./levels";
import type { MixingRatio } from "./shades";

// Weights: the color:developer split of a mix, and the ways extra shades join or share it.

export interface FormulaGrams {
  colorGrams: number;
  developerGrams: number;
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
  const colorGrams = (totalGrams * ratio.colorParts) / totalParts;
  const developerGrams = (totalGrams * ratio.developerParts) / totalParts;
  return { colorGrams, developerGrams };
}

// Same split as calculateFormulaGrams, but starting from the dye weight the colorist
// actually wants to use (e.g. "40 g of color per root touch-up") rather than a total mix
// weight to divide up -- developer is derived to match the ratio instead of the other way
// around. Lets a colorist who needs more dye than the calculator's default total simply
// enter the dye amount they're using; see calculateFullFormula's colorGramsOverride.
export function calculateFormulaGramsFromColorGrams(colorGrams: number, ratio: MixingRatio): FormulaGrams {
  const developerGrams = (colorGrams * ratio.developerParts) / ratio.colorParts;
  return { colorGrams, developerGrams };
}

// Blends in an extra shade the colorist chooses at their own discretion (e.g. a small
// corrective addition), on top of the calculated primary mix. The colorist enters the
// additional shade's grams by hand; the developer amount is recalculated automatically so
// the color:developer ratio stays correct for the new, larger total color weight.
export function applyAdditionalShade(
  grams: FormulaGrams,
  ratio: MixingRatio,
  additionalColorGrams: number,
): FormulaGrams {
  return calculateFormulaGramsFromColorGrams(grams.colorGrams + additionalColorGrams, ratio);
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
