import type { FullFormula, NaturalBase } from "../../engine/formula";
import type { Shade } from "../../engine/shades";
import type { Level } from "../../engine/levels";
import type { BrandId } from "../../engine/brands";
import type { HairCanvas } from "../../engine/canvas";
import type { BlendSummary } from "../../format/formatFormula";

// The grouped inputs of the results panel (FormulaResults) and of the save that goes with
// it (useFormulaSave). Each group is one thing the colorist decided on the form above.

// Which product the formula is mixed from.
export interface FormulaProduct {
  brandId: BrandId;
  brandName: string;
  line: string | null;
}

// The client's hair the formula was calculated for.
export interface FormulaHair {
  startLevel: Level;
  grayPercent: number;
  canvas: HairCanvas;
}

// What goes into the bowl: the calculated result and every shade that is part of it.
export interface FormulaMix {
  targetShade: Shade;
  result: FullFormula;
  additionalShade: Shade | null;
  additionalShadeGrams: number;
  additionalShade2?: Shade | null;
  additionalShade2Grams?: number;
  blend: BlendSummary | null;
  // The gray-coverage natural base, if opted in (see GrayNaturalField) -- already carved
  // out of `result.grams`, so it only changes the per-shade breakdown, not the totals.
  naturalBase: NaturalBase | null;
}

// The figures of the pricing block. Each has a default the colorist can replace by hand
// (see usePricing).
export interface FormulaPricing {
  pricePerGram: number;
  markupMultiplier: number;
  productCost: number | null;
  recommendedServicePrice: number | null;
  servicePrice: number | null;
}

export interface FormulaPricingHandlers {
  onPricePerGramChange: (value: number) => void;
  onMarkupMultiplierChange: (value: number) => void;
  onServicePriceChange: (value: number) => void;
}
