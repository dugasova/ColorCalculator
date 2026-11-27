import { useTranslation } from "react-i18next";
import { useClampedNumberText } from "../common/useClampedNumberText";
import type { FormulaPricing, FormulaPricingHandlers } from "./formulaResultsModel";
import { NumberInput } from "../common/NumberInput";

const MAX_PROCESSING_MINUTES = 180;

export interface TimingPricingSectionProps {
  recommendedProcessingMinutes: number;
  processingMinutes: number;
  onProcessingMinutesChange: (minutes: number) => void;
  pricing: FormulaPricing;
  pricingHandlers: FormulaPricingHandlers;
}

// The second block of the results panel: processing time and the price of the service,
// each with its recommended value one click away.
export function TimingPricingSection({
  recommendedProcessingMinutes,
  processingMinutes,
  onProcessingMinutesChange,
  pricing,
  pricingHandlers,
}: TimingPricingSectionProps) {
  const { t } = useTranslation();
  const { pricePerGram, markupMultiplier, productCost, recommendedServicePrice, servicePrice } = pricing;
  const { onPricePerGramChange, onMarkupMultiplierChange, onServicePriceChange } = pricingHandlers;
  const { inputProps: processingMinutesInputProps } = useClampedNumberText(
    processingMinutes,
    onProcessingMinutesChange,
    { min: 1, max: MAX_PROCESSING_MINUTES },
  );

  return (
    <>
      <h2 className="results__section-heading">{t("results.timingPricingSectionTitle")}</h2>

      <div className="results__control-grid">
        <div className="field">
          <label htmlFor="processingMinutes">{t("results.processingTime")}</label>
          <input id="processingMinutes" {...processingMinutesInputProps} />
          <span className="processing-time-hint">
            {t("results.processingTimeHint", { minutes: recommendedProcessingMinutes })}
            {processingMinutes !== recommendedProcessingMinutes && (
              <button type="button" onClick={() => onProcessingMinutesChange(recommendedProcessingMinutes)}>
                {t("results.useRecommended")}
              </button>
            )}
          </span>
        </div>
        <div className="field">
          <label htmlFor="pricePerGram">{t("results.pricePerGram")}</label>
          <NumberInput
            id="pricePerGram"
            min={0}
            value={pricePerGram}
            onValueChange={onPricePerGramChange}
            decimals={2}
          />
        </div>
        <div className="field">
          <label htmlFor="markupMultiplier">{t("results.markupMultiplier")}</label>
          <NumberInput
            id="markupMultiplier"
            min={1}
            value={markupMultiplier}
            onValueChange={onMarkupMultiplierChange}
            decimals={1}
          />
        </div>
        <div className="field">
          <label htmlFor="servicePrice">{t("results.servicePrice")}</label>
          <NumberInput
            id="servicePrice"
            min={0}
            value={servicePrice ?? null}
            onValueChange={onServicePriceChange}
            decimals={2}
          />
          {recommendedServicePrice !== null && (
            <span className="processing-time-hint">
              {t("results.servicePriceHint", { price: recommendedServicePrice.toFixed(2) })}
              {servicePrice !== recommendedServicePrice && (
                <button type="button" onClick={() => onServicePriceChange(recommendedServicePrice)}>
                  {t("results.useRecommended")}
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      {productCost !== null && (
        <div className="results__row">
          <span className="results__row-label">{t("results.productCost")}</span>
          <span>{productCost.toFixed(2)}</span>
        </div>
      )}
    </>
  );
}
