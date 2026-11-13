import { useTranslation } from "react-i18next";
import type { Porosity } from "../../engine/canvas";
import type { FullFormula } from "../../engine/formula";
import type { Shade } from "../../engine/shades";
import {
  formatEligibilityWarning,
  formatLiftUnsupportedWarning,
  formatPorosityAdjustment,
  formatToneWarning,
} from "../../format/formulaMessages";

// The notices a computed formula can carry, shared by the simple calculator's results
// panel (FormulaResults) and a Complex Coloring step (ColorStepCard). Each group is its
// own component because the two screens place them at different points around their own
// rows (mix, corrective tone, pricing) -- but what a group shows, and when, is decided
// here once, so a new warning or a wording change lands on both screens together.

export interface LiftOutcomeProps {
  result: FullFormula;
  targetShade: Shade;
}

// Whether the target is reached: the can't-lift warning (or the generic "not achievable"
// when there's no developer at all), then the level actually reached if it falls short.
export function LiftOutcome({ result, targetShade }: LiftOutcomeProps) {
  const { t } = useTranslation();
  return (
    <>
      {result.liftUnsupportedWarning !== null && (
        <p className="warning" role="alert">
          {formatLiftUnsupportedWarning(result.liftUnsupportedWarning)}
        </p>
      )}
      {result.liftUnsupportedWarning === null && result.developerVolume === null && (
        <p className="warning" role="alert">
          {t("results.notAchievable")}
        </p>
      )}
      {result.achievedLevel !== null && result.achievedLevel !== targetShade.level && (
        <div className="results__row">
          <span className="results__row-label">{t("results.achievedLevel")}</span>
          <span>{t("results.achievedLevelValue", { level: result.achievedLevel, target: targetShade.level })}</span>
        </div>
      )}
    </>
  );
}

export interface PorosityNoticesProps {
  result: FullFormula;
  targetShade: Shade;
  porosity: Porosity;
}

// How porosity changed the formula (if it did), and the standing reminder to shorten
// processing on porous ends.
export function PorosityNotices({ result, targetShade, porosity }: PorosityNoticesProps) {
  const { t } = useTranslation();
  const porosityNote = formatPorosityAdjustment(result, targetShade.developerPercentOverride);
  return (
    <>
      {porosityNote !== null && <p className="results__info">{porosityNote}</p>}
      {porosity === "high" && (
        <p className="warning" role="alert">
          {t("results.porousWarning")}
        </p>
      )}
    </>
  );
}

export interface ToneWarningsProps {
  result: FullFormula;
  // The tone-mismatch warning is moot once the colorist opts into the corrector.
  neutralizationApplied: boolean;
}

export function ToneWarnings({ result, neutralizationApplied }: ToneWarningsProps) {
  // Subscribes to language changes: the format* helpers read the current language
  // directly, so without this the warnings wouldn't re-render when it switches.
  useTranslation();
  return (
    <>
      {result.toneWarning !== null && !neutralizationApplied && (
        <p className="warning" role="alert">
          {formatToneWarning(result.toneWarning)}
        </p>
      )}
      {result.eligibilityWarning !== null && (
        <p className="warning" role="alert">
          {formatEligibilityWarning(result.eligibilityWarning)}
        </p>
      )}
    </>
  );
}
