import { useTranslation } from "react-i18next";
import type { FullFormula } from "../../engine/formula";
import type { Shade } from "../../engine/shades";
import type { Level } from "../../engine/levels";
import type { ApplicationZone } from "../../engine/applicationZone";
import { formatFormulaText, buildMixSummary, buildBlendMixSummary, type BlendSummary } from "../../engine/formatFormula";
import { formatFillerStepText } from "../../engine/formatPrePigmentation";
import type { PrePigmentationResult } from "../../engine/prePigmentation";
import { saveFormulaToHistory, type ColorHistoryStep } from "../../history";
import { useClampedNumberText } from "./fields/useClampedNumberText";
import { PrePigmentationStep } from "./PrePigmentationStep";
import { SessionDetailsPanel, type SessionDetails } from "./SessionDetailsPanel";

export interface FormulaResultsProps {
  brandName: string;
  line: string | null;
  targetShade: Shade;
  startLevel: Level;
  grayPercent: number;
  applicationZone: ApplicationZone;
  result: FullFormula;
  additionalShade: Shade | null;
  additionalShadeGrams: number;
  blend: BlendSummary | null;
  // Recommended (or colorist-opted-in) filler step ahead of this target-color formula --
  // see PrePigmentationField/PrePigmentationStep. Null whenever the checkbox is off or
  // the level drop doesn't warrant it (getPrePigmentationNeed returns 'none').
  prePigmentationResult: PrePigmentationResult | null;
  neutralizationApplied: boolean;
  onNeutralizationAppliedChange: (applied: boolean) => void;
  appliedBy: string;
  processingMinutes: number;
  onProcessingMinutesChange: (minutes: number) => void;
  pricePerGram: number;
  onPricePerGramChange: (value: number) => void;
  markupMultiplier: number;
  onMarkupMultiplierChange: (value: number) => void;
  productCost: number | null;
  recommendedServicePrice: number | null;
  servicePrice: number | null;
  onServicePriceChange: (value: number) => void;
  // Bubbled from SessionDetailsPanel's onSaved -- lets the caller reset the whole
  // calculator (brand/shade/level, not just this panel's client fields) once the "Saved!"
  // confirmation has finished showing.
  onSaved?: () => void;
}

const MAX_PROCESSING_MINUTES = 180;

