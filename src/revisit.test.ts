import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import { getRegrowthIntervalDays, planClientRevisits, getRevisitStatus } from "./revisit";
import type { ColorHistoryStep, FormulaHistoryEntry } from "./history";
import { COLOR_FULL_FORMULA, makeColorStep as makeSharedColorStep, makeEntry as makeSharedEntry } from "./testFixtures";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

describe("getRegrowthIntervalDays", () => {
  it("maps gray-percent tiers to shortening intervals", () => {
    expect(getRegrowthIntervalDays(0)).toBe(42);
    expect(getRegrowthIntervalDays(29)).toBe(42);
    expect(getRegrowthIntervalDays(30)).toBe(35);
    expect(getRegrowthIntervalDays(49)).toBe(35);
    expect(getRegrowthIntervalDays(50)).toBe(28);
    expect(getRegrowthIntervalDays(79)).toBe(28);
    expect(getRegrowthIntervalDays(80)).toBe(21);
    expect(getRegrowthIntervalDays(100)).toBe(21);
  });
});

describe("planClientRevisits", () => {
  it("averages the gaps between dated visits for a returning client", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const entries = [
      makeEntry({ clientName: "Anna K.", appliedAt: Timestamp.fromDate(base) }),
      makeEntry({ clientName: "Anna K.", appliedAt: Timestamp.fromDate(new Date(base.getTime() + 14 * MS_PER_DAY)) }),
      makeEntry({ clientName: "Anna K.", appliedAt: Timestamp.fromDate(new Date(base.getTime() + 14 * MS_PER_DAY + 28 * MS_PER_DAY)) }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalBasis).toBe("history");
    expect(plan.intervalDays).toBe(21);
  });

  it("falls back to the service interval for a first-time client", () => {
    const entries = [
      makeEntry({ clientName: "New Client", steps: [makeColorStep({ grayPercent: 85 })], appliedAt: Timestamp.fromDate(new Date()) }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalBasis).toBe("service");
    expect(plan.intervalDays).toBe(getRegrowthIntervalDays(85));
  });

  it("falls back to the lightest tier for a first-time bleach-only session (no color step)", () => {
    const entries = [
      makeEntry({
        clientName: "Bleach Only",
        steps: [{
          kind: "bleach", startLevel: 6, targetLevel: 9, result: {
            startLevel: 6, targetLevel: 9, liftNeeded: 3, developerVolume: 30, multiStepRequired: false,
            mixingRatio: { powderParts: 1, developerParts: 2 }, grams: { powderGrams: 20, developerGrams: 40 },
            recommendedProcessingMinutes: 35, maxScalpProcessingMinutes: 50, checkIntervalMinMinutes: 5, checkIntervalMaxMinutes: 10,
          }, processingMinutes: 35, pricePerGram: 0.1,
        }],
        appliedAt: Timestamp.fromDate(new Date()),
      }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalBasis).toBe("service");
    expect(plan.intervalDays).toBe(getRegrowthIntervalDays(0));
  });

  it("excludes entries with no client name or no appliedAt", () => {
    const entries = [
      makeEntry({ clientName: "", appliedAt: Timestamp.fromDate(new Date()) }),
      makeEntry({ clientName: "Someone", appliedAt: null }),
    ];

    expect(planClientRevisits(entries)).toEqual([]);
  });

  it("groups entries for the same client regardless of casing/whitespace", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const entries = [
      makeEntry({ clientName: "Anna K.", appliedAt: Timestamp.fromDate(base) }),
      makeEntry({ clientName: " anna k. ", appliedAt: Timestamp.fromDate(new Date(base.getTime() + 20 * MS_PER_DAY)) }),
    ];

    const plans = planClientRevisits(entries);
    expect(plans).toHaveLength(1);
    expect(plans[0].intervalDays).toBe(20);
  });

  it("sorts results ascending by recommended date", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const entries = [
      makeEntry({ clientName: "Later Client", steps: [makeColorStep({ grayPercent: 10 })], appliedAt: Timestamp.fromDate(now) }), // +42d
      makeEntry({ clientName: "Sooner Client", steps: [makeColorStep({ grayPercent: 90 })], appliedAt: Timestamp.fromDate(now) }), // +21d
    ];

    const plans = planClientRevisits(entries);
    expect(plans.map(p => p.clientName)).toEqual(["Sooner Client", "Later Client"]);
  });

  it("schedules a lengths-only balayage session later than a full-head visit", () => {
    const entries = [
      makeEntry({
        clientName: "Balayage Client",
        steps: [
          {
            kind: "bleach", startLevel: 6, targetLevel: 9, strandZone: "mid-lengths", result: {
              startLevel: 6, targetLevel: 9, liftNeeded: 3, developerVolume: 30, multiStepRequired: false,
              mixingRatio: { powderParts: 1, developerParts: 2 }, grams: { powderGrams: 20, developerGrams: 40 },
              recommendedProcessingMinutes: 35, maxScalpProcessingMinutes: 50, checkIntervalMinMinutes: 5, checkIntervalMaxMinutes: 10,
            }, processingMinutes: 35, pricePerGram: 0.1,
          },
          makeColorStep({ strandZone: "ends", grayPercent: 0 }),
        ],
        appliedAt: Timestamp.fromDate(new Date()),
      }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalBasis).toBe("service");
    expect(plan.intervalDays).toBe(56);
    expect(plan.driver).toBe("toner-refresh");
    expect(plan.drivers.map(d => d.kind)).toEqual(["toner-refresh", "partial-lightening"]);
    expect(plan.intervalDays).toBeGreaterThan(getRegrowthIntervalDays(0));
  });

  it("keeps root regrowth as the driver in a mixed roots+ends session", () => {
    const entries = [
      makeEntry({
        clientName: "Mixed Client",
        steps: [
          makeColorStep({ strandZone: "roots", grayPercent: 60 }),
          makeColorStep({ strandZone: "ends", grayPercent: 60 }),
        ],
        appliedAt: Timestamp.fromDate(new Date()),
      }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalDays).toBe(getRegrowthIntervalDays(60));
    expect(plan.driver).toBe("regrowth");
  });

  it("recalls a pre-pigmented single-tone session sooner than gray alone implies", () => {
    const entries = [
      makeEntry({
        clientName: "Filled Client",
        steps: [
          makeColorStep({
            grayPercent: 0,
            prePigmentation: {
              need: "required-same-session", underlyingPigment: "orange", fillerTone: "copper",
              exampleFillerShade: null, mixingRatio: { fillerParts: 1, diluentParts: 1 },
              grams: { fillerGrams: 40, diluentGrams: 40 }, fillerProcessingMinutes: 20,
              multiVisitGapDays: null, finalStepMixingRatio: { colorParts: 1, developerParts: 1 },
              finalStepDeveloperVolume: 10,
            },
          }),
        ],
        appliedAt: Timestamp.fromDate(new Date()),
      }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalDays).toBe(28);
    expect(plan.driver).toBe("pigment-fade");
  });

  it("overrides the learned rhythm with the multi-visit filler window", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const entries = [
      makeEntry({ clientName: "Filler Client", appliedAt: Timestamp.fromDate(base) }),
      makeEntry({ clientName: "Filler Client", appliedAt: Timestamp.fromDate(new Date(base.getTime() + 14 * MS_PER_DAY)) }),
      makeEntry({
        clientName: "Filler Client",
        steps: [makeColorStep({
          prePigmentation: {
            need: "required-multi-visit", underlyingPigment: "orange", fillerTone: "copper",
            exampleFillerShade: null, mixingRatio: { fillerParts: 1, diluentParts: 1 },
            grams: { fillerGrams: 40, diluentGrams: 40 }, fillerProcessingMinutes: 20,
            multiVisitGapDays: { min: 7, max: 14 }, finalStepMixingRatio: { colorParts: 1, developerParts: 1 },
            finalStepDeveloperVolume: 10,
          },
        })],
        appliedAt: Timestamp.fromDate(new Date(base.getTime() + 28 * MS_PER_DAY)),
      }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalBasis).toBe("service");
    expect(plan.intervalDays).toBe(14);
    expect(plan.driver).toBe("multi-visit-filler");
  });

  it("ignores gaps ending in a different service when averaging", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const entries = [
      makeEntry({ clientName: "Switching Client", appliedAt: Timestamp.fromDate(base) }),
      makeEntry({ clientName: "Switching Client", appliedAt: Timestamp.fromDate(new Date(base.getTime() + 14 * MS_PER_DAY)) }),
      makeEntry({
        clientName: "Switching Client",
        steps: [
          {
            kind: "bleach", startLevel: 6, targetLevel: 9, strandZone: "mid-lengths", result: {
              startLevel: 6, targetLevel: 9, liftNeeded: 3, developerVolume: 30, multiStepRequired: false,
              mixingRatio: { powderParts: 1, developerParts: 2 }, grams: { powderGrams: 20, developerGrams: 40 },
              recommendedProcessingMinutes: 35, maxScalpProcessingMinutes: 50, checkIntervalMinMinutes: 5, checkIntervalMaxMinutes: 10,
            }, processingMinutes: 35, pricePerGram: 0.1,
          },
          makeColorStep({ strandZone: "ends", grayPercent: 0 }),
        ],
        appliedAt: Timestamp.fromDate(new Date(base.getTime() + 28 * MS_PER_DAY)),
      }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalBasis).toBe("service");
    expect(plan.intervalDays).toBe(56);
  });
});

describe("getRevisitStatus", () => {
  const now = new Date("2026-01-15T00:00:00Z");

  it("is overdue when the recommended date has passed or is today", () => {
    expect(getRevisitStatus(now, now)).toBe("overdue");
    expect(getRevisitStatus(new Date(now.getTime() - MS_PER_DAY), now)).toBe("overdue");
  });

  it("is due-soon within the next 7 days", () => {
    expect(getRevisitStatus(new Date(now.getTime() + MS_PER_DAY), now)).toBe("due-soon");
    expect(getRevisitStatus(new Date(now.getTime() + 7 * MS_PER_DAY), now)).toBe("due-soon");
  });

  it("is upcoming beyond 7 days", () => {
    expect(getRevisitStatus(new Date(now.getTime() + 8 * MS_PER_DAY), now)).toBe("upcoming");
  });
});
