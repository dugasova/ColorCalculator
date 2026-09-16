import { calculateProductCost } from "./engine/pricing";
import type { ColorHistoryStep, HistoryStep } from "./history";

// 1 whenever no actual figure was recorded (or the step has no computed grams to scale
// against), so every derived number is byte-identical to pre-feature behavior; otherwise
// the ratio the whole mix is scaled by -- developer included, since it was mixed to this
// step's ratio against the dye actually weighed.
export function actualGramsScale(step: ColorHistoryStep): number {
  const grams = step.result.grams;
  const actual = step.actualColorGrams;
  if (grams === null || grams === undefined) return 1;
  if (typeof actual !== "number" || actual < 0 || grams.colorGrams <= 0) return 1;
  return actual / grams.colorGrams;
}

// Total weighed product (dye/powder + developer) for one step, actual-aware. 0 for a step
// with no computed grams, matching the aggregation this replaces
// (ComplexColoringCalculator's private stepTotalGrams).
export function stepTotalGrams(step: HistoryStep): number {
  if (step.kind === "bleach") {
    const grams = step.result.grams;
    return grams === null ? 0 : grams.powderGrams + grams.developerGrams;
  }
  const grams = step.result.grams;
  if (grams === null || grams === undefined) return 0;
  const scale = actualGramsScale(step);
  const total = grams.colorGrams + grams.developerGrams;
  return scale === 1 ? total : Math.round(total * scale * 10) / 10;
}

// Null for an empty session, same as the callers' existing `steps.length > 0 ? ... : null`.
export function calculateSessionProductCost(steps: HistoryStep[]): number | null {
  if (steps.length === 0) return null;
  return steps.reduce((sum, step) => sum + calculateProductCost(stepTotalGrams(step), step.pricePerGram), 0);
}
