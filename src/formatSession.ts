import i18n from "./i18n";
import { formatFormulaText } from "./engine/formatFormula";
import { formatBleachText } from "./engine/formatBleach";
import { formatFillerStepText } from "./engine/formatPrePigmentation";
import { formatLineLabel } from "./engine/formatLineLabel";
import { STRAND_ZONE_I18N_KEY } from "./engine/strandZone";
import type { ColorHistoryStep, HistoryStep } from "./history";

export function formatCanvasText(canvas: HistoryStep["canvas"] | null): string {
  if (!canvas) return "";
  const porosityText = i18n.t(`canvas.porosity.${canvas.porosity}`);
  const thicknessText = i18n.t(`canvas.thickness.${canvas.thickness}`);
  let text = `${i18n.t("canvas.porosity.label")}: ${porosityText}\n${i18n.t("canvas.thickness.label")}: ${thicknessText}`;
  
  if (canvas.chemicalHistory.length > 0) {
    const chemText = canvas.chemicalHistory.map(ch => i18n.t(`canvas.chemicalHistory.${ch}`)).join(", ");
    text += `\n${i18n.t("canvas.chemicalHistory.label")}: ${chemText}`;
  }
  return text;
}

// Zone/starting-base recap line, prepended ahead of the rest of a step's text -- both
// fields are optional (absent on every step saved before they existed, and on a plain
// single-step FormulaCalculator save, which has no multi-zone concept at all), so this
// renders nothing unless a colorist actually set one.
function formatZoneAndBaseText(step: HistoryStep): string {
  const lines: string[] = [];
  if (step.strandZone !== undefined) {
    lines.push(i18n.t("format.strandZone", { value: i18n.t(`fields.strandZone.${STRAND_ZONE_I18N_KEY[step.strandZone]}`) }));
  }
  if (step.startingBase !== undefined) {
    const value = step.startingBase.kind === "natural"
      ? i18n.t("fields.startingBase.natural")
      : i18n.t("format.startingBaseColored", { tone: i18n.t(`palette.toneFamily.${step.startingBase.tone}`) });
    lines.push(i18n.t("format.startingBase", { value }));
  }
  return lines.join("\n");
}

function formatStepText(step: HistoryStep): string {
  const prefixText = [formatZoneAndBaseText(step), formatCanvasText(step.canvas)].filter(text => text !== "").join("\n");

  if (step.kind === "bleach") {
    const bleachText = formatBleachText({
      startLevel: step.startLevel,
      targetLevel: step.targetLevel,
      result: step.result,
      processingMinutes: step.processingMinutes,
    });
    return prefixText ? `${prefixText}\n\n${bleachText}` : bleachText;
  }

  const targetColorText = formatFormulaText({
    brandName: step.brandName,
    line: step.line,
    targetShade: step.targetShade,
    startLevel: step.startLevel,
    result: step.result,
    processingMinutes: step.processingMinutes,
    // A ComplexColoring step always carries strandZone (see ColorStepCard) -- its
    // formula text shows the zone recap line (formatZoneAndBaseText) instead, so
    // "Application: Full head" (frozen, no longer colorist-editable there) would just be
    // meaningless noise. A plain FormulaCalculator save has no strandZone at all, so it
    // keeps showing its own real applicationZone choice.
    applicationZone: step.strandZone !== undefined ? null : step.applicationZone,
    additionalShade: step.additionalShade,
    additionalShadeGrams: step.additionalShadeGrams ?? 0,
    blend: step.blend ?? null,
    neutralizationApplied: step.neutralizationApplied,
  });

  // Old docs saved before this field existed lack the `prePigmentation` key entirely,
  // reading back as `undefined` (not `null`) -- normalize the same as history.ts does.
  const prePigmentation = step.prePigmentation ?? null;
  const fillerStepText = prePigmentation !== null ? formatFillerStepText(step.targetShade.level, prePigmentation) : null;
  const combinedText = fillerStepText !== null 
    ? `${fillerStepText}\n\n${i18n.t("prePigmentation.finalStepLabel")}\n${targetColorText}`
    : targetColorText;

  return prefixText ? `${prefixText}\n\n${combinedText}` : combinedText;
}

// Renders every step of a saved (or in-progress) session as its own block. A simple
// single-step visit reads exactly like the plain single-formula text it always has; a
// complex session (e.g. bleach lift + toner) numbers each step and appends the combined
// processing time across all of them, since that's what the colorist actually needs to plan
// for a multi-hour appointment.
export function formatSessionText(steps: HistoryStep[]): string {
  const blocks = steps.map((step, index) =>
    steps.length > 1
      ? `${i18n.t("history.stepLabel", { number: index + 1 })}\n${formatStepText(step)}`
      : formatStepText(step)
  );

  if (steps.length > 1) {
    const totalMinutes = steps.reduce((sum, step) => sum + step.processingMinutes, 0);
    blocks.push(i18n.t("format.totalProcessingTime", { value: totalMinutes }));
  }

  return blocks.join("\n\n");
}

// A one-line "at a glance" headline for a History client card, shown above the full
// step-by-step formatSessionText block below it: the session's starting level and its
// final visual result. "Target" favors the last color step's actual brand/line/shade
// (e.g. "Wella Koleston Perfect — 7/17") over a bare level number, since that's the
// product a colorist scanning past visits actually wants to see -- a bleach-only
// session (no toning step) falls back to its last step's plain target level, since
// there is no product/shade to name in that case.
//
// A multi-zone session (see engine/strandZone.ts) legitimately has a *different*
// startLevel per step -- e.g. root 6 / mid-lengths 8 / ends 10. Collapsing that to just
// `steps[0].startLevel` (the root's) paired with the *last* step's target (the ends')
// would read as one wildly wrong formula ("Starting level: 6 → Target: 10.13") that
// never actually existed. When start levels differ, show the honest min–max range
// instead of picking one arbitrarily; the full per-step detail (with each step's own
// zone label) is right below in formatSessionText regardless.
export function formatSessionSummary(steps: HistoryStep[]): string {
  const startLevels = steps.map(step => step.startLevel);
  const minStart = Math.min(...startLevels);
  const maxStart = Math.max(...startLevels);
  const lastColorStep = [...steps].reverse().find((step): step is ColorHistoryStep => step.kind === "color");
  const lastStep = steps[steps.length - 1];
  const target = lastColorStep !== undefined
    ? `${lastColorStep.brandName}${lastColorStep.line ? " " + formatLineLabel(lastColorStep.line) : ""} — ${lastColorStep.targetShade.code}`
    : String(lastStep.kind === "bleach" ? lastStep.targetLevel : lastStep.targetShade.level);
  return minStart === maxStart
    ? i18n.t("format.startingLevel", { start: minStart, target })
    : i18n.t("format.startingLevelRange", { start: minStart, end: maxStart, target });
}
