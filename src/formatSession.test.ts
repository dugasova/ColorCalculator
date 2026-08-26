import { describe, it, expect } from 'vitest';
import '../src/i18n';
import { formatSessionText } from './formatSession';
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
});
