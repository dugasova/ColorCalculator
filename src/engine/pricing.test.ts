import { describe, it, expect } from 'vitest';
import { calculateProductCost, calculateRecommendedServicePrice, DEFAULT_MARKUP_MULTIPLIER } from './pricing';

describe('calculateProductCost', () => {
  it('multiplies grams by price per gram', () => {
    expect(calculateProductCost(60, 0.18)).toBeCloseTo(10.8);
  });

  it('rounds to the nearest cent', () => {
    expect(calculateProductCost(30, 0.1)).toBe(3);
    expect(calculateProductCost(33, 0.1)).toBe(3.3);
  });

  it('returns 0 for 0 grams or 0 price', () => {
    expect(calculateProductCost(0, 0.5)).toBe(0);
    expect(calculateProductCost(60, 0)).toBe(0);
  });
});

describe('calculateRecommendedServicePrice', () => {
  it('applies the markup multiplier to the product cost', () => {
    expect(calculateRecommendedServicePrice(10, 4)).toBe(40);
  });

  it('rounds to the nearest cent', () => {
    expect(calculateRecommendedServicePrice(3.33, 3)).toBe(9.99);
  });

  it('defaults to a 4x markup constant matching the calculator default', () => {
    expect(DEFAULT_MARKUP_MULTIPLIER).toBe(4);
    expect(calculateRecommendedServicePrice(10, DEFAULT_MARKUP_MULTIPLIER)).toBe(40);
  });
});
