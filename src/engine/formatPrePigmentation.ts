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
    ...buildFillerLines(targetLevel, result),
  ];

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

// Filler ("Step 1") detail lines: underlying pigment, filler tone, example shade, mix,
// timing, and (for a >=7-level drop) the multi-visit gap note. Shared by
// formatPrePigmentationText above (the standalone calculator's own step 1+2 report) and
// formatFillerStepText below (FormulaCalculator's embedded step 1, paired with its own
// formatFormulaText output as step 2 instead of prePigmentation's generic final-step
// lines) -- both need the identical breakdown once `need` isn't 'none'.
function buildFillerLines(targetLevel: Level, result: PrePigmentationResult): string[] {
  if (result.underlyingPigment === null || result.fillerTone === null
    || result.mixingRatio === null || result.grams === null || result.fillerProcessingMinutes === null) {
    return [];
  }

  const fillerToneName = i18n.t(`palette.toneFamily.${result.fillerTone}`);
  const lines = [
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
  ];
  if (result.multiVisitGapDays !== null) {
    lines.push(i18n.t('prePigmentation.multiVisitNote', { min: result.multiVisitGapDays.min, max: result.multiVisitGapDays.max }));
  }
  return lines;
}

// Filler step text to prepend ahead of FormulaCalculator's own target-color formula
// (formatFormulaText) when the colorist opts into the embedded pre-pigmentation step
// there (see PrePigmentationField/PrePigmentationStep) -- returns null once `need` is
// 'none', so the caller can fall back to its plain, unprefixed formula text. Unlike
// formatPrePigmentationText's own "Step 2", which only restates developer/ratio because
// the standalone calculator never computes a real target shade formula, FormulaCalculator
// pairs this with the real one, so it stops after the filler details and lets the caller
// supply its own "Step 2" heading + formatFormulaText output. Starts straight at
// fillerSectionLabel ("Step 1 — Filler") without a leading needValue line -- unlike the
// standalone calculator, FormulaCalculator already showed that recommendation once, on
// the checkbox itself (PrePigmentationField), before the colorist ever opted in.
export function formatFillerStepText(targetLevel: Level, result: PrePigmentationResult): string | null {
  const fillerLines = buildFillerLines(targetLevel, result);
  return fillerLines.length === 0 ? null : fillerLines.join('\n');
}
