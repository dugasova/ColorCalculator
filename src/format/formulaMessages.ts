import i18n from "../i18n";
import type {
  EligibilityWarning,
  FullFormula,
  GrayCoverageStrategy,
  LiftUnsupportedWarning,
  ToneWarning,
} from "../engine/formula";
import { formatDeveloperVolume } from "./formatDeveloperVolume";

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

// Explains how porosity changed the recommendation (FullFormula.porosityAdjustment), or
// null when it didn't -- including every result saved before porosity fed the formula.
// `developerPercentOverride` is the target shade's own (Shade.developerPercentOverride),
// so both developers read exactly like the result's main developer label.
export function formatPorosityAdjustment(
  result: Pick<FullFormula, "porosityAdjustment" | "developerVolume">,
  developerPercentOverride?: number,
): string | null {
  const adjustment = result.porosityAdjustment;
  if (adjustment == null) return null;
  if (adjustment.kind === "processing-extended") {
    return i18n.t("engine.porosity.processingExtended", { minutes: adjustment.addedMinutes });
  }
  if (result.developerVolume === null) return null;
  return i18n.t("engine.porosity.developerLowered", {
    from: formatDeveloperVolume(adjustment.fromDeveloperVolume, developerPercentOverride),
    to: formatDeveloperVolume(result.developerVolume, developerPercentOverride),
  });
}
