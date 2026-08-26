import { describe, it, expect } from 'vitest';
import { getGrayCoverageStrategy, getMixingRatio, calculateFormulaGrams, applyAdditionalShade, getRecommendedProcessingMinutes } from './formula';
import type { Shade } from './shades';

describe('getGrayCoverageStrategy', () => {
  it('returns pure fashion tone below 30% gray', () => {
    expect(getGrayCoverageStrategy(0)).toEqual({ naturalRatio: 0, fashionRatio: 1, note: 'apply the fashion tone as-is' });
    expect(getGrayCoverageStrategy(29)).toEqual({ naturalRatio: 0, fashionRatio: 1, note: 'apply the fashion tone as-is' });
  });

  it('returns a 50/50 split in the [30, 50) range', () => {
    expect(getGrayCoverageStrategy(30)).toEqual({ naturalRatio: 0.5, fashionRatio: 0.5, note: 'equal parts base and fashion tone' });
    expect(getGrayCoverageStrategy(49)).toEqual({ naturalRatio: 0.5, fashionRatio: 0.5, note: 'equal parts base and fashion tone' });
  });

  it('favors natural base in the [50, 80) range', () => {
    expect(getGrayCoverageStrategy(50)).toEqual({ naturalRatio: 0.67, fashionRatio: 0.33, note: 'base-dominant mix' });
    expect(getGrayCoverageStrategy(79)).toEqual({ naturalRatio: 0.67, fashionRatio: 0.33, note: 'base-dominant mix' });
  });

  it('returns pure natural base at 80% and above, including 100%', () => {
    expect(getGrayCoverageStrategy(80)).toEqual({
      naturalRatio: 1,
      fashionRatio: 0,
      note: 'resistant gray — use the natural series, consider pre-pigmentation',
    });
    expect(getGrayCoverageStrategy(100)).toEqual({
      naturalRatio: 1,
      fashionRatio: 0,
      note: 'resistant gray — use the natural series, consider pre-pigmentation',
    });
  });

  it('always sums natural and fashion ratios to 1', () => {
    for (const gray of [0, 15, 30, 40, 50, 65, 80, 95, 100]) {
      const { naturalRatio, fashionRatio } = getGrayCoverageStrategy(gray);
      expect(naturalRatio + fashionRatio).toBeCloseTo(1);
    }
  });
});

describe('getMixingRatio', () => {
  it('uses 1:1 when no lift is needed (target <= start)', () => {
    expect(getMixingRatio(6, 6)).toEqual({ colorParts: 1, developerParts: 1 });
    expect(getMixingRatio(6, 4)).toEqual({ colorParts: 1, developerParts: 1 });
  });

  it('uses 1:1.5 for a moderate lift of 1-2 levels', () => {
    expect(getMixingRatio(6, 7)).toEqual({ colorParts: 1, developerParts: 1.5 });
    expect(getMixingRatio(6, 8)).toEqual({ colorParts: 1, developerParts: 1.5 });
  });

  it('uses 1:2 for a high lift of 3+ levels', () => {
    expect(getMixingRatio(4, 7)).toEqual({ colorParts: 1, developerParts: 2 });
    expect(getMixingRatio(1, 10)).toEqual({ colorParts: 1, developerParts: 2 });
  });
});

describe('calculateFormulaGrams', () => {
  it('splits total grams proportionally for a 1:1 ratio', () => {
    expect(calculateFormulaGrams(60, { colorParts: 1, developerParts: 1 })).toEqual({
      colorGrams: 30,
      developerGrams: 30,
    });
  });

  it('splits total grams proportionally for a 1:1.5 ratio', () => {
    expect(calculateFormulaGrams(60, { colorParts: 1, developerParts: 1.5 })).toEqual({
      colorGrams: 24,
      developerGrams: 36,
    });
  });

  it('splits total grams proportionally for a 1:2 ratio', () => {
    expect(calculateFormulaGrams(60, { colorParts: 1, developerParts: 2 })).toEqual({
      colorGrams: 20,
      developerGrams: 40,
    });
  });

  it('always accounts for the full total', () => {
    const { colorGrams, developerGrams } = calculateFormulaGrams(90, { colorParts: 1, developerParts: 1.5 });
    expect(colorGrams + developerGrams).toBeCloseTo(90);
  });
});

describe('applyAdditionalShade', () => {
  it('adds the additional grams to the color total and recalculates developer for the same ratio', () => {
    // Primary mix was 30g color : 30g developer (1:1). Adding 10g of another shade should
    // grow color to 40g and developer to 40g, keeping the 1:1 ratio.
    expect(applyAdditionalShade({ colorGrams: 30, developerGrams: 30 }, { colorParts: 1, developerParts: 1 }, 10)).toEqual({
      colorGrams: 40,
      developerGrams: 40,
    });
  });

  it('scales developer by the mixing ratio, not 1:1, for a lifting ratio', () => {
    // 1:1.5 ratio: adding 10g color requires 15g more developer to stay proportional.
    expect(applyAdditionalShade({ colorGrams: 24, developerGrams: 36 }, { colorParts: 1, developerParts: 1.5 }, 10)).toEqual({
      colorGrams: 34,
      developerGrams: 51,
    });
  });

  it('is a no-op when no additional grams are added', () => {
    expect(applyAdditionalShade({ colorGrams: 30, developerGrams: 30 }, { colorParts: 1, developerParts: 1 }, 0)).toEqual({
      colorGrams: 30,
      developerGrams: 30,
    });
  });
});

describe('getRecommendedProcessingMinutes', () => {
  const permanentShade: Shade = { code: '7.1', level: 7, tone: 'ash' };
  const colorTouchShade: Shade = { code: '8/73', level: 8, tone: 'chocolate', developerVolumeChoices: [6, 13] };

  it('recommends 20 minutes for deposit-only lines with developerVolumeChoices, regardless of gray percent', () => {
    expect(getRecommendedProcessingMinutes(colorTouchShade, 0)).toBe(20);
    expect(getRecommendedProcessingMinutes(colorTouchShade, 90)).toBe(20);
  });

  it('recommends 30 minutes for permanent color below 50% gray', () => {
    expect(getRecommendedProcessingMinutes(permanentShade, 0)).toBe(30);
    expect(getRecommendedProcessingMinutes(permanentShade, 49)).toBe(30);
  });

  it('recommends 45 minutes for permanent color at 50% gray or above', () => {
    expect(getRecommendedProcessingMinutes(permanentShade, 50)).toBe(45);
    expect(getRecommendedProcessingMinutes(permanentShade, 100)).toBe(45);
  });
});
