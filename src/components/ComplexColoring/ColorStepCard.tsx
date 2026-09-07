import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePalette } from "../../palette";
const DEFAULT_PRICE_PER_GRAM = 0.18;
import { useShadeFormulaState } from "../FormulaCalculator/useShadeFormulaState";
import { BrandField } from "../FormulaCalculator/fields/BrandField";
import { LineField } from "../FormulaCalculator/fields/LineField";
import { StartLevelField } from "../FormulaCalculator/fields/StartLevelField";
import { GrayPercentField } from "../FormulaCalculator/fields/GrayPercentField";
import { ShadeField } from "../FormulaCalculator/fields/ShadeField";
import { AdditionalShadeField } from "../FormulaCalculator/fields/AdditionalShadeField";
import { AdditionalShadeGramsField } from "../FormulaCalculator/fields/AdditionalShadeGramsField";
import { DeveloperVolumeField } from "../FormulaCalculator/fields/DeveloperVolumeField";
import { TotalGramsField } from "../FormulaCalculator/fields/TotalGramsField";
import { ApplicationZoneField } from "../FormulaCalculator/fields/ApplicationZoneField";
import { CanvasFields } from "../FormulaCalculator/fields/CanvasFields";
import { buildMixSummary } from "../../engine/formatFormula";
import type { ColorHistoryStep } from "../../history";

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
    porosity, setPorosity,
    thickness, setThickness,
    chemicalHistory, setChemicalHistory,
    targetShadeCode,
    applicationZone,
    totalGrams, setTotalGrams,
    brandId,
    line,
    manualDeveloperVolume, setManualDeveloperVolume,
    setManualProcessingMinutes,
    additionalShadeCode,
    additionalShadeGrams, setAdditionalShadeGrams,
    additionalShade2Code, setAdditionalShade2Code,
    additionalShade2Grams, setAdditionalShade2Grams,
    neutralizationApplied, setNeutralizationApplied,

    availableLines,
    lineShades,
    targetShade,
    result,
    additionalShade,
    additionalShade2,
    grams,
    effectiveResult,
    processingMinutes,

    handleBrandIdChange,
    handleLineChange,
    handleTargetShadeCodeChange,
    handleApplicationZoneChange,
    handleAdditionalShadeCodeChange,
  } = useShadeFormulaState({ brands });

  // Report the computed step up on every change — the parent aggregates all steps'
  // totals (time, cost) and builds the combined recipe text/save payload from them.
  useEffect(() => {
    const stepData: ColorHistoryStep = {
      kind: "color",
      brandName: brands[brandId].name,
      line,
      targetShade,
      startLevel,
      grayPercent,
      canvas: { porosity, thickness, chemicalHistory },
      applicationZone,
      result: effectiveResult,
      additionalShade,
      additionalShadeGrams: additionalShade !== null ? additionalShadeGrams : null,
      additionalShade2,
      additionalShade2Grams: additionalShade2 !== null ? additionalShade2Grams : null,
      blend: null,
      prePigmentation: null,
      neutralizationApplied,
      processingMinutes,
      pricePerGram,
    };
    onChange(stepData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applicationZone, effectiveResult, additionalShade, additionalShadeGrams, additionalShade2, additionalShade2Grams, neutralizationApplied, processingMinutes, pricePerGram,
    porosity, thickness, chemicalHistory
  ]);

  return (
    <div className="step-card">
      <div className="step-card__header">
        <h2 className="step-card__title">{t("complexColoring.colorStepTitle")}</h2>
        <button type="button" className="button button--secondary step-card__remove" onClick={onRemove}>
          {t("complexColoring.removeStep")}
        </button>
      </div>

      <div className="calculator__form">
        <BrandField brandId={brandId} onBrandIdChange={handleBrandIdChange} idSuffix={idSuffix} />
        <LineField availableLines={availableLines} line={line} onLineChange={handleLineChange} idSuffix={idSuffix} />
        <StartLevelField startLevel={startLevel} onStartLevelChange={setStartLevel} idSuffix={idSuffix} />
        <GrayPercentField grayPercent={grayPercent} onGrayPercentChange={setGrayPercent} idSuffix={idSuffix} />
        <CanvasFields
          porosity={porosity} onPorosityChange={setPorosity}
          thickness={thickness} onThicknessChange={setThickness}
          chemicalHistory={chemicalHistory} onChemicalHistoryChange={setChemicalHistory}
          idSuffix={idSuffix}
        />
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
        {additionalShadeCode !== null && (
          <>
            <AdditionalShadeField
              lineShades={lineShades}
              additionalShadeCode={additionalShade2Code}
              onAdditionalShadeCodeChange={setAdditionalShade2Code}
              idSuffix={idSuffix + "_2"}
              label={t("fields.additionalShade2")}
            />
            <AdditionalShadeGramsField
              additionalShadeCode={additionalShade2Code}
              additionalShadeGrams={additionalShade2Grams}
              onAdditionalShadeGramsChange={setAdditionalShade2Grams}
              idSuffix={idSuffix + "_2"}
            />
          </>
        )}
        <DeveloperVolumeField
          targetShade={targetShade}
          manualDeveloperVolume={manualDeveloperVolume}
          onManualDeveloperVolumeChange={setManualDeveloperVolume}
          idSuffix={idSuffix}
        />
        <ApplicationZoneField applicationZone={applicationZone} onApplicationZoneChange={handleApplicationZoneChange} idSuffix={idSuffix} />
        <TotalGramsField totalGrams={totalGrams} onTotalGramsChange={setTotalGrams} idSuffix={idSuffix} />
        <div className="field">
          <label htmlFor={`stepProcessingMinutes${idSuffix}`}>{t("results.processingTime")}</label>
          <input
            id={`stepProcessingMinutes${idSuffix}`}
            type="number"
            min={1}
            value={processingMinutes}
            onChange={e => setManualProcessingMinutes(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor={`stepPricePerGram${idSuffix}`}>{t("results.pricePerGram")}</label>
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
        <p className="warning" role="alert">{t("results.notAchievable")}</p>
      )}
      {result.toneWarning !== null && !neutralizationApplied && <p className="warning" role="alert">{result.toneWarning}</p>}
      {result.eligibilityWarning !== null && <p className="warning" role="alert">{result.eligibilityWarning}</p>}
      {porosity === "high" && (
        <p className="warning" role="alert">{t("results.porousWarning")}</p>
      )}

      {grams !== null && (
        <div className="results__row">
          <span className="results__row-label">{t("results.mix")}</span>
          <span>{buildMixSummary(targetShade, grams, additionalShade, additionalShadeGrams, additionalShade2, additionalShade2Grams)}</span>
        </div>
      )}

      {result.recommendedCorrectiveTone !== null && (
        <div className="results__row">
          <span className="results__row-label">{t("results.recommendedTone")}</span>
          <span>
            {t("results.recommendedToneValue", { grams: result.correctorGrams, tone: result.recommendedCorrectiveTone })}
            <label className="results__neutralization-toggle">
              <input
                type="checkbox"
                checked={neutralizationApplied}
                onChange={e => setNeutralizationApplied(e.target.checked)}
              />
              {t("results.applyNeutralization")}
            </label>
          </span>
        </div>
      )}
    </div>
  );
}
