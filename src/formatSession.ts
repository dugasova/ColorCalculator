import i18n from './i18n';
import { formatFormulaText } from './engine/formatFormula';
import { formatBleachText } from './engine/formatBleach';
import type { HistoryStep } from './history';

function formatStepText(step: HistoryStep): string {
    if (step.kind === 'bleach') {
        return formatBleachText({
            startLevel: step.startLevel,
            targetLevel: step.targetLevel,
            result: step.result,
            processingMinutes: step.processingMinutes,
        });
    }
    return formatFormulaText({
        brandName: step.brandName,
        line: step.line,
        targetShade: step.targetShade,
        startLevel: step.startLevel,
        result: step.result,
        processingMinutes: step.processingMinutes,
        applicationZone: step.applicationZone,
        additionalShade: step.additionalShade,
        additionalShadeGrams: step.additionalShadeGrams ?? 0,
        neutralizationApplied: step.neutralizationApplied,
    });
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
