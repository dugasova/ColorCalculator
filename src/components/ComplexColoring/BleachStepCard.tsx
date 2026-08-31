import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Level } from "../../engine/levels";
import { calculateBleachFormula } from "../../engine/bleach";
import type { BleachHistoryStep } from "../../history";

const DEFAULT_BLEACH_PRICE_PER_GRAM = 0.10;
const LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface BleachStepCardProps {
  stepId: string;
  onChange: (step: BleachHistoryStep) => void;
  onRemove: () => void;
}

// One bleach (lightening powder) step within a complex-coloring session — e.g. lifting a
// section before toning. Mirrors BleachCalculator's fields and calculation, minus the
// per-session bits (overall markup/service price) that live in ComplexColoringCalculator.
export function BleachStepCard({ stepId, onChange, onRemove }: BleachStepCardProps) {
  const { t } = useTranslation();
  const idSuffix = `-${stepId}`;

  const [startLevel, setStartLevel] = useState<Level>(6);
  const [targetLevel, setTargetLevel] = useState<Level>(8);
  const [totalGrams, setTotalGrams] = useState(60);
  const [manualProcessingMinutes, setManualProcessingMinutes] = useState<number | undefined>(undefined);
  const [pricePerGram, setPricePerGram] = useState(DEFAULT_BLEACH_PRICE_PER_GRAM);

  const result = calculateBleachFormula(startLevel, targetLevel, totalGrams);
  const processingMinutes = manualProcessingMinutes ?? result.recommendedProcessingMinutes;

  const step: BleachHistoryStep = {
    kind: 'bleach',
    startLevel,
    targetLevel,
    result,
    processingMinutes,
    pricePerGram,
  };

  useEffect(() => {
    onChange(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startLevel, targetLevel, totalGrams, manualProcessingMinutes, pricePerGram]);

  return (
    <div className="step-card">
      <div className="step-card__header">
        <h2 className="step-card__title">{t('complexColoring.bleachStepTitle')}</h2>
        <button type="button" className="button button--secondary step-card__remove" onClick={onRemove}>
          {t('complexColoring.removeStep')}
        </button>
      </div>

      <div className="calculator__form">
        <div className="field">
          <label htmlFor={`bleachCurrentLevel${idSuffix}`}>{t('bleach.currentLevel')}</label>
          <select
            id={`bleachCurrentLevel${idSuffix}`}
            value={startLevel}
            onChange={e => setStartLevel(Number(e.target.value) as Level)}>
            {LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={`bleachTargetLevel${idSuffix}`}>{t('bleach.targetLevel')}</label>
          <select
            id={`bleachTargetLevel${idSuffix}`}
            value={targetLevel}
            onChange={e => setTargetLevel(Number(e.target.value) as Level)}>
            {LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={`bleachTotalGrams${idSuffix}`}>{t('fields.totalGrams')}</label>
          <input
            id={`bleachTotalGrams${idSuffix}`}
            type="number"
            min={1}
            value={totalGrams}
            onChange={e => setTotalGrams(Number(e.target.value))}
          />
        </div>

        {result.grams !== null && (
          <>
            <div className="field">
              <label htmlFor={`bleachStepProcessingMinutes${idSuffix}`}>{t('results.processingTime')}</label>
              <input
                id={`bleachStepProcessingMinutes${idSuffix}`}
                type="number"
                min={1}
                value={processingMinutes}
                onChange={e => setManualProcessingMinutes(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor={`bleachStepPricePerGram${idSuffix}`}>{t('results.pricePerGram')}</label>
              <input
                id={`bleachStepPricePerGram${idSuffix}`}
                type="number"
                min={0}
                step={0.01}
                value={pricePerGram}
                onChange={e => setPricePerGram(Number(e.target.value))}
              />
            </div>
          </>
        )}
      </div>

      {result.liftNeeded === 0 && <p className="warning" role="alert">{t('bleach.noLiftWarning')}</p>}
      {result.multiStepRequired && <p className="warning" role="alert">{t('bleach.multiStepWarning')}</p>}

      {result.grams !== null && (
        <>
          <div className="results__row">
            <span className="results__row-label">{t('results.mix')}</span>
            <span>{t('bleach.mixValue', { powder: result.grams.powderGrams.toFixed(1), developer: result.grams.developerGrams.toFixed(1) })}</span>
          </div>
          <div className="results__row">
            <span className="results__row-label">{t('results.developer')}</span>
            <span>{result.developerVolume !== null ? t('format.developerVolume', { value: result.developerVolume }) : '—'}</span>
          </div>
          <p className="bleach__note">{t('bleach.maxScalpTimeNote', { max: result.maxScalpProcessingMinutes })}</p>
          <p className="bleach__note">{t('bleach.checkIntervalNote', { min: result.checkIntervalMinMinutes, max: result.checkIntervalMaxMinutes })}</p>
        </>
      )}
    </div>
  );
}
