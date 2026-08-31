import { describe, it, expect } from 'vitest';
import { formatFormulaText } from './formatFormula';
import { calculateFullFormula, applyAdditionalShade } from './formula';
import type { Shade } from './shades';

describe('formatFormulaText', () => {
  it('formats a straightforward achievable formula (no lift, so no pigment warning)', () => {
    const targetShade: Shade = { code: '8.1', level: 8, tone: 'ash' };
    const result = calculateFullFormula(8, targetShade, 0, 60);

    const text = formatFormulaText({
      brandName: 'Generic',
      line: null,
      targetShade,
      startLevel: 8,
      result,
      processingMinutes: result.recommendedProcessingMinutes,
      applicationZone: 'full-head',
      additionalShade: null,
      additionalShadeGrams: 0,
      blend: null,
      neutralizationApplied: false,
    });

    expect(text).toBe(
      'Generic — 8.1 (ash)\n' +
      'Starting level: 8 → Target: 8\n' +
      'Application: Full head\n' +
      'Developer: 10 vol\n' +
      'Ratio: 1:1\n' +
      'Mix: 8.1-30.0 g developer 30.0 g\n' +
      'Processing time: 30 min\n' +
      'Gray coverage: apply the fashion tone as-is (0% base / 100% tone)\n' +
      'Recommended corrective tone: none'
    );
  });

  it('includes the Rule of 10 microtone length with the recommended corrective tone when lifting', () => {
    // level 8 -> underlying pigment 'yellow' -> recommended corrective tone 'violet'; Rule of 10: (10-8) * (60/30) = 4cm
    const targetShade: Shade = { code: '8.2', level: 8, tone: 'violet' };
    const result = calculateFullFormula(6, targetShade, 10, 60);

    const text = formatFormulaText({
      brandName: 'Generic',
      line: null,
      targetShade,
      startLevel: 6,
      result,
      processingMinutes: result.recommendedProcessingMinutes,
      applicationZone: 'full-head',
      additionalShade: null,
      additionalShadeGrams: 0,
      blend: null,
      neutralizationApplied: false,
    });

    expect(text).toContain('Recommended corrective tone: 4 g violet');
  });

  it('replaces the recommended-tone line and suppresses the tone warning when neutralization is applied', () => {
    // level 8 -> pigment 'yellow' -> recommended 'violet', but chosen tone is 'gold' -> mismatch
    const targetShade: Shade = { code: '8.3', level: 8, tone: 'gold' };
    const result = calculateFullFormula(6, targetShade, 10, 60);
    expect(result.toneWarning).not.toBeNull();

    const text = formatFormulaText({
      brandName: 'Generic',
      line: null,
      targetShade,
      startLevel: 6,
      result,
      processingMinutes: result.recommendedProcessingMinutes,
      applicationZone: 'full-head',
      additionalShade: null,
      additionalShadeGrams: 0,
      blend: null,
      neutralizationApplied: true,
    });

    expect(text).toContain('Neutralization: 4 g violet corrector');
    expect(text).not.toContain('Recommended corrective tone:');
    expect(text).not.toContain('Warning:');
  });

  it('includes the line label and secondaryTone in the title when present', () => {
    const targetShade: Shade = { code: '8/73', level: 8, tone: 'chocolate', secondaryTone: 'gold', line: 'color-touch' };
    const result = calculateFullFormula(8, targetShade, 0, 60);

    const text = formatFormulaText({
      brandName: 'Wella',
      line: 'color-touch',
      targetShade,
      startLevel: 8,
      result,
      processingMinutes: result.recommendedProcessingMinutes,
      applicationZone: 'full-head',
      additionalShade: null,
      additionalShadeGrams: 0,
      blend: null,
      neutralizationApplied: false,
    });

    expect(text.split('\n')[0]).toBe('Wella Color Touch — 8/73 (chocolate/gold)');
  });

  it('replaces the Mix line with liftUnsupportedWarning when lift is impossible for a manual-choice shade', () => {
    const targetShade: Shade = {
      code: '8/73',
      level: 8,
      tone: 'chocolate',
      secondaryTone: 'gold',
      developerVolumeChoices: [6, 13],
    };
    const result = calculateFullFormula(6, targetShade, 0, 60, undefined, 6);

    const text = formatFormulaText({
      brandName: 'Wella',
      line: 'color-touch',
      targetShade,
      startLevel: 6,
      result,
      processingMinutes: result.recommendedProcessingMinutes,
      applicationZone: 'full-head',
      additionalShade: null,
      additionalShadeGrams: 0,
      blend: null,
      neutralizationApplied: false,
    });

    expect(text).toContain("Mix: '8/73' can't lift level");
    expect(text).not.toContain('g color');
  });

  it('falls back to the generic not-achievable message when grams is null without a liftUnsupportedWarning', () => {
    const targetShade: Shade = { code: '10.0', level: 10, tone: 'natural' };
    const result = calculateFullFormula(1, targetShade, 90, 60);

    const text = formatFormulaText({
      brandName: 'Generic',
      line: null,
      targetShade,
      startLevel: 1,
      result,
      processingMinutes: result.recommendedProcessingMinutes,
      applicationZone: 'full-head',
      additionalShade: null,
      additionalShadeGrams: 0,
      blend: null,
      neutralizationApplied: false,
    });

    expect(text).toContain('Mix: Not achievable in a single process — multi-step lightening required');
  });

  it('appends toneWarning and eligibilityWarning as separate Warning lines when present', () => {
    // level 8 -> pigment 'yellow' -> recommended 'violet', but chosen tone is 'gold'
    const targetShade: Shade = { code: '8.3', level: 8, tone: 'gold', minStartLevel: 6 };
    const result = calculateFullFormula(5, targetShade, 0, 60);

    const text = formatFormulaText({
      brandName: 'Generic',
      line: null,
      targetShade,
      startLevel: 5,
      result,
      processingMinutes: result.recommendedProcessingMinutes,
      applicationZone: 'full-head',
      additionalShade: null,
      additionalShadeGrams: 0,
      blend: null,
      neutralizationApplied: false,
    });

    const warningLines = text.split('\n').filter(l => l.startsWith('Warning: '));
    expect(warningLines).toHaveLength(2);
    expect(warningLines[0]).toContain('violet');
    expect(warningLines[1]).toContain('requires a starting level of 6');
  });

  it('includes the additional shade in the Mix line, with developer recalculated for the blended total', () => {
    const targetShade: Shade = { code: '8.1', level: 8, tone: 'ash' };
    const additionalShade: Shade = { code: '8.3', level: 8, tone: 'gold' };
    const baseResult = calculateFullFormula(8, targetShade, 0, 60);
    const grams = baseResult.grams !== null
      ? applyAdditionalShade(baseResult.grams, baseResult.mixingRatio, 5)
      : null;
    const result = { ...baseResult, grams };

    const text = formatFormulaText({
      brandName: 'Generic',
      line: null,
      targetShade,
      startLevel: 8,
      result,
      processingMinutes: result.recommendedProcessingMinutes,
      applicationZone: 'full-head',
      additionalShade,
      additionalShadeGrams: 5,
      blend: null,
      neutralizationApplied: false,
    });

    // Primary shade keeps its original 30g share; the additional 5g is broken out
    // separately; developer grows from 30g to 35g to match the new 35g color total.
    expect(text).toContain('Mix: 8.1-30.0 g 8.3-5.0 g developer 35.0 g');
  });

  it('omits the second shade from the Mix line when no grams were entered for it', () => {
    const targetShade: Shade = { code: '8.1', level: 8, tone: 'ash' };
    const result = calculateFullFormula(8, targetShade, 0, 60);

    const text = formatFormulaText({
      brandName: 'Generic',
      line: null,
      targetShade,
      startLevel: 8,
      result,
      processingMinutes: result.recommendedProcessingMinutes,
      applicationZone: 'full-head',
      additionalShade: { code: '8.3', level: 8, tone: 'gold' },
      additionalShadeGrams: 0,
      blend: null,
      neutralizationApplied: false,
    });

    expect(text).toContain('Mix: 8.1-30.0 g developer 30.0 g');
    expect(text).not.toContain('8.3');
  });
});
