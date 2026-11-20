import i18n from "../../i18n";
import type { ApplicationZone } from "../../engine/applicationZone";
import { formatBrandLineLabel } from "../../engine/formatLineLabel";
import { buildBlendMixSummary, buildMixSummary } from "../../format/formatFormula";
import { formatDeveloperVolume } from "../../format/formatDeveloperVolume";
import {
  atResultLevel,
  buildMixCorrector,
  formatCorrectiveTones,
  formatEligibilityWarning,
  formatGrayLiftWarning,
  formatLiftUnsupportedWarning,
  formatPigmentName,
  formatToneWarning,
  getGrayCoverageNote,
  isBackgroundCoveredByShade,
} from "../../format/formulaMessages";
import type { Brand, BrandId } from "../../engine/brands";
import { buildRepeatFormulaRequest, resolveStepBrand, type FormulaHistoryEntry } from "../../history";
import type { FormulaHair, FormulaMix, FormulaProduct } from "./formulaResultsModel";

// One formula as the comparison sees it: everything the simple calculator shows in its
// results panel, frozen at the moment it was taken. Formula A is pinned like this and
// kept above the calculator screen (see AuthenticatedApp), so it survives leaving the
// screen; formula B is the calculator's live result in the same shape.
export interface ComparedFormula {
  // Set when the formula is a saved visit: the day it was applied, null if History has no
  // date. Unset for a formula taken from the calculator.
  visitDate?: string | null;
  product: FormulaProduct;
  hair: FormulaHair;
  mix: FormulaMix;
  applicationZone: ApplicationZone;
  neutralizationApplied: boolean;
  processingMinutes: number;
  productCost: number | null;
}

export interface ComparisonRow {
  // Stable id, also the i18n label key's last segment.
  id: string;
  label: string;
  a: string;
  b: string;
  differs: boolean;
}

export interface FormulaComparison {
  // Hair and zone rows that are the same for both formulas, shown once above the table.
  shared: ComparisonRow[];
  // Every other row, side by side; hair and zone rows join them when they differ.
  rows: ComparisonRow[];
}

const NONE = "—";

// The mix line exactly as the results panel shows it, the corrector included once the
// colorist mixes it in.
export function formatMixLine(product: FormulaProduct, mix: FormulaMix, neutralizationApplied: boolean): string | null {
  const { targetShade, result, blend, naturalBase, correctorSelection = {} } = mix;
  if (result.grams === null) return null;
  const corrector = neutralizationApplied ? buildMixCorrector(result, product, correctorSelection) : null;
  return blend !== null
    ? buildBlendMixSummary(
        blend,
        result.grams.developerGrams,
        mix.additionalShade,
        mix.additionalShadeGrams,
        mix.additionalShade2,
        mix.additionalShade2Grams,
        naturalBase,
        corrector,
      )
    : buildMixSummary(
        targetShade,
        result.grams,
        mix.additionalShade,
        mix.additionalShadeGrams,
        mix.additionalShade2,
        mix.additionalShade2Grams,
        naturalBase,
        corrector,
      );
}

function shadeValue({ product, mix }: ComparedFormula): string {
  const { code, name } = mix.targetShade;
  const label = `${formatBrandLineLabel(product.brandName, product.line)} ${code}`;
  return name !== undefined ? `${label} ${name}` : label;
}

function grayCoverageValue({ mix }: ComparedFormula): string {
  const { result, naturalBase } = mix;
  const natural = Math.round(result.grayCoverage.naturalRatio * 100);
  const fashion = Math.round(result.grayCoverage.fashionRatio * 100);
  if (naturalBase !== null) {
    return i18n.t("results.grayCoverageAppliedValue", { code: naturalBase.shade.code, natural, fashion });
  }
  if (result.grayCoverage.naturalRatio === 0) return NONE;
  return i18n.t("results.grayCoverageValue", { note: getGrayCoverageNote(result.grayCoverage), natural, fashion });
}

function correctorValue({ product, mix }: ComparedFormula): string {
  const { result } = mix;
  return (
    formatCorrectiveTones(result, product) ??
    (isBackgroundCoveredByShade(result) && result.underlyingPigment !== null
      ? i18n.t("results.toneCoveredByShade", { pigment: formatPigmentName(result.underlyingPigment) })
      : NONE)
  );
}

function warningsValue(formula: ComparedFormula): string {
  const { product, mix, neutralizationApplied } = formula;
  const { result } = mix;
  const correctorInMix =
    neutralizationApplied && buildMixCorrector(result, product, mix.correctorSelection ?? {}) !== null;
  const warnings = [
    result.liftUnsupportedWarning !== null ? formatLiftUnsupportedWarning(result.liftUnsupportedWarning) : null,
    result.liftUnsupportedWarning === null && result.developerVolume === null ? i18n.t("results.notAchievable") : null,
    result.toneWarning !== null && !correctorInMix
      ? formatToneWarning(result.toneWarning, atResultLevel(product, result))
      : null,
    result.eligibilityWarning !== null ? formatEligibilityWarning(result.eligibilityWarning) : null,
    result.grayLiftWarning ? formatGrayLiftWarning(result.grayLiftWarning) : null,
  ].filter((warning): warning is string => warning !== null);
  return warnings.length > 0 ? warnings.join("\n") : NONE;
}

type RowValue = (formula: ComparedFormula) => string;

