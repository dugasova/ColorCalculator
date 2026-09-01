import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Level } from "../../engine/levels";
import { calculateBleachFormula, type BleachFormula } from "../../engine/bleach";
import { calculateProductCost, calculateRecommendedServicePrice, DEFAULT_MARKUP_MULTIPLIER } from "../../engine/pricing";
import { Select } from "../common/Select";
import "../FormulaCalculator/FormulaCalculator.css";
import "./BleachCalculator.css";

// Rough per-gram cost of generic bleach powder; fully editable below, mirrors
// FormulaCalculator's generic-brand default.
const DEFAULT_BLEACH_PRICE_PER_GRAM = 0.10;

const LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export interface BleachResultsProps {
  result: BleachFormula;
  pricePerGram: number;
  onPricePerGramChange: (value: number) => void;
  markupMultiplier: number;
  onMarkupMultiplierChange: (value: number) => void;
  productCost: number | null;
  recommendedServicePrice: number | null;
}

// Presentational results panel, kept separate from BleachCalculator's level
// selects so the render logic for each outcome (no lift needed, multi-step
// required, single-session formula) can be exercised directly in tests
// without simulating select interactions — mirrors the FormulaResults /
// FormulaCalculator split in ../FormulaCalculator.
export function BleachResults({
  result, pricePerGram, onPricePerGramChange, markupMultiplier, onMarkupMultiplierChange,
  productCost, recommendedServicePrice,
}: BleachResultsProps) {
  const { t } = useTranslation();

  return (
    <div className="results">
      <div className="results__stats">
        <div className="stat">
          <span className="stat__label">{t('results.developer')}</span>
          <span className="stat__value">
            {result.developerVolume !== null ? t('format.developerVolume', { value: result.developerVolume }) : '—'}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('results.ratio')}</span>
          <span className="stat__value">
            {result.mixingRatio.powderParts} : {result.mixingRatio.developerParts}
          </span>
        </div>
      </div>

      {result.liftNeeded === 0 && (
        <p className="warning" role="alert">{t('bleach.noLiftWarning')}</p>
      )}

      {result.multiStepRequired && (
        <p className="warning" role="alert">{t('bleach.multiStepWarning')}</p>
      )}

      {result.grams !== null && (
        <>
          <div className="results__row">
            <span className="results__row-label">{t('results.mix')}</span>
            <span>{t('bleach.mixValue', { powder: result.grams.powderGrams.toFixed(1), developer: result.grams.developerGrams.toFixed(1) })}</span>
          </div>
          <div className="results__row">
            <span className="results__row-label">{t('bleach.processingTimeLabel')}</span>
            <span>{t('results.processingTimeHint', { minutes: result.recommendedProcessingMinutes })}</span>
          </div>
          <p className="bleach__note">{t('bleach.maxScalpTimeNote', { max: result.maxScalpProcessingMinutes })}</p>
          <p className="bleach__note">{t('bleach.checkIntervalNote', { min: result.checkIntervalMinMinutes, max: result.checkIntervalMaxMinutes })}</p>
          <p className="bleach__note bleach__note--strand">{t('bleach.strandTestNote')}</p>

          <div className="results__pricing">
            <div className="field">
              <label htmlFor="bleachPricePerGram">{t('results.pricePerGram')}</label>
              <input
                id="bleachPricePerGram"
                type="number"
                min={0}
                step={0.01}
                value={pricePerGram}
                onChange={e => onPricePerGramChange(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="bleachMarkupMultiplier">{t('results.markupMultiplier')}</label>
              <input
                id="bleachMarkupMultiplier"
                type="number"
                min={1}
                step={0.1}
                value={markupMultiplier}
                onChange={e => onMarkupMultiplierChange(Number(e.target.value))}
              />
            </div>
          </div>

          {productCost !== null && (
            <div className="results__row">
              <span className="results__row-label">{t('results.productCost')}</span>
              <span>{productCost.toFixed(2)}</span>
            </div>
          )}

          {recommendedServicePrice !== null && (
            <div className="results__row">
              <span className="results__row-label">{t('bleach.recommendedServicePrice')}</span>
              <span>{recommendedServicePrice.toFixed(2)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function BleachCalculator() {
  const { t } = useTranslation();
  const [currentLevel, setCurrentLevel] = useState<Level>(6);
  const [targetLevel, setTargetLevel] = useState<Level>(8);
  const [totalGrams, setTotalGrams] = useState(60);
  const [pricePerGram, setPricePerGram] = useState(DEFAULT_BLEACH_PRICE_PER_GRAM);
  const [markupMultiplier, setMarkupMultiplier] = useState(DEFAULT_MARKUP_MULTIPLIER);

  const result = calculateBleachFormula(currentLevel, targetLevel, totalGrams);
  const totalProductGrams = result.grams !== null ? result.grams.powderGrams + result.grams.developerGrams : null;
  const productCost = totalProductGrams !== null ? calculateProductCost(totalProductGrams, pricePerGram) : null;
  const recommendedServicePrice = productCost !== null ? calculateRecommendedServicePrice(productCost, markupMultiplier) : null;

  return (
    <div className="calculator calculator--wide">
      <h1 className="calculator__title">{t('bleach.titlePrefix')} <span className="calculator__title-accent">{t('bleach.titleAccent')}</span></h1>
      <p className="bleach__subtitle">{t('bleach.subtitle')}</p>

      <div className="calculator__form">
        <div className="field">
          <label htmlFor="currentLevel">{t('bleach.currentLevel')}</label>
          <Select
            id="currentLevel"
            value={String(currentLevel)}
            onChange={value => setCurrentLevel(Number(value) as Level)}
            options={LEVELS.map(level => ({ value: String(level), label: String(level) }))}
          />
        </div>

        <div className="field">
          <label htmlFor="targetLevel">{t('bleach.targetLevel')}</label>
          <Select
            id="targetLevel"
            value={String(targetLevel)}
            onChange={value => setTargetLevel(Number(value) as Level)}
            options={LEVELS.map(level => ({ value: String(level), label: String(level) }))}
          />
        </div>

        <div className="field">
          <label htmlFor="totalGrams">{t('fields.totalGrams')}</label>
          <input
            type="number"
            id="totalGrams"
            min={1}
            value={totalGrams}
            onChange={e => setTotalGrams(Number(e.target.value))}
          />
        </div>
      </div>

      <BleachResults
        result={result}
        pricePerGram={pricePerGram}
        onPricePerGramChange={setPricePerGram}
        markupMultiplier={markupMultiplier}
        onMarkupMultiplierChange={setMarkupMultiplier}
        productCost={productCost}
        recommendedServicePrice={recommendedServicePrice}
      />
    </div>
  );
}
