import i18n from '../i18n';
import type { Level } from './levels';
import type { PrePigmentationResult } from './prePigmentation';

export interface FormatPrePigmentationParams {
  startLevel: Level;
  targetLevel: Level;
  result: PrePigmentationResult;
}

// Mirrors formatBleachText's structure/tone for a pre-pigmentation (filler) step, so a
// two-stage darkening session reads as a consistent two-part formula: the filler step
// first, then the target color step reusing the shared format.* lines.
export function formatPrePigmentationText(params: FormatPrePigmentationParams): string {
  const { startLevel, targetLevel, result } = params;

  const title = `${i18n.t('prePigmentation.titlePrefix')} ${i18n.t('prePigmentation.titleAccent')}`;
  const lines = [
    title,
    i18n.t('format.startingLevel', { start: startLevel, target: targetLevel }),
    i18n.t('prePigmentation.needValue', { value: i18n.t(`prePigmentation.need.${result.need}`) }),
  ];

  if (result.need !== 'none' && result.underlyingPigment !== null && result.fillerTone !== null
    && result.mixingRatio !== null && result.grams !== null && result.fillerProcessingMinutes !== null) {
    const fillerToneName = i18n.t(`palette.toneFamily.${result.fillerTone}`);
    lines.push(
      i18n.t('prePigmentation.fillerSectionLabel'),
      i18n.t('prePigmentation.underlyingPigmentValue', { value: result.underlyingPigment }),
      i18n.t('prePigmentation.fillerToneValue', { value: fillerToneName }),
      result.exampleFillerShade !== null
        ? i18n.t('prePigmentation.exampleFillerShadeValue', { code: result.exampleFillerShade.code, tone: fillerToneName })
        : i18n.t('prePigmentation.noExampleFillerShade', { tone: fillerToneName, level: targetLevel }),
      i18n.t('format.ratio', { color: result.mixingRatio.fillerParts, developer: result.mixingRatio.diluentParts }),
      i18n.t('format.mixValue', {
        value: i18n.t('prePigmentation.fillerMixValue', {
          filler: result.grams.fillerGrams.toFixed(1),
          diluent: result.grams.diluentGrams.toFixed(1),
        }),
      }),
      i18n.t('format.processingTime', { value: result.fillerProcessingMinutes }),
    );
    if (result.multiVisitGapDays !== null) {
      lines.push(i18n.t('prePigmentation.multiVisitNote', { min: result.multiVisitGapDays.min, max: result.multiVisitGapDays.max }));
    }
  }

  const finalDeveloper = result.finalStepDeveloperVolume !== null
    ? i18n.t('format.developerVolume', { value: result.finalStepDeveloperVolume })
    : '—';
  lines.push(
    i18n.t('prePigmentation.finalStepLabel'),
    i18n.t('format.developer', { value: finalDeveloper }),
    i18n.t('format.ratio', { color: result.finalStepMixingRatio.colorParts, developer: result.finalStepMixingRatio.developerParts }),
    i18n.t('prePigmentation.finalStepNote', { start: startLevel }),
    i18n.t('prePigmentation.disclaimer'),
  );

  return lines.join('\n');
}
