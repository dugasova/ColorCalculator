import i18n from "../i18n";
import type {
  EligibilityWarning,
  FullFormula,
  GrayCoverageStrategy,
  LiftUnsupportedWarning,
  ToneWarning,
} from "../engine/formula";
import type { UnderlyingPigment } from "../engine/levels";
import type { ToneFamily } from "../engine/shades";
import { formatDeveloperVolume } from "./formatDeveloperVolume";

// Renders the engine's language-independent results (engine/formula.ts reports warnings
// and the gray-coverage strategy as plain data) in the current UI language. Called at
// display time by both the live calculator and History, so a saved entry always reads in
// whatever language the UI is in now, not the one that was active when it was saved.

// A tone family's name as it reads inside a sentence ("ash", "попелястий").
function formatToneName(tone: ToneFamily): string {
  return i18n.t(`palette.toneFamily.${tone}`).toLowerCase();
}

export function formatPigmentName(pigment: UnderlyingPigment): string {
  return i18n.t(`pigment.${pigment}`);
}

export function formatToneWarning(warning: ToneWarning): string {
  return i18n.t("engine.toneWarning", {
    tone: formatToneName(warning.tone),
    pigment: formatPigmentName(warning.pigment),
    recommended: (warning.recommendedTones ?? [warning.recommended]).map(formatToneName).join(" + "),
  });
}

type CorrectorResult = Pick<FullFormula, "recommendedCorrectiveTone" | "correctorGrams" | "correctiveTones">;

// The corrector to add, tone by tone: "1 g ash + 1 g violet". Null when the formula needs
// none. A result saved before correctors could be blends has only the one tone.
export function formatCorrectiveTones(result: CorrectorResult): string | null {
  if (result.recommendedCorrectiveTone === null) return null;
  const tones =
    result.correctiveTones !== undefined && result.correctiveTones.length > 0
      ? result.correctiveTones
      : [{ tone: result.recommendedCorrectiveTone, grams: result.correctorGrams }];
  return tones
    .map(({ tone, grams }) => i18n.t("results.recommendedToneValue", { grams, tone: formatToneName(tone) }))
    .join(" + ");
}

// True when lifting reveals a background and the shade's own tone cancels all of it, so
// no corrector is called for. Never true for a result saved before the shade's tone was
// taken into account: those always carry a corrector whenever they carry a background.
export function isBackgroundCoveredByShade(result: CorrectorResult & Pick<FullFormula, "underlyingPigment">): boolean {
  return result.underlyingPigment !== null && result.recommendedCorrectiveTone === null;
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