// Hair and zone: shared above the table when equal.
const HAIR_ROWS: [string, string, RowValue][] = [
  ["startLevel", "fields.startLevel", f => String(f.hair.startLevel)],
  ["grayPercent", "fields.grayPercent", f => `${f.hair.grayPercent}%`],
  ["porosity", "canvas.porosity.label", f => i18n.t(`canvas.porosity.${f.hair.canvas.porosity}`)],
  [
    "applicationZone",
    "results.applicationZone",
    f =>
      i18n.t(
        f.applicationZone === "full-head" ? "fields.applicationZoneFullHead" : "fields.applicationZoneRootTouchUp",
      ),
  ],
];

const FORMULA_ROWS: [string, string, RowValue][] = [
  ["shade", "comparison.shade", shadeValue],
  [
    "achievedLevel",
    "results.achievedLevel",
    f => (f.mix.result.achievedLevel !== null ? String(f.mix.result.achievedLevel) : NONE),
  ],
  [
    "developer",
    "results.developer",
    f =>
      f.mix.result.developerVolume !== null
        ? formatDeveloperVolume(f.mix.result.developerVolume, f.mix.targetShade.developerPercentOverride)
        : NONE,
  ],
  [
    "ratio",
    "results.ratio",
    f => `${f.mix.result.mixingRatio.colorParts} : ${f.mix.result.mixingRatio.developerParts}`,
  ],
  ["mix", "results.mix", f => formatMixLine(f.product, f.mix, f.neutralizationApplied) ?? NONE],
  ["grayCoverage", "results.grayCoverage", grayCoverageValue],
  [
    "background",
    "comparison.background",
    f => (f.mix.result.underlyingPigment !== null ? formatPigmentName(f.mix.result.underlyingPigment) : NONE),
  ],
  ["corrector", "results.recommendedTone", correctorValue],
  ["processingTime", "comparison.processingTime", f => i18n.t("comparison.minutes", { minutes: f.processingMinutes })],
  ["productCost", "results.productCost", f => (f.productCost !== null ? f.productCost.toFixed(2) : NONE)],
  ["warnings", "comparison.warnings", warningsValue],
];

function toRow(
  [id, labelKey, value]: [string, string, RowValue],
  a: ComparedFormula,
  b: ComparedFormula,
): ComparisonRow {
  const valueA = value(a);
  const valueB = value(b);
  return { id, label: i18n.t(labelKey), a: valueA, b: valueB, differs: valueA !== valueB };
}

// The two formulas row by row, each row flagged when its values differ -- compared as the
// colorist reads them, so a difference that doesn't show (e.g. 29.99 vs 30.0 g rounding to
// the same text) isn't flagged either.
export function compareFormulas(a: ComparedFormula, b: ComparedFormula): FormulaComparison {
  const hairRows = HAIR_ROWS.map(spec => toRow(spec, a, b));
  return {
    shared: hairRows.filter(row => !row.differs),
    rows: [...hairRows.filter(row => row.differs), ...FORMULA_ROWS.map(spec => toRow(spec, a, b))],
  };
}

// A saved visit as formula A: what was mixed then, exactly as History recorded it. Only a
// visit the simple calculator can repeat (one color step, no zones) has one -- the same
// rule as buildRepeatFormulaRequest -- since B is that visit repeated into the
// calculator. Null for a multi-step session or a brand no longer in the catalog.
export function comparedFormulaFromHistory(
  entry: FormulaHistoryEntry,
  brands: Record<BrandId, Brand>,
): ComparedFormula | null {
  if (buildRepeatFormulaRequest(entry, brands) === null) return null;
  const step = entry.steps[0];
  if (step.kind !== "color") return null;
  const brand = resolveStepBrand(step, brands);
  if (brand === undefined) return null;
  return {
    visitDate: entry.appliedAt?.toDate().toLocaleDateString() ?? null,
    product: { brandId: brand.id, brandName: step.brandName, line: step.line },
    hair: {
      startLevel: step.startLevel,
      grayPercent: step.grayPercent,
      canvas: step.canvas ?? { porosity: "normal", thickness: "medium", chemicalHistory: [] },
    },
    mix: {
      targetShade: step.targetShade,
      result: step.result,
      additionalShade: step.additionalShade ?? null,
      additionalShadeGrams: step.additionalShadeGrams ?? 0,
      additionalShade2: step.additionalShade2 ?? null,
      additionalShade2Grams: step.additionalShade2Grams ?? 0,
      blend: step.blend ?? null,
      naturalBase: step.naturalBase ?? null,
      correctorSelection: step.correctorSelection,
    },
    applicationZone: step.applicationZone ?? "full-head",
    neutralizationApplied: step.neutralizationApplied,
    processingMinutes: step.processingMinutes,
    productCost: entry.productCost,
  };
}

// A column's header: "A (visit 12.11.2026)" for a saved visit, "A (pinned)" / "B (current)"
// otherwise.
export function comparisonColumnLabel(column: "A" | "B", formula: ComparedFormula): string {
  if (formula.visitDate === undefined) {
    return i18n.t(column === "A" ? "comparison.formulaA" : "comparison.formulaB");
  }
  return formula.visitDate !== null
    ? i18n.t("comparison.visitColumn", { column, date: formula.visitDate })
    : i18n.t("comparison.visitColumnNoDate", { column });
}

// Whether the live formula is still exactly the saved visit it was repeated from: every
// row reads the same. Once the colorist changes anything it is no longer that visit.
export function isSameFormula(a: ComparedFormula, b: ComparedFormula): boolean {
  return compareFormulas(a, b).rows.every(row => !row.differs);
}
