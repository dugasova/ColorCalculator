import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GENERIC_SHADE_CHART } from "../../engine/shades";
import { applyAdditionalShade, calculateFullFormula } from "../../engine/formula";
import { buildMixSummary } from "../../engine/formatFormula";
import type { DeveloperVolume, Level } from "../../engine/levels";
import { APPLICATION_ZONE_DEFAULT_GRAMS, type ApplicationZone } from "../../engine/applicationZone";
import type { BrandId } from "../../engine/brands";
import { usePalette } from "../../palette";
import type { ColorHistoryStep } from "../../history";
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

// One color/tone step within a complex-coloring session. Mirrors FormulaCalculator's field
// composition and calculation, minus the parts that only make sense once per session
// (repeat-formula replay, overall markup/service price) — those live at the session level
// in ComplexColoringCalculator, aggregated across every step.
export function ColorStepCard({ stepId, onChange, onRemove }: ColorStepCardProps) {
  const { t } = useTranslation();
  const brands = usePalette();
  const idSuffix = `-${stepId}`;

  const [brandId, setBrandId] = useState<BrandId>('generic');
  const [line, setLine] = useState<string | null>(null);
  const [targetShadeCode, setTargetShadeCode] = useState(GENERIC_SHADE_CHART[0].code);
  const [startLevel, setStartLevel] = useState<Level>(10);
  const [grayPercent, setGrayPercent] = useState(0);
  const [applicationZone, setApplicationZone] = useState<ApplicationZone>('full-head');
  const [totalGrams, setTotalGrams] = useState(APPLICATION_ZONE_DEFAULT_GRAMS['full-head']);
  const [manualDeveloperVolume, setManualDeveloperVolume] = useState<DeveloperVolume | undefined>(undefined);
  const [additionalShadeCode, setAdditionalShadeCode] = useState<string | null>(null);
  const [additionalShadeGrams, setAdditionalShadeGrams] = useState(0);
  const [neutralizationApplied, setNeutralizationApplied] = useState(false);
  const [manualProcessingMinutes, setManualProcessingMinutes] = useState<number | undefined>(undefined);
  const [pricePerGram, setPricePerGram] = useState(DEFAULT_PRICE_PER_GRAM);

  const availableLines = Array.from(new Set(brands[brandId].shades.map(s => s.line ?? null)));
  const lineShades = brands[brandId].shades.filter(s => (s.line ?? null) === line);

  const handleBrandIdChange = (newBrandId: BrandId) => {
    const firstShade = brands[newBrandId].shades[0];
    setBrandId(newBrandId);
    setLine(firstShade.line ?? null);
    setTargetShadeCode(firstShade.code);
    setManualDeveloperVolume(undefined);
    setManualProcessingMinutes(undefined);
    setAdditionalShadeCode(null);
    setAdditionalShadeGrams(0);
    setNeutralizationApplied(false);
  };

  const handleLineChange = (newLine: string | null) => {
    const firstShade = brands[brandId].shades.find(s => (s.line ?? null) === newLine)!;
    setLine(newLine);
    setTargetShadeCode(firstShade.code);
    setManualDeveloperVolume(undefined);
    setManualProcessingMinutes(undefined);
    setAdditionalShadeCode(null);
    setAdditionalShadeGrams(0);
    setNeutralizationApplied(false);
  };

  const handleTargetShadeCodeChange = (code: string) => {
    setTargetShadeCode(code);
    setManualDeveloperVolume(undefined);
    setManualProcessingMinutes(undefined);
    setNeutralizationApplied(false);
  };

  const handleApplicationZoneChange = (zone: ApplicationZone) => {
    setApplicationZone(zone);
    setTotalGrams(APPLICATION_ZONE_DEFAULT_GRAMS[zone]);
  };

  const handleAdditionalShadeCodeChange = (code: string | null) => {
    setAdditionalShadeCode(code);
    setAdditionalShadeGrams(0);
  };

  const targetShade = lineShades.find(s => s.code === targetShadeCode) ?? lineShades[0];
  const effectiveManualDeveloperVolume = targetShade.developerVolumeChoices
    ? (manualDeveloperVolume ?? targetShade.developerVolumeChoices[0])
    : undefined;
  const result = calculateFullFormula(
    startLevel, targetShade, grayPercent, totalGrams,
    brands[brandId].mixingRatio, effectiveManualDeveloperVolume
  );
  const additionalShade = additionalShadeCode !== null ? lineShades.find(s => s.code === additionalShadeCode) ?? null : null;
  const grams = result.grams !== null && additionalShade !== null && additionalShadeGrams > 0
    ? applyAdditionalShade(result.grams, result.mixingRatio, additionalShadeGrams)
    : result.grams;
  const effectiveResult = grams !== result.grams ? { ...result, grams } : result;
  const processingMinutes = manualProcessingMinutes ?? result.recommendedProcessingMinutes;

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
    manualProcessingMinutes, pricePerGram,
  ]);

  return (
    <div className="step-card">
      <div className="step-card__header">
        <h3 className="step-card__title">{t('complexColoring.colorStepTitle')}</h3>
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

      {result.liftUnsupportedWarning !== null && <p className="warning">{result.liftUnsupportedWarning}</p>}
      {result.liftUnsupportedWarning === null && result.developerVolume === null && (
        <p className="warning">{t('results.notAchievable')}</p>
      )}
      {result.toneWarning !== null && !neutralizationApplied && <p className="warning">{result.toneWarning}</p>}
      {result.eligibilityWarning !== null && <p className="warning">{result.eligibilityWarning}</p>}

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
