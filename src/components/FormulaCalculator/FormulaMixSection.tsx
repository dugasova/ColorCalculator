import { useTranslation } from "react-i18next";
import { getGrayCoverageNote } from "../../format/formulaMessages";
import { buildMixSummary, buildBlendMixSummary } from "../../format/formatFormula";
import { formatDeveloperVolume } from "../../format/formatDeveloperVolume";
import type { Porosity } from "../../engine/canvas";
import type { ApplicationZone } from "../../engine/applicationZone";
import type { StockShortage } from "../../stock";
import { StockShortageWarnings } from "../common/StockShortageWarnings";
import { LiftOutcome, PorosityNotices, ToneWarnings } from "./FormulaNotices";
import type { FormulaMix } from "./formulaResultsModel";

export interface FormulaMixSectionProps {
  mix: FormulaMix;
  porosity: Porosity;
  applicationZone: ApplicationZone;
  shortages: StockShortage[];
  neutralizationApplied: boolean;
  onNeutralizationAppliedChange: (applied: boolean) => void;
}

// The first block of the results panel: developer and ratio, the mix to weigh out, and
// the guidance that goes with it (lift, porosity, gray coverage, corrective tone).
export function FormulaMixSection({
  mix,
  porosity,
  applicationZone,
  shortages,
  neutralizationApplied,
  onNeutralizationAppliedChange,
}: FormulaMixSectionProps) {
  const { t } = useTranslation();
  const {
    targetShade,
    result,
    additionalShade,
    additionalShadeGrams,
    additionalShade2,
    additionalShade2Grams,
    blend,
    naturalBase,
  } = mix;

  return (
    <>
      <div className="results__stats">
        <div className="stat">
          <span className="stat__label">{t("results.developer")}</span>
          <span className="stat__value">
            {result.developerVolume !== null
              ? formatDeveloperVolume(result.developerVolume, targetShade.developerPercentOverride)
              : "—"}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">{t("results.ratio")}</span>
          <span className="stat__value">
            {result.mixingRatio.colorParts} : {result.mixingRatio.developerParts}
          </span>
        </div>
      </div>

      <LiftOutcome result={result} targetShade={targetShade} />
      <PorosityNotices result={result} targetShade={targetShade} porosity={porosity} />
      {result.grams !== null && (
        <div className="results__row results__row--mix">
          <span className="results__row-label">{t("results.mix")}</span>
          <span className="results__mix-value">
            {blend !== null
              ? buildBlendMixSummary(
                  blend,
                  result.grams.developerGrams,
                  additionalShade,
                  additionalShadeGrams,
                  additionalShade2,
                  additionalShade2Grams,
                  naturalBase,
                )
              : buildMixSummary(
                  targetShade,
                  result.grams,
                  additionalShade,
                  additionalShadeGrams,
                  additionalShade2,
                  additionalShade2Grams,
                  naturalBase,
                )}
          </span>
        </div>
      )}

      <StockShortageWarnings shortages={shortages} />

      <div className="results__row">
        <span className="results__row-label">{t("results.applicationZone")}</span>
        <span>
          {t(applicationZone === "full-head" ? "fields.applicationZoneFullHead" : "fields.applicationZoneRootTouchUp")}
        </span>
      </div>

      {/* Only when gray coverage changes the mix -- see formatFormulaText's own gray line. */}
      {(naturalBase !== null || result.grayCoverage.naturalRatio > 0) && (
        <div className="results__row">
          <span className="results__row-label">{t("results.grayCoverage")}</span>
          <span>
            {naturalBase !== null
              ? t("results.grayCoverageAppliedValue", {
                  code: naturalBase.shade.code,
                  natural: Math.round(result.grayCoverage.naturalRatio * 100),
                  fashion: Math.round(result.grayCoverage.fashionRatio * 100),
                })
              : t("results.grayCoverageValue", {
                  note: getGrayCoverageNote(result.grayCoverage),
                  natural: Math.round(result.grayCoverage.naturalRatio * 100),
                  fashion: Math.round(result.grayCoverage.fashionRatio * 100),
                })}
          </span>
        </div>
      )}

      <div className="results__row">
        <span className="results__row-label">{t("results.recommendedTone")}</span>
        <span>
          {result.recommendedCorrectiveTone !== null
            ? t("results.recommendedToneValue", {
                grams: result.correctorGrams,
                tone: result.recommendedCorrectiveTone,
              })
            : t("results.none")}
        </span>
      </div>

      {result.recommendedCorrectiveTone !== null && (
        <label className="results__neutralization-toggle">
          <input
            type="checkbox"
            checked={neutralizationApplied}
            onChange={e => onNeutralizationAppliedChange(e.target.checked)}
          />
          {t("results.applyNeutralization")}
        </label>
      )}

      <ToneWarnings result={result} neutralizationApplied={neutralizationApplied} />
    </>
  );
}
