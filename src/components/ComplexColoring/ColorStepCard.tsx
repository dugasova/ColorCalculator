import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildMixSummary } from "../../engine/formatFormula";
import { usePalette } from "../../palette";
import type { ColorHistoryStep } from "../../history";
import { useShadeFormulaState } from "../FormulaCalculator/useShadeFormulaState";
import { BrandField } from "../FormulaCalculator/fields/BrandField";
import { LineField } from "../FormulaCalculator/fields/LineField";
import { StartLevelField } from "../FormulaCalculator/fields/StartLevelField";
import { GrayPercentField } from "../FormulaCalculator/fields/GrayPercentField";
import { ShadeField } from "../FormulaCalculator/fields/ShadeField";
import { AdditionalShadeField } from "../FormulaCalculator/fields/AdditionalShadeField";
import { AdditionalShadeGramsField } from "../FormulaCalculator/fields/AdditionalShadeGramsField";
import { DeveloperVolumeField } from "../FormulaCalculator/fields/DeveloperVolumeField";
import { ApplicationZoneField } from "../FormulaCalculator/fields/ApplicationZoneField";
import { TotalGramsField } from "../FormulaCalculator/fields/TotalGramsField";

const DEFAULT_PRICE_PER_GRAM = 0.18;

export interface ColorStepCardProps {
  stepId: string;
  onChange: (step: ColorHistoryStep) => void;
  onRemove: () => void;
}

