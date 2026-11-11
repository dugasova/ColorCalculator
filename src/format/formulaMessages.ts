import i18n from "../i18n";
import type { EligibilityWarning, GrayCoverageStrategy, LiftUnsupportedWarning, ToneWarning } from "../engine/formula";

// Renders the engine's language-independent results (engine/formula.ts reports warnings
// and the gray-coverage strategy as plain data) in the current UI language. Called at
// display time by both the live calculator and History, so a saved entry always reads in
// whatever language the UI is in now, not the one that was active when it was saved.

export function formatToneWarning(warning: ToneWarning): string {
  return i18n.t("engine.toneWarning", { ...warning });
}

export function formatEligibilityWarning(warning: EligibilityWarning): string {
  return i18n.t("engine.eligibilityWarning", { ...warning });
}

export function formatLiftUnsupportedWarning(warning: LiftUnsupportedWarning): string {
  return i18n.t("engine.liftUnsupportedWarning", { ...warning });
}

export function getGrayCoverageNote(strategy: Pick<GrayCoverageStrategy, "naturalRatio">): string {
  if (strategy.naturalRatio === 0) return i18n.t("engine.grayCoverage.fashionOnly");
  if (strategy.naturalRatio < 0.5) return i18n.t("engine.grayCoverage.oneThirdNatural");
  return i18n.t("engine.grayCoverage.halfNatural");
}
