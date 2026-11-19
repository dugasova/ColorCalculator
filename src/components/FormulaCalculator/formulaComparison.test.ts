import { describe, it, expect } from "vitest";
import "../../i18n";
import { BRANDS } from "../../engine/brands";
import { calculateFullFormula } from "../../engine/formula";
import type { Level } from "../../engine/levels";
import { compareFormulas, comparedFormulaFromHistory, type ComparedFormula } from "./formulaComparison";
import type { FormulaHistoryEntry } from "../../history";
import { makeBleachStep, makeColorStep, makeEntry } from "../../testFixtures";

function wella(code: string, startLevel: Level, overrides: Partial<ComparedFormula> = {}): ComparedFormula {
  const targetShade = BRANDS.wella.shades.find(s => s.code === code && s.line === "koleston-perfect")!;
  const result = calculateFullFormula({ startLevel, targetShade, grayPercent: 0, totalGrams: 60 });
  return {
    product: { brandId: "wella", brandName: "Wella", line: "koleston-perfect" },
    hair: { startLevel, grayPercent: 0, canvas: { porosity: "normal", thickness: "medium", chemicalHistory: [] } },
    mix: {
      targetShade,
      result,
      additionalShade: null,
      additionalShadeGrams: 0,
      blend: null,
      naturalBase: null,
    },
    applicationZone: "full-head",
    neutralizationApplied: false,
    processingMinutes: result.recommendedProcessingMinutes,
    productCost: 6,
    ...overrides,
  };
}

const value = (comparison: ReturnType<typeof compareFormulas>, id: string) =>
  comparison.rows.find(row => row.id === id)!;

describe("compareFormulas", () => {
  it("flags the shade and its corrector, not the rows both formulas share", () => {
    const comparison = compareFormulas(wella("8/1", 6), wella("8/3", 6));

    expect(value(comparison, "shade")).toMatchObject({
      a: "Wella Koleston Perfect 8/1",
      b: "Wella Koleston Perfect 8/3",
      differs: true,
    });
    expect(value(comparison, "developer").differs).toBe(false);
    expect(value(comparison, "background").differs).toBe(false);
    expect(value(comparison, "corrector").differs).toBe(true);
    expect(comparison.shared.map(row => row.id)).toEqual(["startLevel", "grayPercent", "porosity", "applicationZone"]);
  });

  it("shows prices and minutes as the colorist reads them", () => {
    const comparison = compareFormulas(wella("8/1", 6), wella("8/1", 6, { processingMinutes: 40, productCost: 7.5 }));
    expect(value(comparison, "processingTime")).toMatchObject({ a: "30 min", b: "40 min", differs: true });
    expect(value(comparison, "productCost")).toMatchObject({ a: "6.00", b: "7.50", differs: true });
  });

  it("lists a formula's warnings and a dash when it has none", () => {
    const comparison = compareFormulas(wella("8/1", 6), wella("10/0", 4));
    expect(value(comparison, "warnings").a).toBe("—");
    expect(value(comparison, "warnings").b).toContain("Not achievable in a single process");
  });
});

describe("comparedFormulaFromHistory", () => {
  it("turns a single-formula visit into formula A, named by its date", () => {
    const step = makeColorStep({ processingMinutes: 35, neutralizationApplied: true });
    const entry = makeEntry({
      clientName: "Anna K.",
      steps: [step],
      productCost: 4.2,
      appliedAt: { toDate: () => new Date(2026, 10, 12) } as unknown as FormulaHistoryEntry["appliedAt"],
    });
    const visit = comparedFormulaFromHistory(entry, BRANDS)!;

    expect(visit.label).toBe(`A (visit ${new Date(2026, 10, 12).toLocaleDateString()})`);
    expect(visit).toMatchObject({
      product: { brandId: "generic", brandName: "Generic", line: null },
      hair: { startLevel: 7, grayPercent: 0 },
      processingMinutes: 35,
      productCost: 4.2,
      neutralizationApplied: true,
    });
    expect(visit.mix.result).toBe(step.result);
  });

  it("has none for a multi-step session", () => {
    const entry = makeEntry({ clientName: "Anna K.", steps: [makeBleachStep(), makeColorStep()] });
    expect(comparedFormulaFromHistory(entry, BRANDS)).toBeNull();
  });
});
