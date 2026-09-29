import { calculateProductCost } from "./engine/pricing";
import type { ColorHistoryStep, HistoryStep } from "./history";

// 1 whenever no actual figure was recorded (or the step has no computed grams to scale
// against), so every derived number is byte-identical to pre-feature behavior; otherwise
// the ratio the colorist's actually-weighed dye is scaled by against the computed dye
// grams.
export function actualGramsScale(step: ColorHistoryStep): number {
  const grams = step.result.grams;
  const actual = step.actualColorGrams;
  if (grams === null || grams === undefined) return 1;
  if (typeof actual !== "number" || actual < 0 || grams.colorGrams <= 0) return 1;
  return actual / grams.colorGrams;
}

// Priced product weight for one step, actual-aware: the dye (or bleach powder) actually
// consumed, plus any pre-pigmentation filler mixed on top -- never the developer/diluent
// blended in alongside it. A salon buys and prices its developer/diluent completely
// separately from the dye/powder/filler tube itself (see BrandStockList's own developer-
// vs-shade distinction), so charging it at the dye's per-gram price would overstate the
// real product cost. 0 for a step with no computed grams, matching the aggregation this
// replaces (ComplexColoringCalculator's private stepTotalGrams).
export function stepTotalGrams(step: HistoryStep): number {
  if (step.kind === "bleach") {
    const grams = step.result.grams;
    return grams === null ? 0 : grams.powderGrams;
  }
  const grams = step.result.grams;
  if (grams === null || grams === undefined) return 0;
  const scale = actualGramsScale(step);
  const colorGrams = scale === 1 ? grams.colorGrams : Math.round(grams.colorGrams * scale * 10) / 10;
  const fillerGrams = step.prePigmentation?.grams?.fillerGrams ?? 0;
  return colorGrams + fillerGrams;
}

// Null for an empty session, same as the callers' existing `steps.length > 0 ? ... : null`.
export function calculateSessionProductCost(steps: HistoryStep[]): number | null {
  if (steps.length === 0) return null;
  return steps.reduce((sum, step) => sum + calculateProductCost(stepTotalGrams(step), step.pricePerGram), 0);
}
