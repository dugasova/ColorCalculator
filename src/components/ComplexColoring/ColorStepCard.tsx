import { useEffect, useMemo, useState } from "react";
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
import { PrePigmentationField } from "../FormulaCalculator/fields/PrePigmentationField";
import { DeveloperVolumeField } from "../FormulaCalculator/fields/DeveloperVolumeField";
import { MixingRatioField } from "../FormulaCalculator/fields/MixingRatioField";
import { TotalGramsField } from "../FormulaCalculator/fields/TotalGramsField";
import { StrandZoneField } from "../FormulaCalculator/fields/StrandZoneField";
import { StartingBaseField } from "../FormulaCalculator/fields/StartingBaseField";
import type { StrandZone } from "../../engine/strandZone";
import type { StartingBase } from "../../engine/startingBase";
import { CanvasFields } from "../FormulaCalculator/fields/CanvasFields";
import { buildMixSummary } from "../../engine/formatFormula";
import { getPrePigmentationNeed, calculatePrePigmentation } from "../../engine/prePigmentation";
import { PrePigmentationStep } from "../FormulaCalculator/PrePigmentationStep";
import type { ColorHistoryStep, HistoryStep } from "../../history";
import { DEFAULT_STEP_STRAND_ZONE, applyInheritedZoneState, getInheritedZoneState } from "./stepInheritance";

export interface ColorStepCardProps {
  stepId: string;
  // Every already-computed step earlier in this session, in order -- lets this card
  // default its own hair-state fields (starting base, canvas) from an earlier step that
  // targeted the same strandZone (see stepInheritance.ts). Optional/defaults to empty so
  // a lone ColorStepCard (e.g. in tests, or a future standalone use) works unchanged
  // with no inheritance.
  previousSteps?: HistoryStep[];
  onChange: (step: ColorHistoryStep) => void;
  onRemove: () => void;
}

