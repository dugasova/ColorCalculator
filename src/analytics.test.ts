import { describe, it, expect } from 'vitest';
import { computeSalonAnalytics } from './analytics';
import type { ColorHistoryStep, FormulaHistoryEntry } from './history';

function makeColorStep(overrides: Partial<ColorHistoryStep> = {}): ColorHistoryStep {
  return {
    kind: 'color',
    brandName: 'Wella',
    line: null,
    targetShade: { code: '7.1', level: 7, tone: 'ash' },
    startLevel: 7,
    grayPercent: 0,
    applicationZone: 'full-head',
    result: {
      developerVolume: 20,
      mixingRatio: { colorParts: 1, developerParts: 1 },
      grayCoverage: { naturalRatio: 0, fashionRatio: 1, note: '' },
      underlyingPigment: null,
      recommendedCorrectiveTone: null,
      correctorGrams: null,
      recommendedProcessingMinutes: 30,
      toneWarning: null,
      eligibilityWarning: null,
      liftUnsupportedWarning: null,
      grams: null,
    },
    additionalShade: null,
    additionalShadeGrams: null,
    blend: null,
    prePigmentation: null,
    neutralizationApplied: false,
    processingMinutes: 30,
    pricePerGram: 0.18,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<FormulaHistoryEntry> & { clientName: string }): FormulaHistoryEntry {
  return {
    id: 'id',
    note: '',
    appliedBy: 'stylist',
    appliedAt: null,
    steps: [makeColorStep()],
    markupMultiplier: 4,
    productCost: null,
    servicePrice: null,
    patchTestDate: '',
    allergyNotes: '',
    patchTestOverride: true,
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    ...overrides,
  };
}

describe('computeSalonAnalytics', () => {
  it('counts shade popularity per brand+line+code, sorted by count desc', () => {
    const entries = [
      makeEntry({ clientName: 'A', steps: [makeColorStep({ brandName: 'Wella', targetShade: { code: '7.1', level: 7, tone: 'ash' } })] }),
      makeEntry({ clientName: 'B', steps: [makeColorStep({ brandName: 'Wella', targetShade: { code: '7.1', level: 7, tone: 'ash' } })] }),
      makeEntry({ clientName: 'C', steps: [makeColorStep({ brandName: "L'Oréal", targetShade: { code: '7.1', level: 7, tone: 'ash' } })] }),
    ];

    const stats = computeSalonAnalytics(entries);
    expect(stats.popularShades).toEqual([
      { brandName: 'Wella', line: null, shadeCode: '7.1', count: 2 },
      { brandName: "L'Oréal", line: null, shadeCode: '7.1', count: 1 },
    ]);
  });

  it('counts only color steps, skipping bleach steps within the same entry', () => {
    const entries = [
      makeEntry({
        clientName: 'A',
        steps: [
          { kind: 'bleach', startLevel: 6, targetLevel: 9, result: {
            startLevel: 6, targetLevel: 9, liftNeeded: 3, developerVolume: 30, multiStepRequired: false,
            mixingRatio: { powderParts: 1, developerParts: 2 }, grams: { powderGrams: 20, developerGrams: 40 },
            recommendedProcessingMinutes: 35, maxScalpProcessingMinutes: 50, checkIntervalMinMinutes: 5, checkIntervalMaxMinutes: 10,
          }, processingMinutes: 35, pricePerGram: 0.1 },
          makeColorStep({ targetShade: { code: '9.1', level: 9, tone: 'ash' } }),
        ],
      }),
    ];

    const stats = computeSalonAnalytics(entries);
    expect(stats.popularShades).toEqual([
      { brandName: 'Wella', line: null, shadeCode: '9.1', count: 1 },
    ]);
  });

  it('averages colorGrams, excluding developer grams and null formulas', () => {
    const entries = [
      makeEntry({ clientName: 'A', steps: [makeColorStep({ result: { ...makeColorStep().result, grams: { colorGrams: 20, developerGrams: 40 } } })] }),
      makeEntry({ clientName: 'B', steps: [makeColorStep({ result: { ...makeColorStep().result, grams: { colorGrams: 10, developerGrams: 10 } } })] }),
      makeEntry({ clientName: 'C', steps: [makeColorStep({ result: { ...makeColorStep().result, grams: null } })] }),
    ];

    expect(computeSalonAnalytics(entries).averageColorGrams).toBe(15);
  });

  it('returns null averageColorGrams when no entry has a computed formula', () => {
    const entries = [makeEntry({ clientName: 'A' })];
    expect(computeSalonAnalytics(entries).averageColorGrams).toBeNull();
  });

  it('ignores a step whose result has no grams field at all (not just null)', () => {
    // Simulates a Firestore doc saved before `grams` existed on FullFormula: the key is
    // absent, so `step.result.grams` is `undefined` at runtime, not `null`.
    const stepWithoutGrams: Partial<ColorHistoryStep['result']> = { ...makeColorStep().result };
    delete stepWithoutGrams.grams;
    const entries = [
      makeEntry({ clientName: 'A', steps: [{ ...makeColorStep(), result: stepWithoutGrams as ColorHistoryStep['result'] }] }),
      makeEntry({ clientName: 'B', steps: [makeColorStep({ result: { ...makeColorStep().result, grams: { colorGrams: 10, developerGrams: 10 } } })] }),
    ];

    expect(computeSalonAnalytics(entries).averageColorGrams).toBe(10);
  });

  it('averages productCost across entries with a non-null value', () => {
    const entries = [
      makeEntry({ clientName: 'A', productCost: 20 }),
      makeEntry({ clientName: 'B', productCost: 10 }),
      makeEntry({ clientName: 'C', productCost: null }),
    ];

    expect(computeSalonAnalytics(entries).averageProductCost).toBe(15);
  });

  it('returns null averageProductCost when every entry has a null cost', () => {
    const entries = [makeEntry({ clientName: 'A', productCost: null })];
    expect(computeSalonAnalytics(entries).averageProductCost).toBeNull();
  });

  it('excludes a legacy entry with no productCost field at all, instead of poisoning the average with NaN', () => {
    // Simulates a Firestore doc saved before `productCost` existed on this schema: the key
    // is absent, so `entry.productCost` is `undefined` at runtime, not `null`.
    const legacy = makeEntry({ clientName: 'A' });
    const legacyWithoutProductCost: Partial<FormulaHistoryEntry> = { ...legacy };
    delete legacyWithoutProductCost.productCost;
    const entries = [
      legacyWithoutProductCost as FormulaHistoryEntry,
      makeEntry({ clientName: 'B', productCost: 20 }),
    ];

    expect(computeSalonAnalytics(entries).averageProductCost).toBe(20);
  });

  it('computes retention rate as returning clients over unique named clients', () => {
    const entries = [
      makeEntry({ clientName: 'Returning' }),
      makeEntry({ clientName: 'Returning' }),
      makeEntry({ clientName: 'OneTime A' }),
      makeEntry({ clientName: 'OneTime B' }),
      makeEntry({ clientName: '' }),
    ];

    const stats = computeSalonAnalytics(entries);
    expect(stats.uniqueClients).toBe(3);
    expect(stats.returningClients).toBe(1);
    expect(stats.retentionRate).toBeCloseTo(1 / 3);
  });

  it('avoids division by zero when there are no entries', () => {
    const stats = computeSalonAnalytics([]);
    expect(stats.uniqueClients).toBe(0);
    expect(stats.retentionRate).toBe(0);
    expect(stats.totalVisits).toBe(0);
  });
});
