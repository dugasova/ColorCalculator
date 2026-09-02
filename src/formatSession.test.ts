import { describe, it, expect } from 'vitest';
import '../src/i18n';
import { formatSessionText, formatSessionSummary } from './formatSession';
import type { ColorHistoryStep, BleachHistoryStep } from './history';

const colorStep: ColorHistoryStep = {
  kind: 'color',
  brandName: 'Generic',
  line: null,
  targetShade: { code: '9.1', level: 9, tone: 'ash' },
  startLevel: 6,
  grayPercent: 0,
  applicationZone: 'full-head',
  result: {
    developerVolume: 30,
    mixingRatio: { colorParts: 1, developerParts: 2 },
    grayCoverage: { naturalRatio: 0, fashionRatio: 1, note: 'apply the fashion tone as-is' },
    underlyingPigment: 'pale-yellow',
    recommendedCorrectiveTone: 'violet',
    correctorGrams: 3,
    recommendedProcessingMinutes: 30,
    toneWarning: null,
    eligibilityWarning: null,
    liftUnsupportedWarning: null,
    grams: { colorGrams: 20, developerGrams: 40 },
  },
  additionalShade: null,
  additionalShadeGrams: null,
  blend: null,
  prePigmentation: null,
  neutralizationApplied: false,
  processingMinutes: 30,
  pricePerGram: 0.18,
};

const bleachStep: BleachHistoryStep = {
  kind: 'bleach',
  startLevel: 6,
  targetLevel: 9,
  result: {
    startLevel: 6, targetLevel: 9, liftNeeded: 3, developerVolume: 30, multiStepRequired: false,
    mixingRatio: { powderParts: 1, developerParts: 2 }, grams: { powderGrams: 20, developerGrams: 40 },
    recommendedProcessingMinutes: 35, maxScalpProcessingMinutes: 50, checkIntervalMinMinutes: 5, checkIntervalMaxMinutes: 10,
  },
  processingMinutes: 35,
  pricePerGram: 0.1,
};

describe('formatSessionText', () => {
  it('renders a single-step session exactly like the plain single-formula text, with no step numbering', () => {
    const text = formatSessionText([colorStep]);
    expect(text).not.toContain('Step 1');
    expect(text).toContain('Generic — 9.1 (ash)');
    expect(text).toContain('Mix: 9.1-20.0 g developer 40.0 g');
  });

  it('numbers each step and appends the combined total processing time for a multi-step session', () => {
    const text = formatSessionText([bleachStep, colorStep]);

    expect(text).toContain('Step 1');
    expect(text).toContain('Step 2');
    expect(text).toContain('Bleach Calculator');
    expect(text).toContain('Generic — 9.1 (ash)');
    // 35 (bleach) + 30 (color) = 65 total minutes.
    expect(text).toContain('Total processing time: 65 min');
  });

  it('orders blocks the same as the input steps array', () => {
    const text = formatSessionText([colorStep, bleachStep]);
    const colorIndex = text.indexOf('Generic — 9.1');
    const bleachIndex = text.indexOf('Bleach Calculator');
    expect(colorIndex).toBeLessThan(bleachIndex);
  });

  it('does not throw for a step saved before the blend field existed (blend is undefined, not null)', () => {
    const legacyStep = { ...colorStep };
    delete (legacyStep as Partial<ColorHistoryStep>).blend;

    expect(() => formatSessionText([legacyStep])).not.toThrow();
    expect(formatSessionText([legacyStep])).toContain('Mix: 9.1-20.0 g developer 40.0 g');
  });

  it('prepends the recorded filler step ahead of the target-color block when prePigmentation is set', () => {
    const stepWithFiller: ColorHistoryStep = {
      ...colorStep,
      startLevel: 9,
      targetShade: { code: '5.4', level: 5, tone: 'copper' },
      prePigmentation: {
        need: 'required-same-session',
        underlyingPigment: 'orange',
        fillerTone: 'copper',
        exampleFillerShade: { code: '5.4', level: 5, tone: 'copper' },
        mixingRatio: { fillerParts: 1, diluentParts: 1 },
        grams: { fillerGrams: 15, diluentGrams: 15 },
        fillerProcessingMinutes: 15,
        multiVisitGapDays: null,
        finalStepMixingRatio: { colorParts: 1, developerParts: 1 },
        finalStepDeveloperVolume: 10,
      },
    };

    const text = formatSessionText([stepWithFiller]);

    expect(text).toContain('Step 1 — Filler');
    expect(text).toContain('Generic 5.4 (Copper)');
    expect(text).toContain('Step 2 — Target color');
    expect(text).toContain('Generic — 5.4 (copper)');
  });

  it('does not throw for a step saved before the prePigmentation field existed (reads back as undefined, not null)', () => {
    const legacyStep = { ...colorStep };
    delete (legacyStep as Partial<ColorHistoryStep>).prePigmentation;

    expect(() => formatSessionText([legacyStep])).not.toThrow();
    expect(formatSessionText([legacyStep])).not.toContain('Step 1 — Filler');
  });
});

describe('formatSessionSummary', () => {
  it('summarizes a single color step as starting level -> brand/line/shade', () => {
    const summary = formatSessionSummary([{ ...colorStep, line: 'koleston-perfect', brandName: 'Wella', startLevel: 10, targetShade: { code: '7/17', level: 7, tone: 'ash', secondaryTone: 'chocolate' } }]);

    expect(summary).toBe('Starting level: 10 → Target: Wella Koleston Perfect — 7/17');
  });

  it('omits the line when the step has none', () => {
    const summary = formatSessionSummary([colorStep]);

    expect(summary).toBe('Starting level: 6 → Target: Generic — 9.1');
  });

  it('falls back to the plain target level for a bleach-only session (no color/toning step)', () => {
    const summary = formatSessionSummary([bleachStep]);

    expect(summary).toBe('Starting level: 6 → Target: 9');
  });

  it('favors the LAST color step\'s shade in a multi-step session, not the first step\'s starting level target', () => {
    const summary = formatSessionSummary([bleachStep, colorStep]);

    // bleachStep starts at 6; colorStep (the final toning step) targets Generic 9.1.
    expect(summary).toBe('Starting level: 6 → Target: Generic — 9.1');
  });
});