// One color/tone step within a complex-coloring session. Shares its brand/line/shade and
// formula calculation with FormulaCalculator (see useShadeFormulaState), minus the parts
// that only make sense once per session (repeat-formula replay, substitute-blend mode,
// cross-brand match, overall markup/service price) — those live at the session level in
// ComplexColoringCalculator, aggregated across every step. `pricePerGram` here is a plain
// flat field, unlike FormulaCalculator's manual-override-over-a-brand-default pattern.
export function ColorStepCard({ stepId, previousSteps = [], onChange, onRemove }: ColorStepCardProps) {
  const { t } = useTranslation();
  const brands = usePalette();
  const idSuffix = `-${stepId}`;

  // Hair state an earlier step already recorded for this card's starting zone, captured
  // once at mount. A lazy initializer, not an effect: it is an initial value, and running
  // it as an effect both cascaded an extra render and tripped react-hooks/set-state-in-effect.
  const [inheritedOnMount] = useState(() => getInheritedZoneState(previousSteps, DEFAULT_STEP_STRAND_ZONE));

  const [pricePerGram, setPricePerGram] = useState(DEFAULT_PRICE_PER_GRAM);
  const [strandZone, setStrandZone] = useState<StrandZone>(DEFAULT_STEP_STRAND_ZONE);
  const [startingBase, setStartingBase] = useState<StartingBase>(inheritedOnMount?.startingBase ?? { kind: "natural" });
  const [prePigmentationEnabled, setPrePigmentationEnabled] = useState(false);

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
    manualMixingRatio, setManualMixingRatio,
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
    handleAdditionalShadeCodeChange,
  } = useShadeFormulaState({ brands, initialCanvas: inheritedOnMount?.canvas });

  // Re-seeds starting base/canvas only at the moment the colorist actively picks a zone
  // -- an imperative one-shot default, not an ongoing sync, so it never overwrites values
  // the colorist edits afterward (see the mount-time lazy initializer above for the same
  // reasoning).
  const handleStrandZoneChange = (zone: StrandZone) => {
    setStrandZone(zone);
    const inherited = getInheritedZoneState(previousSteps, zone);
    if (inherited !== null) {
      applyInheritedZoneState(inherited, { setStartingBase, setPorosity, setThickness, setChemicalHistory });
    }
  };

  // Reevaluated from startLevel/targetShade every render, matched against this step's
  // own selected line (lineShades) -- same derivation as FormulaCalculator's
  // useFormulaCalculatorState, just inlined here since ColorStepCard doesn't otherwise
  // use that hook. Gated on prePigmentationEnabled so toggling the checkbox off drops
  // the filler step from both this card and the combined session text/save payload.
  // Memoized (unlike useFormulaCalculatorState's own unmemoized version, which has no
  // reporting effect depending on it): calculatePrePigmentation builds a fresh object
  // literal every call, and this result sits in the "report computed step up" effect's
  // dependency array below (see useComputedFullFormula's own identical comment) -- an
  // unmemoized new object every render would fire that effect every render, which calls
  // the parent's setState, which re-renders this card, which produces yet another new
  // object: infinite "Maximum update depth exceeded" the moment prePigmentation turns on.
  const prePigmentationNeed = getPrePigmentationNeed(startLevel, targetShade.level);
  const prePigmentationResult = useMemo(
    () => (prePigmentationEnabled && prePigmentationNeed !== "none"
      ? calculatePrePigmentation(startLevel, targetShade.level, totalGrams, lineShades)
      : null),
    [prePigmentationEnabled, prePigmentationNeed, startLevel, targetShade, totalGrams, lineShades]
  );

  // Report the computed step up on every change — the parent aggregates all steps'
  // totals (time, cost) and builds the combined recipe text/save payload from them.
  useEffect(() => {
    const stepData: ColorHistoryStep = {
      kind: "color",
      brandId,
      brandName: brands[brandId].name,
      line,
      targetShade,
      startLevel,
      grayPercent,
      canvas: { porosity, thickness, chemicalHistory },
      applicationZone,
      strandZone,
      startingBase,
      result: effectiveResult,
      additionalShade,
      additionalShadeGrams: additionalShade !== null ? additionalShadeGrams : null,
      additionalShade2,
      additionalShade2Grams: additionalShade2 !== null ? additionalShade2Grams : null,
      blend: null,
      prePigmentation: prePigmentationResult,
      neutralizationApplied,
      processingMinutes,
      pricePerGram,
    };
    onChange(stepData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    brandId, applicationZone, strandZone, startingBase, effectiveResult, additionalShade, additionalShadeGrams, additionalShade2, additionalShade2Grams, neutralizationApplied, processingMinutes, pricePerGram,
    porosity, thickness, chemicalHistory, prePigmentationResult
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
        <StrandZoneField strandZone={strandZone} onStrandZoneChange={handleStrandZoneChange} idSuffix={idSuffix} />
        <StartingBaseField startingBase={startingBase} onStartingBaseChange={setStartingBase} idSuffix={idSuffix} />
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
        <PrePigmentationField
          need={prePigmentationNeed}
          enabled={prePigmentationEnabled}
          onEnabledChange={setPrePigmentationEnabled}
          idSuffix={idSuffix}
        />
        <AdditionalShadeField
          lineShades={lineShades}
          additionalShadeCode={additionalShadeCode}
          onAdditionalShadeCodeChange={handleAdditionalShadeCodeChange}
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
              additionalShadeGrams={additionalShade2Grams}
              onAdditionalShadeGramsChange={setAdditionalShade2Grams}
              idSuffix={idSuffix + "_2"}
              label={t("fields.additionalShade2")}
            />
          </>
        )}
        <DeveloperVolumeField
          targetShade={targetShade}
          manualDeveloperVolume={manualDeveloperVolume}
          onManualDeveloperVolumeChange={setManualDeveloperVolume}
          idSuffix={idSuffix}
        />
        <MixingRatioField
          targetShade={targetShade}
          manualMixingRatio={manualMixingRatio}
          onManualMixingRatioChange={setManualMixingRatio}
          idSuffix={idSuffix}
        />
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

      {prePigmentationResult !== null && (
        <>
          <PrePigmentationStep targetLevel={targetShade.level} result={prePigmentationResult} brandName={brands[brandId].name} />
          <h2 className="results__section-heading">{t("prePigmentation.finalStepLabel")}</h2>
        </>
      )}
      {result.liftUnsupportedWarning !== null && <p className="warning" role="alert">{result.liftUnsupportedWarning}</p>}
      {result.liftUnsupportedWarning === null && result.developerVolume === null && (
        <p className="warning" role="alert">{t("results.notAchievable")}</p>
      )}
      {result.achievedLevel !== null && result.achievedLevel !== targetShade.level && (
        <div className="results__row">
          <span className="results__row-label">{t("results.achievedLevel")}</span>
          <span>{t("results.achievedLevelValue", { level: result.achievedLevel, target: targetShade.level })}</span>
        </div>
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