// One color/tone step within a complex-coloring session. Shares its brand/line/shade and
// formula calculation with FormulaCalculator (see useShadeFormulaState), minus the parts
// that only make sense once per session (repeat-formula replay, substitute-blend mode,
// cross-brand match, overall markup/service price) — those live at the session level in
// ComplexColoringCalculator, aggregated across every step. `pricePerGram` here is a plain
// flat field, unlike FormulaCalculator's manual-override-over-a-brand-default pattern.
export function ColorStepCard({ stepId, onChange, onRemove }: ColorStepCardProps) {
  const { t } = useTranslation();
  const brands = usePalette();
  const idSuffix = `-${stepId}`;

  const [pricePerGram, setPricePerGram] = useState(DEFAULT_PRICE_PER_GRAM);

  const {
    startLevel, setStartLevel,
    grayPercent, setGrayPercent,
    targetShadeCode,
    applicationZone,
    totalGrams, setTotalGrams,
    brandId,
    line,
    manualDeveloperVolume, setManualDeveloperVolume,
    setManualProcessingMinutes,
    additionalShadeCode,
    additionalShadeGrams, setAdditionalShadeGrams,
    neutralizationApplied, setNeutralizationApplied,

    availableLines,
    lineShades,
    targetShade,
    result,
    additionalShade,
    grams,
    effectiveResult,
    processingMinutes,

    handleBrandIdChange,
    handleLineChange,
    handleTargetShadeCodeChange,
    handleApplicationZoneChange,
    handleAdditionalShadeCodeChange,
  } = useShadeFormulaState({ brands });

  const step: ColorHistoryStep = {
    kind: 'color',
    brandName: brands[brandId].name,
    line,
    targetShade,
    startLevel,
    grayPercent,
    applicationZone,
    result: effectiveResult,
    additionalShade,
    additionalShadeGrams,
    blend: null,
    // Pre-pigmentation is only offered in the single-formula FormulaCalculator (see
    // PrePigmentationField) -- a complex-coloring color step almost always tones hair
    // that was just lifted with a bleach step above it, not darkens several levels from
    // its pre-service level, so this always stays null here.
    prePigmentation: null,
    neutralizationApplied,
    processingMinutes,
    pricePerGram,
  };

  // Report the computed step up on every change — the parent aggregates all steps'
  // totals (time, cost) and builds the combined recipe text/save payload from them.
  useEffect(() => {
    onChange(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    brandId, line, targetShadeCode, startLevel, grayPercent, applicationZone, totalGrams,
    manualDeveloperVolume, additionalShadeCode, additionalShadeGrams, neutralizationApplied,
    processingMinutes, pricePerGram,
  ]);

  return (
    <div className="step-card">
      <div className="step-card__header">
        <h2 className="step-card__title">{t('complexColoring.colorStepTitle')}</h2>
        <button type="button" className="button button--secondary step-card__remove" onClick={onRemove}>
          {t('complexColoring.removeStep')}
        </button>
      </div>

      <div className="calculator__form">
        <BrandField brandId={brandId} onBrandIdChange={handleBrandIdChange} idSuffix={idSuffix} />
        <LineField availableLines={availableLines} line={line} onLineChange={handleLineChange} idSuffix={idSuffix} />
        <StartLevelField startLevel={startLevel} onStartLevelChange={setStartLevel} idSuffix={idSuffix} />
        <GrayPercentField grayPercent={grayPercent} onGrayPercentChange={setGrayPercent} idSuffix={idSuffix} />
        <ShadeField
          lineShades={lineShades}
          targetShadeCode={targetShadeCode}
          targetShade={targetShade}
          onTargetShadeCodeChange={handleTargetShadeCodeChange}
          idSuffix={idSuffix}
        />
        <AdditionalShadeField
          lineShades={lineShades}
          additionalShadeCode={additionalShadeCode}
          onAdditionalShadeCodeChange={handleAdditionalShadeCodeChange}
          idSuffix={idSuffix}
        />
        <AdditionalShadeGramsField
          additionalShadeCode={additionalShadeCode}
          additionalShadeGrams={additionalShadeGrams}
          onAdditionalShadeGramsChange={setAdditionalShadeGrams}
          idSuffix={idSuffix}
        />
        <DeveloperVolumeField
          targetShade={targetShade}
          manualDeveloperVolume={manualDeveloperVolume}
          onManualDeveloperVolumeChange={setManualDeveloperVolume}
          idSuffix={idSuffix}
        />
        <ApplicationZoneField applicationZone={applicationZone} onApplicationZoneChange={handleApplicationZoneChange} idSuffix={idSuffix} />
        <TotalGramsField totalGrams={totalGrams} onTotalGramsChange={setTotalGrams} idSuffix={idSuffix} />
        <div className="field">
          <label htmlFor={`stepProcessingMinutes${idSuffix}`}>{t('results.processingTime')}</label>
          <input
            id={`stepProcessingMinutes${idSuffix}`}
            type="number"
            min={1}
            value={processingMinutes}
            onChange={e => setManualProcessingMinutes(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor={`stepPricePerGram${idSuffix}`}>{t('results.pricePerGram')}</label>
          <input
            id={`stepPricePerGram${idSuffix}`}
            type="number"
            min={0}
            step={0.01}
            value={pricePerGram}
            onChange={e => setPricePerGram(Number(e.target.value))}
          />
        </div>
      </div>

      {result.liftUnsupportedWarning !== null && <p className="warning" role="alert">{result.liftUnsupportedWarning}</p>}
      {result.liftUnsupportedWarning === null && result.developerVolume === null && (
        <p className="warning" role="alert">{t('results.notAchievable')}</p>
      )}
      {result.toneWarning !== null && !neutralizationApplied && <p className="warning" role="alert">{result.toneWarning}</p>}
      {result.eligibilityWarning !== null && <p className="warning" role="alert">{result.eligibilityWarning}</p>}

      {grams !== null && (
        <div className="results__row">
          <span className="results__row-label">{t('results.mix')}</span>
          <span>{buildMixSummary(targetShade, grams, additionalShade, additionalShadeGrams)}</span>
        </div>
      )}
      <div className="results__row">
        <span className="results__row-label">{t('results.developer')}</span>
        <span>{result.developerVolume !== null ? t('format.developerVolume', { value: result.developerVolume }) : '—'}</span>
      </div>

      {result.recommendedCorrectiveTone !== null && (
        <>
          <div className="results__row">
            <span className="results__row-label">{t('results.recommendedTone')}</span>
            <span>{t('results.recommendedToneValue', { grams: result.correctorGrams, tone: result.recommendedCorrectiveTone })}</span>
          </div>
          <label className="results__neutralization-toggle">
            <input
              type="checkbox"
              checked={neutralizationApplied}
              onChange={e => setNeutralizationApplied(e.target.checked)}
            />
            {t('results.applyNeutralization')}
          </label>
        </>
      )}
    </div>
  );
}
