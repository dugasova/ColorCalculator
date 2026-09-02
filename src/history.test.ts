import { describe, it, expect } from 'vitest';
import {
  normalizeHistoryEntry, buildRepeatFormulaRequest, historyEntryShapeSchema,
  type ColorHistoryStep, type BleachHistoryStep, type FormulaHistoryEntry, type LegacyFormulaHistoryEntry,
} from './history';
import { BRANDS } from './engine/brands';
import { calculatePrePigmentation } from './engine/prePigmentation';

const colorFullFormula: ColorHistoryStep['result'] = {
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
  grams: { colorGrams: 30, developerGrams: 30 },
};

function makeColorStep(overrides: Partial<ColorHistoryStep> = {}): ColorHistoryStep {
  return {
    kind: 'color',
    brandName: 'Generic',
    line: null,
    targetShade: { code: '7.1', level: 7, tone: 'ash' },
    startLevel: 7,
    grayPercent: 0,
    applicationZone: 'full-head',
    result: colorFullFormula,
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

function makeBleachStep(overrides: Partial<BleachHistoryStep> = {}): BleachHistoryStep {
  return {
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

describe('normalizeHistoryEntry', () => {
  it('passes a modern steps-based entry through unchanged', () => {
    const entry = makeEntry({ clientName: 'Anna' });
    expect(normalizeHistoryEntry(entry)).toBe(entry);
  });

  it('upgrades a legacy flat entry into a single-step color session', () => {
    const legacy: LegacyFormulaHistoryEntry = {
      id: 'legacy-1',
      clientName: 'Old Client',
      note: 'note',
      appliedBy: 'stylist',
      appliedAt: null,
      brandName: 'Wella',
      line: 'color-touch',
      targetShade: { code: '8/73', level: 8, tone: 'chocolate', secondaryTone: 'gold', line: 'color-touch' },
      startLevel: 8,
      grayPercent: 20,
      result: colorFullFormula,
      processingMinutes: 30,
      applicationZone: 'full-head',
      pricePerGram: 0.2,
      markupMultiplier: 3,
      productCost: 12,
      servicePrice: 36,
      patchTestDate: '2026-01-01T00:00',
      allergyNotes: 'none',
      patchTestOverride: false,
      beforePhotoUrl: null,
      afterPhotoUrl: null,
    };

    const normalized = normalizeHistoryEntry(legacy);
    expect(normalized.steps).toHaveLength(1);
    expect(normalized.steps[0]).toEqual({
      kind: 'color',
      brandName: 'Wella',
      line: 'color-touch',
      targetShade: legacy.targetShade,
      startLevel: 8,
      grayPercent: 20,
      applicationZone: 'full-head',
      result: colorFullFormula,
      additionalShade: null,
      additionalShadeGrams: null,
      blend: null,
      prePigmentation: null,
      neutralizationApplied: false,
      processingMinutes: 30,
      pricePerGram: 0.2,
    });
    expect(normalized.markupMultiplier).toBe(3);
    expect(normalized.productCost).toBe(12);
    expect(normalized.clientName).toBe('Old Client');
  });

  it('preserves a legacy entry\'s additional shade fields when present', () => {
    const legacy: LegacyFormulaHistoryEntry = {
      id: 'legacy-2',
      clientName: 'Old Client 2',
      note: '',
      appliedBy: 'stylist',
      appliedAt: null,
      brandName: 'Generic',
      line: null,
      targetShade: { code: '7.1', level: 7, tone: 'ash' },
      startLevel: 7,
      grayPercent: 0,
      result: colorFullFormula,
      additionalShade: { code: '7.3', level: 7, tone: 'gold' },
      additionalShadeGrams: 5,
      processingMinutes: 30,
      applicationZone: 'full-head',
      pricePerGram: 0.18,
      markupMultiplier: 4,
      productCost: null,
      servicePrice: null,
      patchTestDate: '',
      allergyNotes: '',
      patchTestOverride: true,
      beforePhotoUrl: null,
      afterPhotoUrl: null,
    };

    const normalized = normalizeHistoryEntry(legacy);
    const step = normalized.steps[0] as ColorHistoryStep;
    expect(step.additionalShade).toEqual({ code: '7.3', level: 7, tone: 'gold' });
    expect(step.additionalShadeGrams).toBe(5);
  });
});

describe('buildRepeatFormulaRequest', () => {
  it('reconstructs calculator state for a single-color-step entry', () => {
    const entry = makeEntry({ clientName: 'Anna', steps: [makeColorStep()] });
    const request = buildRepeatFormulaRequest(entry, BRANDS);

    expect(request).not.toBeNull();
    expect(request!.brandId).toBe('generic');
    expect(request!.targetShadeCode).toBe('7.1');
    expect(request!.startLevel).toBe(7);
    expect(request!.totalGrams).toBe(60); // 30g color + 30g developer
    expect(request!.additionalShadeCode).toBeNull();
  });

  it('backs the additional shade grams out of totalGrams so a repeat doesn\'t double-blend it', () => {
    // Blended mix already includes +10g of the additional shade: 40g color : 40g developer.
    const step = makeColorStep({
      result: { ...colorFullFormula, grams: { colorGrams: 40, developerGrams: 40 } },
      additionalShade: { code: '7.3', level: 7, tone: 'gold' },
      additionalShadeGrams: 10,
    });
    const entry = makeEntry({ clientName: 'Anna', steps: [step] });
    const request = buildRepeatFormulaRequest(entry, BRANDS);

    expect(request).not.toBeNull();
    // Primary color share is 40-10=30g; at 1:1 that's 30g developer -> 60g original total.
    expect(request!.totalGrams).toBe(60);
    expect(request!.additionalShadeCode).toBe('7.3');
    expect(request!.additionalShadeGrams).toBe(10);
  });

  it('does not back grams out of totalGrams for a substitute blend, since the total was never grown', () => {
    // A substitute blend splits a single 60g total (30g color : 30g developer) between
    // its two components rather than adding a shade's grams on top of the primary mix.
    const step = makeColorStep({
      result: { ...colorFullFormula, grams: { colorGrams: 30, developerGrams: 30 } },
      blend: {
        shadeA: { code: '7.1', level: 7, tone: 'ash' },
        shadeAGrams: 21,
        shadeB: { code: '7.3', level: 7, tone: 'gold' },
        shadeBGrams: 9,
      },
    });
    const entry = makeEntry({ clientName: 'Anna', steps: [step] });
    const request = buildRepeatFormulaRequest(entry, BRANDS);

    expect(request).not.toBeNull();
    expect(request!.totalGrams).toBe(60);
    expect(request!.blendShadeACode).toBe('7.1');
    expect(request!.blendShadeBCode).toBe('7.3');
    expect(request!.blendPrimaryPercent).toBe(70);
    expect(request!.additionalShadeCode).toBeNull();
    expect(request!.additionalShadeGrams).toBe(0);
  });

  it('marks prePigmentationEnabled true only when a filler step was actually recorded', () => {
    const withoutFiller = makeEntry({ clientName: 'Anna', steps: [makeColorStep()] });
    expect(buildRepeatFormulaRequest(withoutFiller, BRANDS)!.prePigmentationEnabled).toBe(false);

    const step = makeColorStep({ prePigmentation: calculatePrePigmentation(9, 7, 60) });
    const withFiller = makeEntry({ clientName: 'Anna', steps: [step] });
    expect(buildRepeatFormulaRequest(withFiller, BRANDS)!.prePigmentationEnabled).toBe(true);
  });

  it('does not throw for a history doc saved before the prePigmentation field existed (reads back as undefined, not null)', () => {
    const step = makeColorStep();
    delete (step as Partial<ColorHistoryStep>).prePigmentation;
    const entry = makeEntry({ clientName: 'Anna', steps: [step] });

    expect(() => buildRepeatFormulaRequest(entry, BRANDS)).not.toThrow();
    expect(buildRepeatFormulaRequest(entry, BRANDS)!.prePigmentationEnabled).toBe(false);
  });

  it('does not throw for a history doc saved before the blend field existed (blend is undefined, not null)', () => {
    // Firestore docs written before this feature simply lack the `blend` key -- it reads
    // back as `undefined` at runtime despite the ColorHistoryStep type saying it's always
    // present. `blend !== null` is true for `undefined`, so this must be normalized away
    // rather than crash dereferencing an undefined blend (see history.ts).
    const step = makeColorStep();
    delete (step as Partial<ColorHistoryStep>).blend;
    const entry = makeEntry({ clientName: 'Anna', steps: [step] });

    expect(() => buildRepeatFormulaRequest(entry, BRANDS)).not.toThrow();
    const request = buildRepeatFormulaRequest(entry, BRANDS);
    expect(request!.blendShadeACode).toBeNull();
    expect(request!.blendShadeBCode).toBeNull();
  });

  it('returns null for a multi-step complex-coloring session', () => {
    const entry = makeEntry({ clientName: 'Anna', steps: [makeBleachStep(), makeColorStep()] });
    expect(buildRepeatFormulaRequest(entry, BRANDS)).toBeNull();
  });

  it('returns null for a single bleach-only step (no color formula to repeat into)', () => {
    const entry = makeEntry({ clientName: 'Anna', steps: [makeBleachStep()] });
    expect(buildRepeatFormulaRequest(entry, BRANDS)).toBeNull();
  });

  it('returns null when the saved brand no longer exists', () => {
    const entry = makeEntry({ clientName: 'Anna', steps: [makeColorStep({ brandName: 'Deleted Brand' })] });
    expect(buildRepeatFormulaRequest(entry, BRANDS)).toBeNull();
  });
});

// Firestore documents are untrusted input -- see fetchFormulaHistory, which safeParses
// against this before calling normalizeHistoryEntry, and skips (logging) any document
// that fails.
describe('historyEntryShapeSchema', () => {
  it('accepts a well-formed modern steps-based entry', () => {
    const entry = makeEntry({ clientName: 'Anna' });
    expect(historyEntryShapeSchema.safeParse(entry).success).toBe(true);
  });

  it('accepts a well-formed legacy flat entry', () => {
    const legacy: LegacyFormulaHistoryEntry = {
      id: 'legacy-1',
      clientName: 'Old Client',
      note: 'note',
      appliedBy: 'stylist',
      appliedAt: null,
      brandName: 'Wella',
      line: 'color-touch',
      targetShade: { code: '8/73', level: 8, tone: 'chocolate', secondaryTone: 'gold', line: 'color-touch' },
      startLevel: 8,
      grayPercent: 20,
      result: colorFullFormula,
      processingMinutes: 30,
      applicationZone: 'full-head',
      pricePerGram: 0.2,
      markupMultiplier: 3,
      productCost: 12,
      servicePrice: 36,
      patchTestDate: '2026-01-01T00:00',
      allergyNotes: 'none',
      patchTestOverride: false,
      beforePhotoUrl: null,
      afterPhotoUrl: null,
    };
    expect(historyEntryShapeSchema.safeParse(legacy).success).toBe(true);
  });

  it('rejects a document missing a required top-level field', () => {
    const entry = makeEntry({ clientName: 'Anna' }) as unknown as Record<string, unknown>;
    delete entry.clientName;
    expect(historyEntryShapeSchema.safeParse(entry).success).toBe(false);
  });

  it('rejects a document whose step is missing the `kind` discriminant HistoryView switches on', () => {
    const entry = makeEntry({ clientName: 'Anna' });
    const brokenStep = { ...entry.steps[0] } as Record<string, unknown>;
    delete brokenStep.kind;
    expect(historyEntryShapeSchema.safeParse({ ...entry, steps: [brokenStep] }).success).toBe(false);
  });

  it('rejects a document whose scalar field has the wrong type', () => {
    const entry = makeEntry({ clientName: 'Anna' });
    expect(historyEntryShapeSchema.safeParse({ ...entry, patchTestOverride: 'yes' }).success).toBe(false);
  });
});
