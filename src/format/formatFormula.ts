import i18n from "../i18n";
import type { BrandId } from "../engine/brands";
import type { CorrectorSelection } from "../engine/correctorProducts";
import type { Level } from "../engine/levels";
import type { Shade } from "../engine/shades";
import type { FullFormula, FormulaGrams, NaturalBase } from "../engine/formula";
import {
  formatEligibilityWarning,
  formatLiftUnsupportedWarning,
  formatPorosityAdjustment,
  formatToneWarning,
  formatCorrectiveTones,
  buildMixCorrector,
  formatMixCorrector,
  formatPigmentName,
  isBackgroundCoveredByShade,
  getGrayCoverageNote,
  atResultLevel,
} from "./formulaMessages";
import type { MixCorrector } from "./formulaMessages";
import type { ApplicationZone } from "../engine/applicationZone";
import { formatBrandLineLabel } from "../engine/formatLineLabel";
import { formatDeveloperVolumeLine } from "./formatDeveloperVolume";

export interface FormatFormulaParams {
  // Names the corrector by the brand's own codes; omitted, it is named by its tone.
  brandId?: BrandId;
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
  // Which tones of the corrector go in, and in what form; absent, all of them by default.
  correctorSelection?: CorrectorSelection;
  // The gray-coverage natural base, if the colorist opted in -- see NaturalBase. Optional
  // so callers formatting a step saved before this option existed can omit it.
  naturalBase?: NaturalBase | null;
}

export interface BlendSummary {
  shadeA: Shade;
  shadeAGrams: number;
  shadeB: Shade;
  shadeBGrams: number;
}

// An applied corrector goes into the bowl on top of the shades, right before the developer,
// whose weight then includes the corrector's own share (see getAppliedCorrector).
function pushCorrector(parts: string[], corrector: MixCorrector | null | undefined): void {
  for (const part of corrector?.parts ?? []) {
    parts.push(i18n.t("format.mixShade", { code: part.name, grams: part.grams.toFixed(1) }));
  }
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
  naturalBase?: NaturalBase | null,
  corrector?: MixCorrector | null,
): string {
  const hasAdditional = additionalShade != null && (additionalShadeGrams ?? 0) > 0;
  const hasAdditional2 = additionalShade2 != null && (additionalShade2Grams ?? 0) > 0;
  const parts = [
    i18n.t("format.mixShade", { code: blend.shadeA.code, grams: blend.shadeAGrams.toFixed(1) }),
    i18n.t("format.mixShade", { code: blend.shadeB.code, grams: blend.shadeBGrams.toFixed(1) }),
  ];
  // The blend components already split only the fashion share (see
  // useFormulaCalculatorState's `blend`), so the natural base sits alongside them.
  if (naturalBase != null) {
    parts.push(i18n.t("format.mixShade", { code: naturalBase.shade.code, grams: naturalBase.grams.toFixed(1) }));
  }
  if (hasAdditional) {
    parts.push(
      i18n.t("format.mixShade", { code: additionalShade.code, grams: (additionalShadeGrams ?? 0).toFixed(1) }),
    );
  }
  if (hasAdditional2) {
    parts.push(
      i18n.t("format.mixShade", { code: additionalShade2!.code, grams: (additionalShade2Grams ?? 0).toFixed(1) }),
    );
  }
  pushCorrector(parts, corrector);
  parts.push(i18n.t("format.mixDeveloper", { grams: (developerGrams + (corrector?.developerGrams ?? 0)).toFixed(1) }));
  return parts.join(" ");
}

// Renders the mix as a per-shade breakdown (e.g. "7/71- 30.0 g 7/17- 15.0 g developer 45.0 g")
// rather than a generic "color vs developer" split, so the colorist can read exactly how
// much of each shade — including any additional shade blended in at their discretion — to
// weigh out. `grams.colorGrams` already includes the additional shade's grams (see
// applyAdditionalShade), so it's subtracted back out here to get the primary shade's share
// -- as is any gray-coverage natural base, which was carved out of that same base weight
// (see splitNaturalBase). Order follows how the colorist builds the bowl: fashion shade,
// natural base, then any additional shade(s) on top, developer last.
export function buildMixSummary(
  targetShade: Shade,
  grams: FormulaGrams,
  additionalShade: Shade | null,
  additionalShadeGrams: number,
  additionalShade2?: Shade | null,
  additionalShade2Grams?: number,
  naturalBase?: NaturalBase | null,
  corrector?: MixCorrector | null,
): string {
  const hasAdditional = additionalShade !== null && additionalShadeGrams > 0;
  const hasAdditional2 =
    additionalShade2 !== null && additionalShade2 !== undefined && (additionalShade2Grams ?? 0) > 0;
  const naturalGrams = naturalBase?.grams ?? 0;
  const primaryGrams =
    grams.colorGrams -
    naturalGrams -
    (hasAdditional ? additionalShadeGrams : 0) -
    (hasAdditional2 ? (additionalShade2Grams ?? 0) : 0);

  const parts = [i18n.t("format.mixShade", { code: targetShade.code, grams: primaryGrams.toFixed(1) })];
  if (naturalBase != null) {
    parts.push(i18n.t("format.mixShade", { code: naturalBase.shade.code, grams: naturalGrams.toFixed(1) }));
  }
  if (hasAdditional) {
    parts.push(i18n.t("format.mixShade", { code: additionalShade.code, grams: additionalShadeGrams.toFixed(1) }));
  }
  if (hasAdditional2) {
    parts.push(
      i18n.t("format.mixShade", { code: additionalShade2!.code, grams: (additionalShade2Grams ?? 0).toFixed(1) }),
    );
  }
  pushCorrector(parts, corrector);
  parts.push(
    i18n.t("format.mixDeveloper", { grams: (grams.developerGrams + (corrector?.developerGrams ?? 0)).toFixed(1) }),
  );

  return parts.join(" ");
}

