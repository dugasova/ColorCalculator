import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import { computeSalonAnalytics, computeStylistStats, filterEntriesByPeriod } from "./analytics";
import type { ColorHistoryStep, FormulaHistoryEntry } from "./history";
import { COLOR_FULL_FORMULA, makeColorStep as makeSharedColorStep, makeBleachStep, makeEntry as makeSharedEntry } from "./testFixtures";

function makeColorStep(overrides: Partial<ColorHistoryStep> = {}): ColorHistoryStep {
  return makeSharedColorStep({
    brandName: "Wella",
    result: { ...COLOR_FULL_FORMULA, grams: null },
    ...overrides,
  });
}

function makeEntry(overrides: Partial<FormulaHistoryEntry> & { clientName: string }): FormulaHistoryEntry {
  return makeSharedEntry({ steps: [makeColorStep()], ...overrides });
}

describe("computeSalonAnalytics", () => {
  it("counts shade popularity per brand+line+code, sorted by count desc", () => {
    const entries = [
      makeEntry({ clientName: "A", steps: [makeColorStep({ brandName: "Wella", targetShade: { code: "7.1", level: 7, tone: "ash" } })] }),
      makeEntry({ clientName: "B", steps: [makeColorStep({ brandName: "Wella", targetShade: { code: "7.1", level: 7, tone: "ash" } })] }),
      makeEntry({ clientName: "C", steps: [makeColorStep({ brandName: "L'Oréal", targetShade: { code: "7.1", level: 7, tone: "ash" } })] }),
    ];

    const stats = computeSalonAnalytics(entries);
    expect(stats.popularShades).toEqual([
      { brandName: "Wella", line: null, shadeCode: "7.1", count: 2 },
      { brandName: "L'Oréal", line: null, shadeCode: "7.1", count: 1 },
    ]);
  });

  it("counts only color steps, skipping bleach steps within the same entry", () => {
    const entries = [
      makeEntry({
        clientName: "A",
        steps: [
          { kind: "bleach", startLevel: 6, targetLevel: 9, result: {
            startLevel: 6, targetLevel: 9, liftNeeded: 3, developerVolume: 30, multiStepRequired: false,
            mixingRatio: { powderParts: 1, developerParts: 2 }, grams: { powderGrams: 20, developerGrams: 40 },
            recommendedProcessingMinutes: 35, maxScalpProcessingMinutes: 50, checkIntervalMinMinutes: 5, checkIntervalMaxMinutes: 10,
          }, processingMinutes: 35, pricePerGram: 0.1 },
          makeColorStep({ targetShade: { code: "9.1", level: 9, tone: "ash" } }),
        ],
      }),
    ];

    const stats = computeSalonAnalytics(entries);
    expect(stats.popularShades).toEqual([
      { brandName: "Wella", line: null, shadeCode: "9.1", count: 1 },
    ]);
  });

  it("averages colorGrams, excluding developer grams and null formulas", () => {
    const entries = [
      makeEntry({ clientName: "A", steps: [makeColorStep({ result: { ...makeColorStep().result, grams: { colorGrams: 20, developerGrams: 40 } } })] }),
      makeEntry({ clientName: "B", steps: [makeColorStep({ result: { ...makeColorStep().result, grams: { colorGrams: 10, developerGrams: 10 } } })] }),
      makeEntry({ clientName: "C", steps: [makeColorStep({ result: { ...makeColorStep().result, grams: null } })] }),
    ];

    expect(computeSalonAnalytics(entries).averageColorGrams).toBe(15);
  });

  it("returns null averageColorGrams when no entry has a computed formula", () => {
    const entries = [makeEntry({ clientName: "A" })];
    expect(computeSalonAnalytics(entries).averageColorGrams).toBeNull();
  });

  it("ignores a step whose result has no grams field at all (not just null)", () => {
    // Simulates a Firestore doc saved before `grams` existed on FullFormula: the key is
    // absent, so `step.result.grams` is `undefined` at runtime, not `null`.
    const stepWithoutGrams: Partial<ColorHistoryStep["result"]> = { ...makeColorStep().result };
    delete stepWithoutGrams.grams;
    const entries = [
      makeEntry({ clientName: "A", steps: [{ ...makeColorStep(), result: stepWithoutGrams as ColorHistoryStep["result"] }] }),
      makeEntry({ clientName: "B", steps: [makeColorStep({ result: { ...makeColorStep().result, grams: { colorGrams: 10, developerGrams: 10 } } })] }),
    ];

    expect(computeSalonAnalytics(entries).averageColorGrams).toBe(10);
  });

  it("computes actualVsComputedRatio and averageActualColorGrams from recorded-vs-computed pairs", () => {
    const entries = [
      makeEntry({
        clientName: "A",
        steps: [makeColorStep({ actualColorGrams: 45, result: { ...makeColorStep().result, grams: { colorGrams: 30, developerGrams: 30 } } })],
      }),
      makeEntry({
        clientName: "B",
        steps: [makeColorStep({ actualColorGrams: 15, result: { ...makeColorStep().result, grams: { colorGrams: 10, developerGrams: 10 } } })],
      }),
    ];

    const stats = computeSalonAnalytics(entries);
    expect(stats.averageActualColorGrams).toBe(30);
    expect(stats.actualVsComputedRatio).toBeCloseTo(1.5, 5);
  });

  it("returns null averageActualColorGrams and actualVsComputedRatio when nothing has been recorded", () => {
    const entries = [makeEntry({ clientName: "A" })];
    const stats = computeSalonAnalytics(entries);
    expect(stats.averageActualColorGrams).toBeNull();
    expect(stats.actualVsComputedRatio).toBeNull();
  });

  it("averages productCost across entries with a non-null value", () => {
    const entries = [
      makeEntry({ clientName: "A", productCost: 20 }),
      makeEntry({ clientName: "B", productCost: 10 }),
      makeEntry({ clientName: "C", productCost: null }),
    ];

    expect(computeSalonAnalytics(entries).averageProductCost).toBe(15);
  });

  it("returns null averageProductCost when every entry has a null cost", () => {
    const entries = [makeEntry({ clientName: "A", productCost: null })];
    expect(computeSalonAnalytics(entries).averageProductCost).toBeNull();
  });

  it("excludes a legacy entry with no productCost field at all, instead of poisoning the average with NaN", () => {
    // Simulates a Firestore doc saved before `productCost` existed on this schema: the key
    // is absent, so `entry.productCost` is `undefined` at runtime, not `null`.
    const legacy = makeEntry({ clientName: "A" });
    const legacyWithoutProductCost: Partial<FormulaHistoryEntry> = { ...legacy };
    delete legacyWithoutProductCost.productCost;
    const entries = [
      legacyWithoutProductCost as FormulaHistoryEntry,
      makeEntry({ clientName: "B", productCost: 20 }),
    ];

    expect(computeSalonAnalytics(entries).averageProductCost).toBe(20);
  });

  it("computes retention rate as returning clients over unique named clients", () => {
    const entries = [
      makeEntry({ clientName: "Returning" }),
      makeEntry({ clientName: "Returning" }),
      makeEntry({ clientName: "OneTime A" }),
      makeEntry({ clientName: "OneTime B" }),
      makeEntry({ clientName: "" }),
    ];

    const stats = computeSalonAnalytics(entries);
    expect(stats.uniqueClients).toBe(3);
    expect(stats.returningClients).toBe(1);
    expect(stats.retentionRate).toBeCloseTo(1 / 3);
  });

  it("avoids division by zero when there are no entries", () => {
    const stats = computeSalonAnalytics([]);
    expect(stats.uniqueClients).toBe(0);
    expect(stats.retentionRate).toBe(0);
    expect(stats.totalVisits).toBe(0);
  });
});

