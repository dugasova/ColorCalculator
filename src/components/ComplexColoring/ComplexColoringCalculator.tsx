import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { calculateRecommendedServicePrice } from "../../engine/pricing";
import { saveFormulaToHistory, type HistoryStep } from "../../history";
import { useSalonMarkupMultiplier } from "../../palette";
import { calculateSessionProductCost } from "../../sessionCost";
import { formatSessionText } from "../../formatSession";
import { SessionDetailsPanel, type SessionDetails } from "../FormulaCalculator/SessionDetailsPanel";
import { ColorStepCard } from "./ColorStepCard";
import { BleachStepCard } from "./BleachStepCard";
import "../FormulaCalculator/FormulaCalculator.css";
import "../Bleach/BleachCalculator.css";
import "./ComplexColoringCalculator.css";

export interface ComplexColoringCalculatorProps {
  appliedBy: string;
  // Bubbled up to the caller once a save's "Saved!" confirmation has finished showing --
  // App.tsx uses it to remount this whole calculator with a fresh key, resetting every
  // step and the client-details panel for the next client.
  onSaved?: () => void;
}

interface StepScaffold {
  id: string;
  kind: HistoryStep["kind"];
}

// A saved multi-step session for complex color work — one or more bleach (lift) steps
// combined with one or more color/tone steps, e.g. balayage: bleach powder on sections,
// then a permanent color to tone the rest. Each step is calculated independently by its own
// card; this page only aggregates their totals (time, cost) and hands the combined recipe
// off to the shared save/copy/share panel.
export default function ComplexColoringCalculator({ appliedBy, onSaved }: ComplexColoringCalculatorProps) {
  const { t } = useTranslation();
  const [scaffold, setScaffold] = useState<StepScaffold[]>([]);
  const [computedSteps, setComputedSteps] = useState<Record<string, HistoryStep>>({});
  const salonMarkupMultiplier = useSalonMarkupMultiplier();
  const [manualMarkupMultiplier, setManualMarkupMultiplier] = useState<number | undefined>(undefined);
  const markupMultiplier = manualMarkupMultiplier ?? salonMarkupMultiplier;
  const [manualServicePrice, setManualServicePrice] = useState<number | undefined>(undefined);
  const nextIdRef = useRef(0);

  const handleAddColorStep = () => {
    const id = `step-${nextIdRef.current++}`;
    setScaffold(prev => [...prev, { id, kind: "color" }]);
  };

  const handleAddBleachStep = () => {
    const id = `step-${nextIdRef.current++}`;
    setScaffold(prev => [...prev, { id, kind: "bleach" }]);
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
  const totalProductCost = calculateSessionProductCost(orderedSteps);
  const recommendedServicePrice = totalProductCost !== null
    ? calculateRecommendedServicePrice(totalProductCost, markupMultiplier)
    : null;
  const servicePrice = manualServicePrice ?? recommendedServicePrice;
  const formulaText = orderedSteps.length > 0 ? formatSessionText(orderedSteps) : "";
  // Every step describes the same client's hair, so any one step's recorded canvas
  // (porosity/thickness/chemical history) represents the whole session -- picks the
  // first one that has it set, same as formatSessionText's per-step canvas is optional.
  const sessionCanvas = orderedSteps.find(step => step.canvas !== undefined)?.canvas;

  const handleSave = async (details: SessionDetails) => {
    await saveFormulaToHistory({
      clientName: details.clientName,
      clientId: details.clientId,
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
        {t("complexColoring.titlePrefix")} <span className="calculator__title-accent">{t("complexColoring.titleAccent")}</span>
      </h1>
      <p className="complex-coloring__subtitle">{t("complexColoring.subtitle")}</p>

      {scaffold.length === 0 && (
        <p className="complex-coloring__empty">{t("complexColoring.empty")}</p>
      )}

      <div className="complex-coloring__steps">
        {scaffold.map((s, index) => {
          // Every already-computed step before this one in the session, in order --
          // lets each card default its own hair-state fields (starting base, canvas)
          // from an earlier step that targeted the same strandZone (see
          // stepInheritance.ts), without waiting for this card's own onChange effect
          // (which only fires after mount).
          const previousSteps = scaffold.slice(0, index)
            .map(prev => computedSteps[prev.id])
            .filter((step): step is HistoryStep => step !== undefined);
          return s.kind === "color" ? (
            <ColorStepCard
              key={s.id}
              stepId={s.id}
              previousSteps={previousSteps}
              onChange={step => handleStepChange(s.id, step)}
              onRemove={() => handleRemoveStep(s.id)}
            />
          ) : (
            <BleachStepCard
              key={s.id}
              stepId={s.id}
              previousSteps={previousSteps}
              onChange={step => handleStepChange(s.id, step)}
              onRemove={() => handleRemoveStep(s.id)}
            />
          );
        })}
      </div>

      <div className="complex-coloring__add-actions">
        <button type="button" className="button button--secondary" onClick={handleAddBleachStep}>
          {t("complexColoring.addBleachStep")}
        </button>
        <button type="button" className="button button--secondary" onClick={handleAddColorStep}>
          {t("complexColoring.addColorStep")}
        </button>
      </div>

      {orderedSteps.length > 0 && (
        <div className="results">
          <div className="results__row">
            <span className="results__row-label">{t("complexColoring.totalProcessingTime")}</span>
            <span>{totalProcessingMinutes}</span>
          </div>

          <h2 className="results__section-heading">{t("results.timingPricingSectionTitle")}</h2>

          <div className="results__control-grid">
            <div className="field">
              <label htmlFor="complexMarkupMultiplier">{t("results.markupMultiplier")}</label>
              <input
                id="complexMarkupMultiplier"
                type="number"
                min={1}
                step={0.1}
                value={markupMultiplier}
                onChange={e => setManualMarkupMultiplier(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="complexServicePrice">{t("results.servicePrice")}</label>
              <input
                id="complexServicePrice"
                type="number"
                min={0}
                step={0.01}
                value={servicePrice ?? ""}
                onChange={e => setManualServicePrice(Number(e.target.value))}
              />
              {recommendedServicePrice !== null && (
                <span className="processing-time-hint">
                  {t("results.servicePriceHint", { price: recommendedServicePrice.toFixed(2) })}
                  {servicePrice !== recommendedServicePrice && (
                    <button type="button" onClick={() => setManualServicePrice(recommendedServicePrice)}>
                      {t("results.useRecommended")}
                    </button>
                  )}
                </span>
              )}
            </div>
          </div>

          {totalProductCost !== null && (
            <div className="results__row">
              <span className="results__row-label">{t("results.productCost")}</span>
              <span>{totalProductCost.toFixed(2)}</span>
            </div>
          )}

          <SessionDetailsPanel
            formulaText={formulaText}
            processingMinutes={totalProcessingMinutes}
            onSave={handleSave}
            onSaved={onSaved}
            appliedBy={appliedBy}
            canvas={sessionCanvas}
          />
        </div>
      )}
    </div>
  );
}
