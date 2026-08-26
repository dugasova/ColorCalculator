import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { calculateProductCost, calculateRecommendedServicePrice, DEFAULT_MARKUP_MULTIPLIER } from "../../engine/pricing";
import { saveFormulaToHistory, type HistoryStep } from "../../history";
import { formatSessionText } from "../../formatSession";
import { SessionDetailsPanel, type SessionDetails } from "../FormulaCalculator/SessionDetailsPanel";
import { ColorStepCard } from "./ColorStepCard";
import { BleachStepCard } from "./BleachStepCard";
import "../FormulaCalculator/FormulaCalculator.css";
import "../Bleach/BleachCalculator.css";
import "./ComplexColoringCalculator.css";

export interface ComplexColoringCalculatorProps {
  appliedBy: string;
}

interface StepScaffold {
  id: string;
  kind: HistoryStep['kind'];
}

function stepTotalGrams(step: HistoryStep): number {
  if (step.kind === 'color') {
    return step.result.grams !== null ? step.result.grams.colorGrams + step.result.grams.developerGrams : 0;
  }
  return step.result.grams !== null ? step.result.grams.powderGrams + step.result.grams.developerGrams : 0;
}

// A saved multi-step session for complex color work — one or more bleach (lift) steps
// combined with one or more color/tone steps, e.g. balayage: bleach powder on sections,
// then a permanent color to tone the rest. Each step is calculated independently by its own
// card; this page only aggregates their totals (time, cost) and hands the combined recipe
// off to the shared save/copy/share panel.
export default function ComplexColoringCalculator({ appliedBy }: ComplexColoringCalculatorProps) {
  const { t } = useTranslation();
  const [scaffold, setScaffold] = useState<StepScaffold[]>([]);
  const [computedSteps, setComputedSteps] = useState<Record<string, HistoryStep>>({});
  const [markupMultiplier, setMarkupMultiplier] = useState(DEFAULT_MARKUP_MULTIPLIER);
  const [manualServicePrice, setManualServicePrice] = useState<number | undefined>(undefined);
  const nextIdRef = useRef(0);

  const handleAddColorStep = () => {
    const id = `step-${nextIdRef.current++}`;
    setScaffold(prev => [...prev, { id, kind: 'color' }]);
  };

  const handleAddBleachStep = () => {
    const id = `step-${nextIdRef.current++}`;
    setScaffold(prev => [...prev, { id, kind: 'bleach' }]);
  };

  const handleRemoveStep = (id: string) => {
    setScaffold(prev => prev.filter(s => s.id !== id));
    setComputedSteps(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleStepChange = (id: string, step: HistoryStep) => {
    setComputedSteps(prev => ({ ...prev, [id]: step }));
  };

  const orderedSteps = scaffold
    .map(s => computedSteps[s.id])
    .filter((step): step is HistoryStep => step !== undefined);

  const totalProcessingMinutes = orderedSteps.reduce((sum, step) => sum + step.processingMinutes, 0);
  const totalProductCost = orderedSteps.length > 0
    ? orderedSteps.reduce((sum, step) => sum + calculateProductCost(stepTotalGrams(step), step.pricePerGram), 0)
    : null;
  const recommendedServicePrice = totalProductCost !== null
    ? calculateRecommendedServicePrice(totalProductCost, markupMultiplier)
    : null;
  const servicePrice = manualServicePrice ?? recommendedServicePrice;
  const formulaText = orderedSteps.length > 0 ? formatSessionText(orderedSteps) : '';

  const handleSave = async (details: SessionDetails) => {
    await saveFormulaToHistory({
      clientName: details.clientName,
      note: details.note,
      appliedBy,
      steps: orderedSteps,
      markupMultiplier,
      productCost: totalProductCost,
      servicePrice,
      patchTestDate: details.patchTestDate,
      allergyNotes: details.allergyNotes,
      patchTestOverride: details.patchTestOverride,
      beforePhotoFile: details.beforePhotoFile,
      afterPhotoFile: details.afterPhotoFile,
    });
  };

  return (
    <div className="calculator calculator--complex">
      <h1 className="calculator__title">
        {t('complexColoring.titlePrefix')} <span className="calculator__title-accent">{t('complexColoring.titleAccent')}</span>
      </h1>
      <p className="complex-coloring__subtitle">{t('complexColoring.subtitle')}</p>

      {scaffold.length === 0 && (
        <p className="complex-coloring__empty">{t('complexColoring.empty')}</p>
      )}

      <div className="complex-coloring__steps">
        {scaffold.map(s => s.kind === 'color' ? (
          <ColorStepCard
            key={s.id}
            stepId={s.id}
            onChange={step => handleStepChange(s.id, step)}
            onRemove={() => handleRemoveStep(s.id)}
          />
        ) : (
          <BleachStepCard
            key={s.id}
            stepId={s.id}
            onChange={step => handleStepChange(s.id, step)}
            onRemove={() => handleRemoveStep(s.id)}
          />
        ))}
      </div>

      <div className="complex-coloring__add-actions">
        <button type="button" className="button button--secondary" onClick={handleAddBleachStep}>
          {t('complexColoring.addBleachStep')}
        </button>
        <button type="button" className="button button--secondary" onClick={handleAddColorStep}>
          {t('complexColoring.addColorStep')}
        </button>
      </div>

      {orderedSteps.length > 0 && (
        <div className="results">
          <div className="results__row">
            <span className="results__row-label">{t('complexColoring.totalProcessingTime')}</span>
            <span>{totalProcessingMinutes}</span>
          </div>

          <h2 className="results__section-heading">{t('results.timingPricingSectionTitle')}</h2>

          <div className="results__control-grid">
            <div className="field">
              <label htmlFor="complexMarkupMultiplier">{t('results.markupMultiplier')}</label>
              <input
                id="complexMarkupMultiplier"
                type="number"
                min={1}
                step={0.1}
                value={markupMultiplier}
                onChange={e => setMarkupMultiplier(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="complexServicePrice">{t('results.servicePrice')}</label>
              <input
                id="complexServicePrice"
                type="number"
                min={0}
                step={0.01}
                value={servicePrice ?? ''}
                onChange={e => setManualServicePrice(Number(e.target.value))}
              />
              {recommendedServicePrice !== null && (
                <span className="processing-time-hint">
                  {t('results.servicePriceHint', { price: recommendedServicePrice.toFixed(2) })}
                  {servicePrice !== recommendedServicePrice && (
                    <button type="button" onClick={() => setManualServicePrice(recommendedServicePrice)}>
                      {t('results.useRecommended')}
                    </button>
                  )}
                </span>
              )}
            </div>
          </div>

          {totalProductCost !== null && (
            <div className="results__row">
              <span className="results__row-label">{t('results.productCost')}</span>
              <span>{totalProductCost.toFixed(2)}</span>
            </div>
          )}

          <SessionDetailsPanel
            formulaText={formulaText}
            processingMinutes={totalProcessingMinutes}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  );
}
