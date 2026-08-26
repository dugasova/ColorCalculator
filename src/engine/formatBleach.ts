import i18n from '../i18n';
import type { Level } from './levels';
import type { BleachFormula } from './bleach';

export interface FormatBleachParams {
    startLevel: Level;
    targetLevel: Level;
    result: BleachFormula;
    processingMinutes: number;
}

// Mirrors formatFormulaText's structure/tone for a bleach (lightening powder) step, so a
// complex-coloring session that mixes bleach and color steps reads consistently.
export function formatBleachText(params: FormatBleachParams): string {
    const { startLevel, targetLevel, result, processingMinutes } = params;

    const title = `${i18n.t('bleach.titlePrefix')} ${i18n.t('bleach.titleAccent')}`;
    const developer = result.developerVolume !== null
        ? i18n.t('format.developerVolume', { value: result.developerVolume })
        : '—';

    const lines = [
        title,
        i18n.t('format.startingLevel', { start: startLevel, target: targetLevel }),
        i18n.t('format.developer', { value: developer }),
        i18n.t('format.ratio', { color: result.mixingRatio.powderParts, developer: result.mixingRatio.developerParts }),
        result.grams !== null
            ? i18n.t('format.mixValue', {
                value: i18n.t('bleach.mixValue', { powder: result.grams.powderGrams.toFixed(1), developer: result.grams.developerGrams.toFixed(1) }),
            })
            : i18n.t('format.mixFallback', {
                message: result.multiStepRequired ? i18n.t('bleach.multiStepWarning') : i18n.t('bleach.noLiftWarning'),
            }),
        i18n.t('format.processingTime', { value: processingMinutes }),
    ];

    return lines.join('\n');
}
