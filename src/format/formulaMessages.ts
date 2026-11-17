import i18n from "../i18n";
import type {
  EligibilityWarning,
  FullFormula,
  GrayCoverageStrategy,
  LiftUnsupportedWarning,
  ToneWarning,
} from "../engine/formula";
import { getAppliedCorrector } from "../engine/formula";
import type { BrandId } from "../engine/brands";
import { getCorrectorDeveloperParts, getCorrectorProduct, getDefaultCorrectorForm } from "../engine/correctorProducts";
import type { CorrectorChoice, CorrectorSelection } from "../engine/correctorProducts";
import type { Level, UnderlyingPigment } from "../engine/levels";
import type { ToneFamily } from "../engine/shades";
import { formatDeveloperVolume } from "./formatDeveloperVolume";

// Renders the engine's language-independent results (engine/formula.ts reports warnings
// and the gray-coverage strategy as plain data) in the current UI language. Called at
// display time by both the live calculator and History, so a saved entry always reads in
// whatever language the UI is in now, not the one that was active when it was saved.

// A tone family's name as it reads inside a sentence ("ash", "попелястий").
export function formatToneName(tone: ToneFamily): string {
  return i18n.t(`palette.toneFamily.${tone}`).toLowerCase();
}

export function formatPigmentName(pigment: UnderlyingPigment): string {
  return i18n.t(`pigment.${pigment}`);
}

// Which product the corrector is named after. Without it, or for a brand with no
// corrector table, the corrector is named by its generic tone.
export interface CorrectorBrand {
  brandId: BrandId;
  line: string | null;
  // The depth the corrector works at, for products that change with it (Wella's green
  // corrector). Absent in the formula calculator, whose correctors do not.
  level?: Level;
}

// A corrective tone as the colorist reaches for it: the brand's own code ("/8 or 0/88")
// where the brand has one, the tone's name otherwise.
function formatCorrectorName(tone: ToneFamily, brand?: CorrectorBrand): string {
  const product = getCorrectorProduct(brand?.brandId, brand?.line, tone, brand?.level);
  if (product === null) return formatToneName(tone);
  if (product.shade === undefined) return product.mixtone ?? formatToneName(tone);
  if (product.mixtone === undefined) return product.shade;
  return i18n.t("results.correctorShadeOrMixtone", { shade: product.shade, mixtone: product.mixtone });
}

export function formatToneWarning(warning: ToneWarning, brand?: CorrectorBrand): string {
  return i18n.t("engine.toneWarning", {
    tone: formatToneName(warning.tone),
    pigment: formatPigmentName(warning.pigment),
    recommended: (warning.recommendedTones ?? [warning.recommended])
      .map(tone => formatCorrectorName(tone, brand))
      .join(" + "),
  });
}

type CorrectorResult = Pick<FullFormula, "recommendedCorrectiveTone" | "correctorGrams" | "correctiveTones">;

// The corrector to add, tone by tone: "1 g ash + 1 g violet". Null when the formula needs
// none. A result saved before correctors could be blends has only the one tone.
export function formatCorrectiveTones(result: CorrectorResult, brand?: CorrectorBrand): string | null {
  if (result.recommendedCorrectiveTone === null) return null;
  const tones =
    result.correctiveTones !== undefined && result.correctiveTones.length > 0
      ? result.correctiveTones
      : [{ tone: result.recommendedCorrectiveTone, grams: result.correctorGrams }];
  const corrector = tones
    .map(({ tone, grams }) => i18n.t("results.recommendedToneValue", { grams, tone: formatCorrectorName(tone, brand) }))
    .join(" + ");
  // Where the brand mixes developer with the corrector too, say how much more to add.
  const developerParts = getCorrectorDeveloperParts(brand?.brandId, brand?.line);
  if (developerParts === null) return corrector;
  const totalGrams = tones.reduce((sum, { grams }) => sum + (grams ?? 0), 0);
  return i18n.t("results.correctorWithDeveloper", {
    corrector,
    grams: Math.round(totalGrams * developerParts * 10) / 10,
  });
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

// The corrector as lines of the mix: each tone under the name the colorist reaches for,
// and the developer it adds to the bowl. Null when the formula calls for no corrector.
export interface MixCorrector {
  parts: { name: string; grams: number }[];
  developerGrams: number;
}

// The one product a tone is mixed in as: the form the colorist picked, or the line's
// default. The tone's name where the brand has no product for it.
export function formatChosenCorrectorName(tone: ToneFamily, brand?: CorrectorBrand, choice?: CorrectorChoice): string {
  const product = getCorrectorProduct(brand?.brandId, brand?.line, tone, brand?.level);
  if (product === null) return formatToneName(tone);
  const form = choice === "shade" || choice === "mixtone" ? choice : getDefaultCorrectorForm(product);
  return product[form] ?? product.mixtone ?? product.shade ?? formatToneName(tone);
}

export function buildMixCorrector(
  result: CorrectorResult & Pick<FullFormula, "mixingRatio">,
  brand?: CorrectorBrand,
  selection?: CorrectorSelection,
): MixCorrector | null {
  const applied = getAppliedCorrector(result, selection);
  if (applied === null) return null;
  return {
    parts: applied.tones.map(({ tone, grams }) => ({
      name: formatChosenCorrectorName(tone, brand, selection?.[tone]),
      grams,
    })),
    developerGrams: applied.developerGrams,
  };
}

// The corrector actually mixed in, as one phrase: "4 g 0/88 + 4 g 0/66".
export function formatMixCorrector(corrector: MixCorrector): string {
  return corrector.parts
    .map(part => i18n.t("results.recommendedToneValue", { grams: part.grams, tone: part.name }))
    .join(" + ");
}
