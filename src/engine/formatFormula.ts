import i18n from "../i18n";
import type { Level } from "./levels";
import type { Shade } from "./shades";
import type { FullFormula, FormulaGrams } from "./formula";
import { getGrayCoverageNote } from "./formula";
import type { ApplicationZone } from "./applicationZone";
import { formatLineLabel } from "./formatLineLabel";
import { formatDeveloperVolumeLine } from "./formatDeveloperVolume";

export interface FormatFormulaParams {
  brandName: string;
  line: string | null;
  targetShade: Shade;
  startLevel: Level;
  result: FullFormula;
  processingMinutes: number;
  // `null` omits the "Application: ..." line entirely -- used for ComplexColoring steps
  // (see formatSession.ts), where StrandZoneField already describes the step's position
  // and ApplicationZoneField isn't offered at all; showing a frozen "Application: Full
  // head" default there would be meaningless, unlike the plain single-shot
  // FormulaCalculator where this genuinely reflects the colorist's own choice.
  applicationZone: ApplicationZone | null;
  additionalShade: Shade | null;
  additionalShadeGrams: number;
  additionalShade2?: Shade | null;
  additionalShade2Grams?: number;
  // A substitute blend for a shade that's out of stock (see BlendSummary). Independent
  // of additionalShade/additionalShadeGrams below -- a colorist may both substitute a
  // blend for the missing target shade AND still add a discretionary corrective shade
  // on top of that blend.
  blend: BlendSummary | null;
  neutralizationApplied: boolean;
}

export interface BlendSummary {
  shadeA: Shade;
  shadeAGrams: number;
  shadeB: Shade;
  shadeBGrams: number;
}

// Mix breakdown for a substitute blend approximating a shade that's out of stock: the
// target shade (the visual goal named in the title above) never appears here, since it
// isn't a real product to weigh -- only the two components standing in for it, plus any
// discretionary additional shade(s) blended on top (see buildMixSummary's own additional-
// shade handling -- `developerGrams` here already reflects their weight, same as there).
export function buildBlendMixSummary(
  blend: BlendSummary,
  developerGrams: number,
  additionalShade?: Shade | null,
  additionalShadeGrams?: number,
  additionalShade2?: Shade | null,
  additionalShade2Grams?: number,
): string {
  const hasAdditional = additionalShade != null && (additionalShadeGrams ?? 0) > 0;
  const hasAdditional2 = additionalShade2 != null && (additionalShade2Grams ?? 0) > 0;
  const parts = [
    i18n.t("format.mixShade", { code: blend.shadeA.code, grams: blend.shadeAGrams.toFixed(1) }),
    i18n.t("format.mixShade", { code: blend.shadeB.code, grams: blend.shadeBGrams.toFixed(1) }),
  ];
  if (hasAdditional) {
    parts.push(i18n.t("format.mixShade", { code: additionalShade.code, grams: (additionalShadeGrams ?? 0).toFixed(1) }));
  }
  if (hasAdditional2) {
    parts.push(i18n.t("format.mixShade", { code: additionalShade2!.code, grams: (additionalShade2Grams ?? 0).toFixed(1) }));
  }
  parts.push(i18n.t("format.mixDeveloper", { grams: developerGrams.toFixed(1) }));
  return parts.join(" ");
}

// Renders the mix as a per-shade breakdown (e.g. "7/71- 30.0 g 7/17- 15.0 g developer 45.0 g")
// rather than a generic "color vs developer" split, so the colorist can read exactly how
// much of each shade — including any additional shade blended in at their discretion — to
// weigh out. `grams.colorGrams` already includes the additional shade's grams (see
// applyAdditionalShade), so it's subtracted back out here to get the primary shade's share.
export function buildMixSummary(
  targetShade: Shade,
  grams: FormulaGrams,
  additionalShade: Shade | null,
  additionalShadeGrams: number,
  additionalShade2?: Shade | null,
  additionalShade2Grams?: number,
): string {
  const hasAdditional = additionalShade !== null && additionalShadeGrams > 0;
  const hasAdditional2 = additionalShade2 !== null && additionalShade2 !== undefined && (additionalShade2Grams ?? 0) > 0;
  const primaryGrams = grams.colorGrams - (hasAdditional ? additionalShadeGrams : 0) - (hasAdditional2 ? (additionalShade2Grams ?? 0) : 0);

  const parts = [i18n.t("format.mixShade", { code: targetShade.code, grams: primaryGrams.toFixed(1) })];
  if (hasAdditional) {
    parts.push(i18n.t("format.mixShade", { code: additionalShade.code, grams: additionalShadeGrams.toFixed(1) }));
  }
  if (hasAdditional2) {
    parts.push(i18n.t("format.mixShade", { code: additionalShade2!.code, grams: (additionalShade2Grams ?? 0).toFixed(1) }));
  }
  parts.push(i18n.t("format.mixDeveloper", { grams: grams.developerGrams.toFixed(1) }));

  return parts.join(" ");
}

