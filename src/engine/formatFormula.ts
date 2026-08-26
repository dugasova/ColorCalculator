import i18n from '../i18n';
import type { Level } from './levels';
import type { Shade } from './shades';
import type { FullFormula, FormulaGrams } from './formula';
import type { ApplicationZone } from './applicationZone';
import { formatLineLabel } from './formatLineLabel';

export interface FormatFormulaParams {
    brandName: string;
    line: string | null;
    targetShade: Shade;
    startLevel: Level;
    result: FullFormula;
    processingMinutes: number;
    applicationZone: ApplicationZone;
    additionalShade: Shade | null;
    additionalShadeGrams: number;
    neutralizationApplied: boolean;
}

// Renders the mix as a per-shade breakdown (e.g. "7/71-30.0 g 7/17-15.0 g developer 45.0 g")
// rather than a generic "color vs developer" split, so the colorist can read exactly how
// much of each shade — including any additional shade blended in at their discretion — to
// weigh out. `grams.colorGrams` already includes the additional shade's grams (see
// applyAdditionalShade), so it's subtracted back out here to get the primary shade's share.
export function buildMixSummary(
    targetShade: Shade,
    grams: FormulaGrams,
    additionalShade: Shade | null,
    additionalShadeGrams: number,
): string {
    const hasAdditional = additionalShade !== null && additionalShadeGrams > 0;
    const primaryGrams = hasAdditional ? grams.colorGrams - additionalShadeGrams : grams.colorGrams;

    const parts = [i18n.t('format.mixShade', { code: targetShade.code, grams: primaryGrams.toFixed(1) })];
    if (hasAdditional) {
        parts.push(i18n.t('format.mixShade', { code: additionalShade.code, grams: additionalShadeGrams.toFixed(1) }));
    }
    parts.push(i18n.t('format.mixDeveloper', { grams: grams.developerGrams.toFixed(1) }));

    return parts.join(' ');
}

export function formatFormulaText(params: FormatFormulaParams): string {
    const {
        brandName, line, targetShade, startLevel, result, processingMinutes, applicationZone,
        additionalShade, additionalShadeGrams, neutralizationApplied,
    } = params;

    const title = `${brandName}${line ? ' ' + formatLineLabel(line) : ''} — ${targetShade.code} (${targetShade.tone}${targetShade.secondaryTone ? '/' + targetShade.secondaryTone : ''})`;

    const developer = result.developerVolume !== null
        ? i18n.t('format.developerVolume', { value: result.developerVolume })
        : '—';

    const applyNeutralization = neutralizationApplied && result.recommendedCorrectiveTone !== null;
    const correctiveToneLine = applyNeutralization
        ? i18n.t('format.neutralizationApplied', { grams: result.correctorGrams, tone: result.recommendedCorrectiveTone })
        : i18n.t('format.recommendedTone', {
            value: result.recommendedCorrectiveTone !== null
                ? i18n.t('results.recommendedToneValue', { grams: result.correctorGrams, tone: result.recommendedCorrectiveTone })
                : i18n.t('results.none'),
        });

    const lines = [
        title,
        i18n.t('format.startingLevel', { start: startLevel, target: targetShade.level }),
        i18n.t('format.applicationZone', {
            value: applicationZone === 'full-head' ? i18n.t('fields.applicationZoneFullHead') : i18n.t('fields.applicationZoneRootTouchUp'),
        }),
        i18n.t('format.developer', { value: developer }),
        i18n.t('format.ratio', { color: result.mixingRatio.colorParts, developer: result.mixingRatio.developerParts }),
        result.grams !== null
            ? i18n.t('format.mixValue', { value: buildMixSummary(targetShade, result.grams, additionalShade, additionalShadeGrams) })
            : i18n.t('format.mixFallback', { message: result.liftUnsupportedWarning ?? i18n.t('results.notAchievable') }),
        i18n.t('format.processingTime', { value: processingMinutes }),
        i18n.t('format.grayCoverage', {
            note: result.grayCoverage.note,
            natural: Math.round(result.grayCoverage.naturalRatio * 100),
            fashion: Math.round(result.grayCoverage.fashionRatio * 100),
        }),
        correctiveToneLine,
    ];

    if (result.toneWarning !== null && !applyNeutralization) {
        lines.push(i18n.t('format.warning', { message: result.toneWarning }));
    }
    if (result.eligibilityWarning !== null) {
        lines.push(i18n.t('format.warning', { message: result.eligibilityWarning }));
    }

    return lines.join('\n');
}