export function FormulaResults({
  brandName, line, targetShade, startLevel, grayPercent, applicationZone, result,
  additionalShade, additionalShadeGrams, blend, prePigmentationResult, neutralizationApplied, onNeutralizationAppliedChange, appliedBy,
  processingMinutes, onProcessingMinutesChange,
  pricePerGram, onPricePerGramChange, markupMultiplier, onMarkupMultiplierChange,
  productCost, recommendedServicePrice, servicePrice, onServicePriceChange, onSaved,
}: FormulaResultsProps) {
  const { t } = useTranslation();
  const { inputProps: processingMinutesInputProps } = useClampedNumberText(
    processingMinutes, onProcessingMinutesChange, { min: 1, max: MAX_PROCESSING_MINUTES }
  );

  const targetColorFormulaText = formatFormulaText({
    brandName, line, targetShade, startLevel, result, processingMinutes, applicationZone,
    additionalShade, additionalShadeGrams, blend, neutralizationApplied,
  });
  // Prepend the filler ("Step 1") text ahead of the target-color formula ("Step 2") once
  // the colorist has opted into the pre-pigmentation step -- see PrePigmentationField.
  // fillerStepText is null whenever prePigmentationResult is null (checkbox off, or the
  // level drop doesn't warrant it), so the plain single-step text is used unchanged.
  const fillerStepText = prePigmentationResult !== null
    ? formatFillerStepText(targetShade.level, prePigmentationResult)
    : null;
  const formulaText = fillerStepText !== null
    ? `${fillerStepText}\n\n${t('prePigmentation.finalStepLabel')}\n${targetColorFormulaText}`
    : targetColorFormulaText;

  const handleSave = async (details: SessionDetails) => {
    const step: ColorHistoryStep = {
      kind: 'color',
      brandName,
      line,
      targetShade,
      startLevel,
      grayPercent,
      applicationZone,
      result,
      additionalShade,
      additionalShadeGrams,
      blend,
      prePigmentation: prePigmentationResult,
      neutralizationApplied,
      processingMinutes,
      pricePerGram,
    };
    await saveFormulaToHistory({
      clientName: details.clientName,
      note: details.note,
      appliedBy,
      steps: [step],
      markupMultiplier,
      productCost,
      servicePrice,
      patchTestDate: details.patchTestDate,
      allergyNotes: details.allergyNotes,
      patchTestOverride: details.patchTestOverride,
      beforePhotoFile: details.beforePhotoFile,
      afterPhotoFile: details.afterPhotoFile,
    });
  };

  return (
    <div className="results">
      {prePigmentationResult !== null && (
        <>
          <PrePigmentationStep targetLevel={targetShade.level} result={prePigmentationResult} />
          <h2 className="results__section-heading">{t('prePigmentation.finalStepLabel')}</h2>
        </>
      )}
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
            {result.mixingRatio.colorParts} : {result.mixingRatio.developerParts}
          </span>
        </div>
      </div>

      {result.liftUnsupportedWarning !== null && (
        <p className="warning" role="alert">{result.liftUnsupportedWarning}</p>
      )}
      {result.liftUnsupportedWarning === null && result.developerVolume === null && (
        <p className="warning" role="alert">{t('results.notAchievable')}</p>
      )}

      {result.grams !== null && (
        <div className="results__row">
          <span className="results__row-label">{t('results.mix')}</span>
          <span>{blend !== null ? buildBlendMixSummary(blend, result.grams.developerGrams) : buildMixSummary(targetShade, result.grams, additionalShade, additionalShadeGrams)}</span>
        </div>
      )}

      <div className="results__row">
        <span className="results__row-label">{t('results.applicationZone')}</span>
        <span>{t(applicationZone === 'full-head' ? 'fields.applicationZoneFullHead' : 'fields.applicationZoneRootTouchUp')}</span>
      </div>

      <div className="results__row">
        <span className="results__row-label">{t('results.grayCoverage')}</span>
        <span>{t('results.grayCoverageValue', {
          note: result.grayCoverage.note,
          natural: Math.round(result.grayCoverage.naturalRatio * 100),
          fashion: Math.round(result.grayCoverage.fashionRatio * 100),
        })}</span>
      </div>

      <div className="results__row">
        <span className="results__row-label">{t('results.recommendedTone')}</span>
        <span>{result.recommendedCorrectiveTone !== null
          ? t('results.recommendedToneValue', { grams: result.correctorGrams, tone: result.recommendedCorrectiveTone })
          : t('results.none')}</span>
      </div>

      {result.recommendedCorrectiveTone !== null && (
        <label className="results__neutralization-toggle">
          <input
            type="checkbox"
            checked={neutralizationApplied}
            onChange={e => onNeutralizationAppliedChange(e.target.checked)}
          />
          {t('results.applyNeutralization')}
        </label>
      )}

      {result.toneWarning !== null && !neutralizationApplied && <p className="warning" role="alert">{result.toneWarning}</p>}
      {result.eligibilityWarning !== null && <p className="warning" role="alert">{result.eligibilityWarning}</p>}

      <h2 className="results__section-heading">{t('results.timingPricingSectionTitle')}</h2>

      <div className="results__control-grid">
        <div className="field">
          <label htmlFor="processingMinutes">{t('results.processingTime')}</label>
          <input id="processingMinutes" {...processingMinutesInputProps} />
          <span className="processing-time-hint">
            {t('results.processingTimeHint', { minutes: result.recommendedProcessingMinutes })}
            {processingMinutes !== result.recommendedProcessingMinutes && (
              <button type="button" onClick={() => onProcessingMinutesChange(result.recommendedProcessingMinutes)}>
                {t('results.useRecommended')}
              </button>
            )}
          </span>
        </div>
        <div className="field">
          <label htmlFor="pricePerGram">{t('results.pricePerGram')}</label>
          <input
            id="pricePerGram"
            type="number"
            min={0}
            step={0.01}
            value={pricePerGram}
            onChange={e => onPricePerGramChange(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="markupMultiplier">{t('results.markupMultiplier')}</label>
          <input
            id="markupMultiplier"
            type="number"
            min={1}
            step={0.1}
            value={markupMultiplier}
            onChange={e => onMarkupMultiplierChange(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="servicePrice">{t('results.servicePrice')}</label>
          <input
            id="servicePrice"
            type="number"
            min={0}
            step={0.01}
            value={servicePrice ?? ''}
            onChange={e => onServicePriceChange(Number(e.target.value))}
          />
          {recommendedServicePrice !== null && (
            <span className="processing-time-hint">
              {t('results.servicePriceHint', { price: recommendedServicePrice.toFixed(2) })}
              {servicePrice !== recommendedServicePrice && (
                <button type="button" onClick={() => onServicePriceChange(recommendedServicePrice)}>
                  {t('results.useRecommended')}
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      {productCost !== null && (
        <div className="results__row">
          <span className="results__row-label">{t('results.productCost')}</span>
          <span>{productCost.toFixed(2)}</span>
        </div>
      )}

      <SessionDetailsPanel
        formulaText={formulaText}
        processingMinutes={processingMinutes}
        onSave={handleSave}
        onSaved={onSaved}
      />
    </div>
  );
}