export function formatFormulaText(params: FormatFormulaParams): string {
  const {
    brandName, line, targetShade, startLevel, result, processingMinutes, applicationZone,
    additionalShade, additionalShadeGrams, additionalShade2, additionalShade2Grams, blend, neutralizationApplied,
  } = params;

  const title = `${brandName}${line ? " " + formatLineLabel(line) : ""} — ${targetShade.code} (${targetShade.tone}${targetShade.secondaryTone ? "/" + targetShade.secondaryTone : ""})`;

  const developer = formatDeveloperVolumeLine(result.developerVolume);

  const applyNeutralization = neutralizationApplied && result.recommendedCorrectiveTone !== null;
  const correctiveToneLine = applyNeutralization
    ? i18n.t("format.neutralizationApplied", { grams: result.correctorGrams, tone: result.recommendedCorrectiveTone })
    : i18n.t("format.recommendedTone", {
      value: result.recommendedCorrectiveTone !== null
        ? i18n.t("results.recommendedToneValue", { grams: result.correctorGrams, tone: result.recommendedCorrectiveTone })
        : i18n.t("results.none"),
    });

  const lines = [
    title,
    i18n.t("format.startingLevel", { start: startLevel, target: targetShade.level }),
    ...(result.achievedLevel !== null && result.achievedLevel !== targetShade.level
      ? [i18n.t("format.achievedLevel", { level: result.achievedLevel, target: targetShade.level })]
      : []),
    ...(applicationZone !== null
      ? [i18n.t("format.applicationZone", {
        value: applicationZone === "full-head" ? i18n.t("fields.applicationZoneFullHead") : i18n.t("fields.applicationZoneRootTouchUp"),
      })]
      : []),
    i18n.t("format.developer", { value: developer }),
    i18n.t("format.ratio", { color: result.mixingRatio.colorParts, developer: result.mixingRatio.developerParts }),
    result.grams !== null
      ? i18n.t("format.mixValue", {
        value: blend !== null
          ? buildBlendMixSummary(blend, result.grams.developerGrams, additionalShade, additionalShadeGrams, additionalShade2, additionalShade2Grams)
          : buildMixSummary(targetShade, result.grams, additionalShade, additionalShadeGrams, additionalShade2, additionalShade2Grams),
      })
      : i18n.t("format.mixFallback", { message: result.liftUnsupportedWarning ?? i18n.t("results.notAchievable") }),
    i18n.t("format.processingTime", { value: processingMinutes }),
    i18n.t("format.grayCoverage", {
      note: getGrayCoverageNote(result.grayCoverage),
      natural: Math.round(result.grayCoverage.naturalRatio * 100),
      fashion: Math.round(result.grayCoverage.fashionRatio * 100),
    }),
    correctiveToneLine,
  ];

  // With no mix to hold it (grams null) the warning already replaces the Mix line above;
  // when the colorist mixes anyway, it stays on record next to the formula instead.
  if (result.liftUnsupportedWarning !== null && result.grams !== null) {
    lines.push(i18n.t("format.warning", { message: result.liftUnsupportedWarning }));
  }
  if (result.toneWarning !== null && !applyNeutralization) {
    lines.push(i18n.t("format.warning", { message: result.toneWarning }));
  }
  if (result.eligibilityWarning !== null) {
    lines.push(i18n.t("format.warning", { message: result.eligibilityWarning }));
  }

  return lines.join("\n");
}
