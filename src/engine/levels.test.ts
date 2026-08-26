import { describe, it, expect } from 'vitest';
import {
  getUnderlyingPigment,
  maxLiftForDeveloper,
  canReachTarget,
  type Level,
} from './levels';

describe('getUnderlyingPigment', () => {
  it('maps each level to the correct underlying pigment', () => {
    const expected: Record<Level, string> = {
      1: 'red',
      2: 'red',
      3: 'red-orange',
      4: 'red-orange',
      5: 'orange',
      6: 'orange-yellow',
      7: 'yellow-orange',
      8: 'yellow',
      9: 'pale-yellow',
      10: 'pale-yellow',
      11: 'very-light-yellow',
      12: 'very-light-yellow',
    };

    for (const [level, pigment] of Object.entries(expected)) {
      expect(getUnderlyingPigment(Number(level) as Level)).toBe(pigment);
    }
  });
});

describe('maxLiftForDeveloper', () => {
  it('returns the lower bound of the lift range for each volume', () => {
    expect(maxLiftForDeveloper(10)).toBe(0);
    expect(maxLiftForDeveloper(20)).toBe(1);
    expect(maxLiftForDeveloper(30)).toBe(2);
    expect(maxLiftForDeveloper(40)).toBe(3);
  });
});

describe('canReachTarget', () => {
  it('is always true when no lift is required (target <= start)', () => {
    expect(canReachTarget(5, 5, 10)).toBe(true);
    expect(canReachTarget(5, 3, 10)).toBe(true);
    expect(canReachTarget(5, 1, 40)).toBe(true);
  });

  it('is true when the required lift is exactly the developer max', () => {
    expect(canReachTarget(4, 6, 30)).toBe(true); // needs 2, max 2
    expect(canReachTarget(4, 5, 20)).toBe(true); // needs 1, max 1
    expect(canReachTarget(4, 4, 10)).toBe(true); // needs 0, max 0
  });

  it('is false when the required lift exceeds the developer max', () => {
    expect(canReachTarget(3, 8, 10)).toBe(false); // needs 5, max 0
    expect(canReachTarget(4, 7, 30)).toBe(false); // needs 3, max 2
    expect(canReachTarget(1, 5, 20)).toBe(false); // needs 4, max 1
  });

  it('handles the maximum realistic span (level 1 to level 10)', () => {
    expect(canReachTarget(1, 10, 40)).toBe(false); // needs 9, max 3
  });
});
