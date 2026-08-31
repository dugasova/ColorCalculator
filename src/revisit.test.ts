import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { getDefaultRevisitIntervalDays, planClientRevisits, getRevisitStatus } from './revisit';
import type { ColorHistoryStep, FormulaHistoryEntry } from './history';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

describe('getDefaultRevisitIntervalDays', () => {
  it('maps gray-percent tiers to shortening intervals', () => {
    expect(getDefaultRevisitIntervalDays(0)).toBe(42);
    expect(getDefaultRevisitIntervalDays(29)).toBe(42);
    expect(getDefaultRevisitIntervalDays(30)).toBe(35);
    expect(getDefaultRevisitIntervalDays(49)).toBe(35);
    expect(getDefaultRevisitIntervalDays(50)).toBe(28);
    expect(getDefaultRevisitIntervalDays(79)).toBe(28);
    expect(getDefaultRevisitIntervalDays(80)).toBe(21);
    expect(getDefaultRevisitIntervalDays(100)).toBe(21);
  });
});

describe('planClientRevisits', () => {
  it('averages the gaps between dated visits for a returning client', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    const entries = [
      makeEntry({ clientName: 'Anna K.', appliedAt: Timestamp.fromDate(base) }),
      makeEntry({ clientName: 'Anna K.', appliedAt: Timestamp.fromDate(new Date(base.getTime() + 14 * MS_PER_DAY)) }),
      makeEntry({ clientName: 'Anna K.', appliedAt: Timestamp.fromDate(new Date(base.getTime() + 14 * MS_PER_DAY + 28 * MS_PER_DAY)) }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalBasis).toBe('history');
    expect(plan.intervalDays).toBe(21);
  });

  it('falls back to the default interval for a first-time client', () => {
    const entries = [
      makeEntry({ clientName: 'New Client', steps: [makeColorStep({ grayPercent: 85 })], appliedAt: Timestamp.fromDate(new Date()) }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalBasis).toBe('default');
    expect(plan.intervalDays).toBe(getDefaultRevisitIntervalDays(85));
  });

  it('falls back to the lightest tier for a first-time bleach-only session (no color step)', () => {
    const entries = [
      makeEntry({
        clientName: 'Bleach Only',
        steps: [{
          kind: 'bleach', startLevel: 6, targetLevel: 9, result: {
            startLevel: 6, targetLevel: 9, liftNeeded: 3, developerVolume: 30, multiStepRequired: false,
            mixingRatio: { powderParts: 1, developerParts: 2 }, grams: { powderGrams: 20, developerGrams: 40 },
            recommendedProcessingMinutes: 35, maxScalpProcessingMinutes: 50, checkIntervalMinMinutes: 5, checkIntervalMaxMinutes: 10,
          }, processingMinutes: 35, pricePerGram: 0.1,
        }],
        appliedAt: Timestamp.fromDate(new Date()),
      }),
    ];

    const [plan] = planClientRevisits(entries);
    expect(plan.intervalBasis).toBe('default');
    expect(plan.intervalDays).toBe(getDefaultRevisitIntervalDays(0));
  });

  it('excludes entries with no client name or no appliedAt', () => {
    const entries = [
      makeEntry({ clientName: '', appliedAt: Timestamp.fromDate(new Date()) }),
      makeEntry({ clientName: 'Someone', appliedAt: null }),
    ];

    expect(planClientRevisits(entries)).toEqual([]);
  });

  it('groups entries for the same client regardless of casing/whitespace', () => {
    const base = new Date('2026-01-01T00:00:00Z');
    const entries = [
      makeEntry({ clientName: 'Anna K.', appliedAt: Timestamp.fromDate(base) }),
      makeEntry({ clientName: ' anna k. ', appliedAt: Timestamp.fromDate(new Date(base.getTime() + 20 * MS_PER_DAY)) }),
    ];

    const plans = planClientRevisits(entries);
    expect(plans).toHaveLength(1);
    expect(plans[0].intervalDays).toBe(20);
  });

  it('sorts results ascending by recommended date', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const entries = [
      makeEntry({ clientName: 'Later Client', steps: [makeColorStep({ grayPercent: 10 })], appliedAt: Timestamp.fromDate(now) }), // +42d
      makeEntry({ clientName: 'Sooner Client', steps: [makeColorStep({ grayPercent: 90 })], appliedAt: Timestamp.fromDate(now) }), // +21d
    ];

    const plans = planClientRevisits(entries);
    expect(plans.map(p => p.clientName)).toEqual(['Sooner Client', 'Later Client']);
  });
});

describe('getRevisitStatus', () => {
  const now = new Date('2026-01-15T00:00:00Z');

  it('is overdue when the recommended date has passed or is today', () => {
    expect(getRevisitStatus(now, now)).toBe('overdue');
    expect(getRevisitStatus(new Date(now.getTime() - MS_PER_DAY), now)).toBe('overdue');
  });

  it('is due-soon within the next 7 days', () => {
    expect(getRevisitStatus(new Date(now.getTime() + MS_PER_DAY), now)).toBe('due-soon');
    expect(getRevisitStatus(new Date(now.getTime() + 7 * MS_PER_DAY), now)).toBe('due-soon');
  });

  it('is upcoming beyond 7 days', () => {
    expect(getRevisitStatus(new Date(now.getTime() + 8 * MS_PER_DAY), now)).toBe('upcoming');
  });
});
