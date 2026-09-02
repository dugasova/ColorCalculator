import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Level } from "../../engine/levels";
import { calculatePrePigmentation } from "../../engine/prePigmentation";
import { Select } from "../common/Select";
import "../FormulaCalculator/FormulaCalculator.css";
import "./PrePigmentationCalculator.css";

const LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function PrePigmentationCalculator() {
  const { t } = useTranslation();
  const [startLevel, setStartLevel] = useState<Level>(9);
  const [targetLevel, setTargetLevel] = useState<Level>(5);
  const [totalGrams, setTotalGrams] = useState(30);

  const result = calculatePrePigmentation(startLevel, targetLevel, totalGrams);
  const fillerToneName = result.fillerTone !== null ? t(`palette.toneFamily.${result.fillerTone}`) : null;
  const showFillerStep = result.need !== 'none' && result.underlyingPigment !== null && result.fillerTone !== null
    && result.mixingRatio !== null && result.grams !== null;

  return (
    <div className="calculator calculator--wide">
      <h1 className="calculator__title">{t('prePigmentation.titlePrefix')} <span className="calculator__title-accent">{t('prePigmentation.titleAccent')}</span></h1>
      <p className="prepigment__subtitle">{t('prePigmentation.subtitle')}</p>

      <div className="calculator__form">
        <div className="field">
          <label htmlFor="prepigmentStartLevel">{t('prePigmentation.currentLevel')}</label>
          <Select
            id="prepigmentStartLevel"
            value={String(startLevel)}
            onChange={value => setStartLevel(Number(value) as Level)}
            options={LEVELS.map(level => ({ value: String(level), label: String(level) }))}
          />
        </div>

        <div className="field">
          <label htmlFor="prepigmentTargetLevel">{t('prePigmentation.targetLevel')}</label>
          <Select
            id="prepigmentTargetLevel"
            value={String(targetLevel)}
            onChange={value => setTargetLevel(Number(value) as Level)}
            options={LEVELS.map(level => ({ value: String(level), label: String(level) }))}
          />
        </div>

        <div className="field">
          <label htmlFor="prepigmentTotalGrams">{t('prePigmentation.totalGrams')}</label>
          <input
            type="number"
            id="prepigmentTotalGrams"
            min={1}
            value={totalGrams}
            onChange={e => setTotalGrams(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="results">
        <div className="results__stats">
          <div className="stat">
            <span className="stat__label">{t('prePigmentation.needLabel')}</span>
            <span className="stat__value prepigment__stat-value--small">{t(`prePigmentation.need.${result.need}`)}</span>
          </div>
        </div>

        {showFillerStep && result.underlyingPigment !== null && result.grams !== null && (
          <>
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
          </>
        )}

        <div className="results__row">
          <span className="results__row-label">{t('prePigmentation.finalStepLabel')}</span>
          <span>
            {result.finalStepDeveloperVolume !== null ? t('format.developerVolume', { value: result.finalStepDeveloperVolume }) : '—'}
            {' · '}
            {t('format.ratio', { color: result.finalStepMixingRatio.colorParts, developer: result.finalStepMixingRatio.developerParts })}
          </span>
        </div>
        <p className="prepigment__note">{t('prePigmentation.finalStepNote', { start: startLevel })}</p>
        <p className="prepigment__disclaimer">{t('prePigmentation.disclaimer')}</p>
      </div>
    </div>
  );
}