export function formatFormulaText(params: FormatFormulaParams): string {
  const {
    brandId,
    brandName,
    line,
    targetShade,
    startLevel,
    result,
    processingMinutes,
    applicationZone,
    additionalShade,
    additionalShadeGrams,
    additionalShade2,
    additionalShade2Grams,
    blend,
    neutralizationApplied,
    correctorSelection,
    naturalBase = null,
  } = params;

  const title = `${formatBrandLineLabel(brandName, line)} — ${targetShade.code} (${targetShade.tone}${targetShade.secondaryTone ? "/" + targetShade.secondaryTone : ""})`;

  const developer = formatDeveloperVolumeLine(result.developerVolume, targetShade.developerPercentOverride);

  const correctorBrand = atResultLevel(brandId !== undefined ? { brandId, line } : undefined, result);
  const corrector = formatCorrectiveTones(result, correctorBrand);
  const mixCorrector = neutralizationApplied ? buildMixCorrector(result, correctorBrand, correctorSelection) : null;
  const applyNeutralization = mixCorrector !== null;
  const correctiveToneLine = applyNeutralization
    ? i18n.t("format.neutralizationApplied", { value: formatMixCorrector(mixCorrector) })
    : i18n.t("format.recommendedTone", {
        value:
          corrector ??
          (isBackgroundCoveredByShade(result) && result.underlyingPigment !== null
            ? i18n.t("results.toneCoveredByShade", { pigment: formatPigmentName(result.underlyingPigment) })
            : i18n.t("results.none")),
      });

  // Only when gray coverage actually changes the mix: with no natural dose called for
  // (under 30% gray, including a client with no gray at all) and none blended in, the
  // line would just say "apply the tone as-is".
  const grayCoverageLine =
    naturalBase !== null
      ? i18n.t("format.grayCoverageApplied", {
          code: naturalBase.shade.code,
          natural: Math.round(result.grayCoverage.naturalRatio * 100),
          fashion: Math.round(result.grayCoverage.fashionRatio * 100),
        })
      : result.grayCoverage.naturalRatio > 0
        ? i18n.t("format.grayCoverage", {
            note: getGrayCoverageNote(result.grayCoverage),
            natural: Math.round(result.grayCoverage.naturalRatio * 100),
            fashion: Math.round(result.grayCoverage.fashionRatio * 100),
          })
        : null;

  const porosityNote = formatPorosityAdjustment(result, targetShade.developerPercentOverride);

  const lines = [
    title,
    i18n.t("format.startingLevel", { start: startLevel, target: targetShade.level }),
    ...(result.achievedLevel !== null && result.achievedLevel !== targetShade.level
      ? [i18n.t("format.achievedLevel", { level: result.achievedLevel, target: targetShade.level })]
      : []),
    ...(applicationZone !== null
      ? [
          i18n.t("format.applicationZone", {
            value:
              applicationZone === "full-head"
                ? i18n.t("fields.applicationZoneFullHead")
                : i18n.t("fields.applicationZoneRootTouchUp"),
          }),
        ]
      : []),
    i18n.t("format.developer", { value: developer }),
    i18n.t("format.ratio", { color: result.mixingRatio.colorParts, developer: result.mixingRatio.developerParts }),
    result.grams !== null
      ? i18n.t("format.mixValue", {
          value:
            blend !== null
              ? buildBlendMixSummary(
                  blend,
                  result.grams.developerGrams,
                  additionalShade,
                  additionalShadeGrams,
                  additionalShade2,
                  additionalShade2Grams,
                  naturalBase,
                  mixCorrector,
                )
              : buildMixSummary(
                  targetShade,
                  result.grams,
                  additionalShade,
                  additionalShadeGrams,
                  additionalShade2,
                  additionalShade2Grams,
                  naturalBase,
                  mixCorrector,
                ),
        })
      : i18n.t("format.mixFallback", {
          message:
            result.liftUnsupportedWarning !== null
              ? formatLiftUnsupportedWarning(result.liftUnsupportedWarning)
              : i18n.t("results.notAchievable"),
        }),
    i18n.t("format.processingTime", { value: processingMinutes }),
    ...(grayCoverageLine !== null ? [grayCoverageLine] : []),
    correctiveToneLine,
    ...(porosityNote !== null ? [porosityNote] : []),
  ];

  // With no mix to hold it (grams null) the warning already replaces the Mix line above;
  // when the colorist mixes anyway, it stays on record next to the formula instead.
  if (result.liftUnsupportedWarning !== null && result.grams !== null) {
    lines.push(i18n.t("format.warning", { message: formatLiftUnsupportedWarning(result.liftUnsupportedWarning) }));
  }
  if (result.toneWarning !== null && !applyNeutralization) {
    lines.push(i18n.t("format.warning", { message: formatToneWarning(result.toneWarning, correctorBrand) }));
  }
  if (result.eligibilityWarning !== null) {
    lines.push(i18n.t("format.warning", { message: formatEligibilityWarning(result.eligibilityWarning) }));
  }

  return lines.join("\n");
}
