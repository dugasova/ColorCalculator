import { useTranslation } from "react-i18next";
import type { Level } from "../../engine/levels";
import type { PrePigmentationResult } from "../../engine/prePigmentation";

export interface PrePigmentationStepProps {
  targetLevel: Level;
  result: PrePigmentationResult;
}

// Renders the filler ("Step 1") detail block ahead of the target-color formula below it,
// which FormulaResults labels "Step 2" once this is showing (see its own
// results.section-heading right before the normal stats). Mirrors
// PrePigmentationCalculator's own filler stats grid so the two surfaces read identically.
// Only mounted once the colorist opts in via PrePigmentationField's checkbox -- `result`
// always has a real filler breakdown here since useFormulaCalculatorState only computes
// it when `need` isn't 'none'.
export function PrePigmentationStep({ targetLevel, result }: PrePigmentationStepProps) {
  const { t } = useTranslation();
  if (result.underlyingPigment === null || result.fillerTone === null
    || result.mixingRatio === null || result.grams === null || result.fillerProcessingMinutes === null) {
    return null;
  }
  const fillerToneName = t(`palette.toneFamily.${result.fillerTone}`);

  return (
    <>
      <h2 className="results__section-heading">{t('prePigmentation.fillerSectionLabel')}</h2>
      <div className="results__stats">
        <div className="stat">
          <span className="stat__label">{t('prePigmentation.underlyingPigmentLabel')}</span>
          <span className="stat__value prepigment__stat-value--small">{result.underlyingPigment}</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('prePigmentation.fillerToneLabel')}</span>
          <span className="stat__value prepigment__stat-value--small">{fillerToneName}</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('prePigmentation.exampleFillerShadeLabel')}</span>
          <span className="stat__value prepigment__stat-value--small">
            {result.exampleFillerShade !== null
              ? t('prePigmentation.exampleFillerShadeValue', { code: result.exampleFillerShade.code, tone: fillerToneName })
              : t('prePigmentation.noExampleFillerShade', { tone: fillerToneName, level: targetLevel })}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('prePigmentation.fillerMixLabel')}</span>
          <span className="stat__value prepigment__stat-value--small">
            {t('prePigmentation.fillerMixValue', { filler: result.grams.fillerGrams.toFixed(1), diluent: result.grams.diluentGrams.toFixed(1) })}
          </span>
        </div>
      </div>
      <p className="prepigment__note">{t('format.processingTime', { value: result.fillerProcessingMinutes })}</p>
      {result.multiVisitGapDays !== null && (
        <p className="warning" role="alert">
          {t('prePigmentation.multiVisitNote', { min: result.multiVisitGapDays.min, max: result.multiVisitGapDays.max })}
        </p>
      )}
      <p className="prepigment__disclaimer">{t('prePigmentation.disclaimer')}</p>
    </>
  );
}
