import i18n from './i18n';
import { formatFormulaText } from './engine/formatFormula';
import { formatBleachText } from './engine/formatBleach';
import { formatFillerStepText } from './engine/formatPrePigmentation';
import { formatLineLabel } from './engine/formatLineLabel';
import type { ColorHistoryStep, HistoryStep } from './history';

function formatStepText(step: HistoryStep): string {
    if (step.kind === 'bleach') {
        return formatBleachText({
            startLevel: step.startLevel,
            targetLevel: step.targetLevel,
            result: step.result,
            processingMinutes: step.processingMinutes,
        });
    }

    const targetColorText = formatFormulaText({
        brandName: step.brandName,
        line: step.line,
        targetShade: step.targetShade,
        startLevel: step.startLevel,
        result: step.result,
        processingMinutes: step.processingMinutes,
        applicationZone: step.applicationZone,
        additionalShade: step.additionalShade,
        additionalShadeGrams: step.additionalShadeGrams ?? 0,
        blend: step.blend ?? null,
        neutralizationApplied: step.neutralizationApplied,
    });

    // Old docs saved before this field existed lack the `prePigmentation` key entirely,
    // reading back as `undefined` (not `null`) -- normalize the same as history.ts does.
    const prePigmentation = step.prePigmentation ?? null;
    if (prePigmentation === null) return targetColorText;

    const fillerStepText = formatFillerStepText(step.targetShade.level, prePigmentation);
    if (fillerStepText === null) return targetColorText;

    return `${fillerStepText}\n\n${i18n.t('prePigmentation.finalStepLabel')}\n${targetColorText}`;
}

// Renders every step of a saved (or in-progress) session as its own block. A simple
// single-step visit reads exactly like the plain single-formula text it always has; a
// complex session (e.g. bleach lift + toner) numbers each step and appends the combined
// processing time across all of them, since that's what the colorist actually needs to plan
// for a multi-hour appointment.
export function formatSessionText(steps: HistoryStep[]): string {
    const blocks = steps.map((step, index) =>
        steps.length > 1
            ? `${i18n.t('history.stepLabel', { number: index + 1 })}\n${formatStepText(step)}`
            : formatStepText(step)
    );

    if (steps.length > 1) {
        const totalMinutes = steps.reduce((sum, step) => sum + step.processingMinutes, 0);
        blocks.push(i18n.t('format.totalProcessingTime', { value: totalMinutes }));
    }

    return blocks.join('\n\n');
}

// A one-line "at a glance" headline for a History client card, shown above the full
// step-by-step formatSessionText block below it: the session's starting level and its
// final visual result. "Target" favors the last color step's actual brand/line/shade
// (e.g. "Wella Koleston Perfect — 7/17") over a bare level number, since that's the
// product a colorist scanning past visits actually wants to see -- a bleach-only
// session (no toning step) falls back to its last step's plain target level, since
// there is no product/shade to name in that case.
export function formatSessionSummary(steps: HistoryStep[]): string {
    const startLevel = steps[0].startLevel;
    const lastColorStep = [...steps].reverse().find((step): step is ColorHistoryStep => step.kind === 'color');
    const lastStep = steps[steps.length - 1];
    const target = lastColorStep !== undefined
        ? `${lastColorStep.brandName}${lastColorStep.line ? ' ' + formatLineLabel(lastColorStep.line) : ''} — ${lastColorStep.targetShade.code}`
        : String(lastStep.kind === 'bleach' ? lastStep.targetLevel : lastStep.targetShade.level);
    return i18n.t('format.startingLevel', { start: startLevel, target });
}
