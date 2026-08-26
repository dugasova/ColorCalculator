import { describe, it, expect } from 'vitest';
import {
  getComplementaryCorrector,
  getCorrectionDeveloper,
  getCorrectionTechnique,
  calculateColorCorrection,
  calculateCorrectorGrams,
} from './correction';

describe('getComplementaryCorrector', () => {
  it('maps each unwanted tone to its opposite on the color star', () => {
    expect(getComplementaryCorrector('red')).toEqual({ color: 'green', qualifier: 'ash-matte', reflections: ['.13', '.31'] });
    expect(getComplementaryCorrector('orange')).toEqual({ color: 'blue', qualifier: 'ash', reflections: ['.1', '.01'] });
    expect(getComplementaryCorrector('yellow')).toEqual({ color: 'violet', qualifier: 'iridescent', reflections: ['.2'] });
    expect(getComplementaryCorrector('green')).toEqual({ color: 'red', qualifier: 'copper', reflections: ['.4'] });
    expect(getComplementaryCorrector('blue')).toEqual({ color: 'orange', qualifier: 'copper-gold', reflections: ['.43', '.34'] });
    expect(getComplementaryCorrector('violet')).toEqual({ color: 'yellow', qualifier: 'gold', reflections: ['.3'] });
  });
});

describe('getCorrectionDeveloper', () => {
  it('uses 10vol (3%) for same level or darkening', () => {
    expect(getCorrectionDeveloper(7, 7)).toEqual({ volume: 10, percent: 3 });
    expect(getCorrectionDeveloper(7, 6)).toEqual({ volume: 10, percent: 3 });
  });

  it('uses 20vol (6%) for a moderate 1-2 level lift', () => {
    expect(getCorrectionDeveloper(6, 7)).toEqual({ volume: 20, percent: 6 });
    expect(getCorrectionDeveloper(6, 8)).toEqual({ volume: 20, percent: 6 });
  });

  it('uses 30vol (9%) for a 3-level lift', () => {
    expect(getCorrectionDeveloper(5, 8)).toEqual({ volume: 30, percent: 9 });
  });

  it('uses 40vol (12%) for a 4+ level lift, capped at 40', () => {
    expect(getCorrectionDeveloper(4, 8)).toEqual({ volume: 40, percent: 12 });
    expect(getCorrectionDeveloper(2, 9)).toEqual({ volume: 40, percent: 12 });
  });
});

describe('getCorrectionTechnique', () => {
  it('recommends direct deposit when no lift is needed', () => {
    expect(getCorrectionTechnique(7, 7)).toBe('deposit');
    expect(getCorrectionTechnique(7, 6)).toBe('deposit');
  });

  it('recommends lift + tone for a moderate 1-2 level lift', () => {
    expect(getCorrectionTechnique(6, 7)).toBe('lift-tone');
    expect(getCorrectionTechnique(6, 8)).toBe('lift-tone');
  });

  it('recommends multi-step correction for a 3+ level lift', () => {
    expect(getCorrectionTechnique(5, 8)).toBe('multi-step');
    expect(getCorrectionTechnique(2, 9)).toBe('multi-step');
  });
});

describe('calculateColorCorrection', () => {
  it('combines corrector, developer, and technique for a given scenario', () => {
    const result = calculateColorCorrection(6, 8, 'orange');
    expect(result).toEqual({
      unwantedTone: 'orange',
      corrector: { color: 'blue', qualifier: 'ash', reflections: ['.1', '.01'] },
      developer: { volume: 20, percent: 6 },
      technique: 'lift-tone',
    });
  });
});

describe('calculateCorrectorGrams', () => {
  it('subtracts the coloring level from 10 to get grams per 30g of base color', () => {
    expect(calculateCorrectorGrams(7, 30)).toBe(3);
    expect(calculateCorrectorGrams(3, 30)).toBe(7);
  });

  it('scales proportionally with the amount of base color', () => {
    expect(calculateCorrectorGrams(7, 60)).toBe(6);
    expect(calculateCorrectorGrams(1, 15)).toBe(4.5);
  });

  it('is zero at level 10 and never negative', () => {
    expect(calculateCorrectorGrams(10, 30)).toBe(0);
  });
});
