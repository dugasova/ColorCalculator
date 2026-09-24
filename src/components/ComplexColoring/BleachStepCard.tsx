import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Level } from "../../engine/levels";
import { calculateBleachFormula } from "../../engine/bleach";
import { LevelField } from "../common/LevelField";
import { CanvasFields } from "../FormulaCalculator/fields/CanvasFields";
import { StrandZoneField } from "../FormulaCalculator/fields/StrandZoneField";
import { StartingBaseField } from "../FormulaCalculator/fields/StartingBaseField";
import type { StrandZone } from "../../engine/strandZone";
import type { StartingBase } from "../../engine/startingBase";
import type { BleachHistoryStep, HistoryStep } from "../../history";
import { DEFAULT_STEP_STRAND_ZONE, applyInheritedZoneState, getInheritedZoneState } from "./stepInheritance";
import { useHairCanvasState } from "../FormulaCalculator/useHairCanvasState";

const DEFAULT_BLEACH_PRICE_PER_GRAM = 0.10;

export interface BleachStepCardProps {
  stepId: string;
  // Every already-computed step earlier in this session, in order -- lets this card
  // default its own hair-state fields (starting base, canvas) from an earlier step that
  // targeted the same strandZone (see stepInheritance.ts, and ColorStepCard's identical
  // wiring). Optional/defaults to empty so a lone BleachStepCard works unchanged with no
  // inheritance.
  previousSteps?: HistoryStep[];
  onChange: (step: BleachHistoryStep) => void;
  onRemove: () => void;
}

// One bleach (lightening powder) step within a complex-coloring session — e.g. lifting a
// section before toning. Mirrors BleachCalculator's fields and calculation, minus the
// per-session bits (overall markup/service price) that live in ComplexColoringCalculator.
export function BleachStepCard({ stepId, previousSteps = [], onChange, onRemove }: BleachStepCardProps) {
  const { t } = useTranslation();
  const idSuffix = `-${stepId}`;

  // Hair state an earlier step already recorded for this card's starting zone, captured
  // once at mount. A lazy initializer, not an effect: it is an initial value, and running
  // it as an effect both cascaded an extra render and tripped react-hooks/set-state-in-effect.
  const [inheritedOnMount] = useState(() => getInheritedZoneState(previousSteps, DEFAULT_STEP_STRAND_ZONE));

  const [startLevel, setStartLevel] = useState<Level>(6);
  const { porosity, setPorosity, thickness, setThickness, chemicalHistory, setChemicalHistory } = useHairCanvasState(inheritedOnMount?.canvas);
  const [targetLevel, setTargetLevel] = useState<Level>(8);
  const [totalGrams, setTotalGrams] = useState(60);
  const [manualProcessingMinutes, setManualProcessingMinutes] = useState<number | undefined>(undefined);
  const [pricePerGram, setPricePerGram] = useState(DEFAULT_BLEACH_PRICE_PER_GRAM);
  const [strandZone, setStrandZone] = useState<StrandZone>(DEFAULT_STEP_STRAND_ZONE);
  const [startingBase, setStartingBase] = useState<StartingBase>(inheritedOnMount?.startingBase ?? { kind: "natural" });

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

  const result = calculateBleachFormula(startLevel, targetLevel, totalGrams);
  const processingMinutes = manualProcessingMinutes ?? result.recommendedProcessingMinutes;

  const step: BleachHistoryStep = {
    kind: "bleach",
    startLevel,
    targetLevel,
    result,
    processingMinutes,
    pricePerGram,
    canvas: { porosity, thickness, chemicalHistory },
    strandZone,
    startingBase,
  };

  useEffect(() => {
    onChange(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startLevel, targetLevel, totalGrams, manualProcessingMinutes, pricePerGram, porosity, thickness, chemicalHistory, strandZone, startingBase]);

  return (
    <div className="step-card">
      <div className="step-card__header">
        <h2 className="step-card__title">{t("complexColoring.bleachStepTitle")}</h2>
        <button type="button" className="button button--secondary step-card__remove" onClick={onRemove}>
          {t("complexColoring.removeStep")}
        </button>
      </div>

      <div className="calculator__form">
        <LevelField id={`bleachCurrentLevel${idSuffix}`} label={t("bleach.currentLevel")} value={startLevel} onChange={setStartLevel} />

        <StrandZoneField strandZone={strandZone} onStrandZoneChange={handleStrandZoneChange} idSuffix={idSuffix} />
        <StartingBaseField startingBase={startingBase} onStartingBaseChange={setStartingBase} idSuffix={idSuffix} />

        <CanvasFields
          porosity={porosity} onPorosityChange={setPorosity}
          thickness={thickness} onThicknessChange={setThickness}
          chemicalHistory={chemicalHistory} onChemicalHistoryChange={setChemicalHistory}
          idSuffix={idSuffix}
        />

        <LevelField id={`bleachTargetLevel${idSuffix}`} label={t("bleach.targetLevel")} value={targetLevel} onChange={setTargetLevel} />

        <div className="field">
          <label htmlFor={`bleachTotalGrams${idSuffix}`}>{t("fields.totalGrams")}</label>
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
              <label htmlFor={`bleachStepProcessingMinutes${idSuffix}`}>{t("results.processingTime")}</label>
              <input
                id={`bleachStepProcessingMinutes${idSuffix}`}
                type="number"
                min={1}
                value={processingMinutes}
                onChange={e => setManualProcessingMinutes(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor={`bleachStepPricePerGram${idSuffix}`}>{t("results.pricePerGram")}</label>
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

      {result.liftNeeded === 0 && <p className="warning" role="alert">{t("bleach.noLiftWarning")}</p>}
      {result.multiStepRequired && <p className="warning" role="alert">{t("bleach.multiStepWarning")}</p>}

      {result.grams !== null && (
        <>
          <div className="results__row">
            <span className="results__row-label">{t("results.mix")}</span>
            <span>{t("bleach.mixValue", { powder: result.grams.powderGrams.toFixed(1), developer: result.grams.developerGrams.toFixed(1) })}</span>
          </div>
          <div className="results__row">
            <span className="results__row-label">{t("results.developer")}</span>
            <span>{result.developerVolume !== null ? t("format.developerVolume", { value: result.developerVolume }) : "—"}</span>
          </div>
          <p className="bleach__note">{t("bleach.maxScalpTimeNote", { max: result.maxScalpProcessingMinutes })}</p>
          <p className="bleach__note">{t("bleach.checkIntervalNote", { min: result.checkIntervalMinMinutes, max: result.checkIntervalMaxMinutes })}</p>
        </>
      )}
    </div>
  );
}
