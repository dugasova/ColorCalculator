import { describe, it, expect } from 'vitest';
import { getNeutralizingCorrector, suggestNeutralizingTone } from './neutralize';
import type { UnderlyingPigment } from './levels';

describe('getNeutralizingCorrector', () => {
  it('maps each underlying pigment to its complementary corrector', () => {
    const expected: Record<UnderlyingPigment, string> = {
      red: 'matt',
      'red-orange': 'matt',
      orange: 'blue',
      'orange-yellow': 'blue-violet',
      'yellow-orange': 'blue-violet',
      yellow: 'violet',
      'pale-yellow': 'violet',
      'very-light-yellow': 'violet',
    };

    for (const [pigment, corrector] of Object.entries(expected)) {
      expect(getNeutralizingCorrector(pigment as UnderlyingPigment)).toBe(corrector);
    }
  });
});

describe('suggestNeutralizingTone', () => {
  it('maps blue-based correctors to the ash retail tone', () => {
    expect(suggestNeutralizingTone('orange')).toBe('ash');
    expect(suggestNeutralizingTone('orange-yellow')).toBe('ash');
  });

  it('maps violet-based correctors to the violet retail tone', () => {
    expect(suggestNeutralizingTone('yellow-orange')).toBe('violet');
    expect(suggestNeutralizingTone('yellow')).toBe('violet');
    expect(suggestNeutralizingTone('pale-yellow')).toBe('violet');
    expect(suggestNeutralizingTone('very-light-yellow')).toBe('violet');
  });

  it('maps matt-based correctors to the matt retail tone', () => {
    expect(suggestNeutralizingTone('red')).toBe('matt');
    expect(suggestNeutralizingTone('red-orange')).toBe('matt');
  });
});