describe("computeStylistStats", () => {
  it("aggregates per-stylist metrics, sorted by revenue desc", () => {
    const color = makeColorStep({ result: COLOR_FULL_FORMULA });
    const entries = [
      makeEntry({ appliedBy: "a@salon.test", clientName: "Anna", servicePrice: 100, productCost: 10, steps: [color] }),
      makeEntry({ appliedBy: "a@salon.test", clientName: "Anna", servicePrice: null, productCost: 5, steps: [color] }),
      makeEntry({ appliedBy: "a@salon.test", clientName: "Boris", servicePrice: 50, productCost: null, steps: [makeBleachStep(), color] }),
      makeEntry({ appliedBy: "b@salon.test", clientName: "Clara", servicePrice: 200, productCost: 20, steps: [color] }),
    ];

    const stats = computeStylistStats(entries);
    expect(stats.map(s => s.stylist)).toEqual(["b@salon.test", "a@salon.test"]);

    const a = stats.find(s => s.stylist === "a@salon.test")!;
    expect(a.visits).toBe(3);
    expect(a.uniqueClients).toBe(2);
    expect(a.returningClients).toBe(1);
    expect(a.retentionRate).toBeCloseTo(0.5);
    expect(a.revenue).toBe(150);
    expect(a.pricedVisits).toBe(2);
    expect(a.productCost).toBe(15);
    expect(a.grossProfit).toBe(90);
    expect(a.averageTicket).toBe(75);
    expect(a.bleachPowderGrams).toBe(20);
    expect(a.dyeGrams).toBe(90);
    expect(a.processingMinutes).toBe(125);
    expect(a.averageProcessingMinutes).toBeCloseTo(125 / 3);
    expect(a.topShade).toMatchObject({ shadeCode: "7.1", count: 3 });
  });

  it("breaks revenue/visit ties by stylist email ascending", () => {
    const color = makeColorStep({ result: COLOR_FULL_FORMULA });
    const entries = [
      makeEntry({ appliedBy: "zed@salon.test", clientName: "A", servicePrice: 100, steps: [color] }),
      makeEntry({ appliedBy: "amy@salon.test", clientName: "B", servicePrice: 100, steps: [color] }),
    ];

    const stats = computeStylistStats(entries);
    expect(stats.map(s => s.stylist)).toEqual(["amy@salon.test", "zed@salon.test"]);
  });

  it("excludes a legacy entry with no servicePrice/productCost field, instead of poisoning averages with NaN", () => {
    const legacy = makeEntry({ appliedBy: "a@salon.test", clientName: "A" });
    const legacyWithoutPricing: Partial<FormulaHistoryEntry> = { ...legacy };
    delete legacyWithoutPricing.servicePrice;
    delete legacyWithoutPricing.productCost;

    const [stats] = computeStylistStats([legacyWithoutPricing as FormulaHistoryEntry]);
    expect(stats.revenue).toBe(0);
    expect(stats.averageTicket).toBeNull();
    expect(stats.grossProfit).toBeNull();
  });

  it("finds the latest appliedAt as lastVisitAt, null when every entry is still pending", () => {
    const earlier = Timestamp.fromDate(new Date(2024, 0, 1));
    const later = Timestamp.fromDate(new Date(2024, 5, 1));
    const [withDates] = computeStylistStats([
      makeEntry({ appliedBy: "a@salon.test", clientName: "A", appliedAt: earlier }),
      makeEntry({ appliedBy: "a@salon.test", clientName: "B", appliedAt: later }),
    ]);
    expect(withDates.lastVisitAt).toEqual(later.toDate());

    const [pendingOnly] = computeStylistStats([
      makeEntry({ appliedBy: "a@salon.test", clientName: "A", appliedAt: null }),
    ]);
    expect(pendingOnly.lastVisitAt).toBeNull();
  });

  it("returns an empty array for no entries", () => {
    expect(computeStylistStats([])).toEqual([]);
  });
});

describe("filterEntriesByPeriod", () => {
  const now = new Date(2026, 9, 6, 12);
  const octFirst = Timestamp.fromDate(new Date(2026, 9, 1));
  const sep20 = Timestamp.fromDate(new Date(2026, 8, 20));
  const aug1 = Timestamp.fromDate(new Date(2026, 7, 1));

  function dated(appliedAt: Timestamp | null) {
    return makeEntry({ clientName: "A", appliedAt });
  }

  it("'all' returns every entry, same array reference", () => {
    const entries = [dated(octFirst), dated(sep20), dated(aug1), dated(null)];
    expect(filterEntriesByPeriod(entries, "all", now)).toBe(entries);
  });

  it("'last30Days' keeps entries within the trailing 30 days", () => {
    const entries = [dated(octFirst), dated(sep20), dated(aug1), dated(null)];
    const filtered = filterEntriesByPeriod(entries, "last30Days", now);
    expect(filtered).toEqual([dated(octFirst), dated(sep20)]);
  });

  it("'thisMonth' keeps only entries from the 1st of the current month", () => {
    const entries = [dated(octFirst), dated(sep20), dated(aug1), dated(null)];
    const filtered = filterEntriesByPeriod(entries, "thisMonth", now);
    expect(filtered).toEqual([dated(octFirst)]);
  });
});
