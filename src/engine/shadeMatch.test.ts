import { describe, it, expect } from 'vitest';
import { findClosestShadeByBrand, describeShadeMatchQuality, getLinePermanence } from './shadeMatch';
import { getMixingRatio } from './formula';
import type { Brand } from './brands';

// A permanent-line target (Koleston Perfect) -- most fixtures below mirror the real
// permanent/semi-permanent line split findClosestShadeByBrand must respect.
const target = { code: '6.1', level: 6, tone: 'ash', line: 'koleston-perfect' } as const;

const brands: Record<string, Brand> = {
  current: {
    id: 'current',
    name: 'Current Brand',
    shades: [target],
    mixingRatio: getMixingRatio,
    pricePerGram: 0.1,
  },
  closeMatch: {
    id: 'closeMatch',
    name: 'Close Match Brand',
    shades: [
      { code: 'C1', level: 6, tone: 'ash', line: 'majirel' }, // permanent, near-identical to target
      { code: 'C2', level: 10, tone: 'gold', line: 'majirel' }, // permanent, far from target
    ],
    mixingRatio: getMixingRatio,
    pricePerGram: 0.15,
  },
  farOnly: {
    id: 'farOnly',
    name: 'Far Only Brand',
    shades: [
      { code: 'F1', level: 10, tone: 'gold', line: 'inoa' },
      { code: 'F2', level: 12, tone: 'pearl', line: 'inoa' },
    ],
    mixingRatio: getMixingRatio,
    pricePerGram: 0.2,
  },
  wrongChemistry: {
    id: 'wrongChemistry',
    name: 'Wrong Chemistry Brand',
    shades: [
      // Identical color to `target`, but a semi-permanent line -- must never be offered
      // as a substitute for a permanent formula.
      { code: 'W1', level: 6, tone: 'ash', line: 'dia-light' },
    ],
    mixingRatio: getMixingRatio,
    pricePerGram: 0.12,
  },
  empty: {
    id: 'empty',
    name: 'Empty Custom Brand',
    shades: [],
    mixingRatio: getMixingRatio,
    pricePerGram: 0.1,
  },
};

describe('getLinePermanence', () => {
  it("classifies Wella Koleston Perfect and L'Oréal Inoa/Majirel as permanent", () => {
    expect(getLinePermanence('koleston-perfect')).toBe('permanent');
    expect(getLinePermanence('inoa')).toBe('permanent');
    expect(getLinePermanence('majirel')).toBe('permanent');
  });

  it("classifies Wella Color Touch and L'Oréal Dia Light/Dia Richesse as semi-permanent", () => {
    expect(getLinePermanence('color-touch')).toBe('semi-permanent');
    expect(getLinePermanence('dia-light')).toBe('semi-permanent');
    expect(getLinePermanence('dia-richesse')).toBe('semi-permanent');
  });

  it('returns null for a missing or unrecognized line', () => {
    expect(getLinePermanence(undefined)).toBeNull();
    expect(getLinePermanence('some-custom-line')).toBeNull();
  });
});

describe('findClosestShadeByBrand', () => {
  it('excludes the current brand from the results', () => {
    const matches = findClosestShadeByBrand(target, brands, 'current');
    expect(matches.some(m => m.brandId === 'current')).toBe(false);
  });

  it('skips brands with no shades', () => {
    const matches = findClosestShadeByBrand(target, brands, 'current');
    expect(matches.some(m => m.brandId === 'empty')).toBe(false);
  });

  it('excludes a shade from a different permanence category even when it is a perfect color match', () => {
    const matches = findClosestShadeByBrand(target, brands, 'current');
    expect(matches.some(m => m.brandId === 'wrongChemistry')).toBe(false);
  });

  it('picks the perceptually closest same-category shade within each brand, not just the first one', () => {
    const matches = findClosestShadeByBrand(target, brands, 'current');
    const closeMatchResult = matches.find(m => m.brandId === 'closeMatch');
    expect(closeMatchResult?.shade.code).toBe('C1');
  });

  it('sorts brands so the single best overall match comes first', () => {
    const matches = findClosestShadeByBrand(target, brands, 'current');
    expect(matches[0].brandId).toBe('closeMatch');
    expect(matches.every((m, i) => i === 0 || matches[i - 1].distance <= m.distance)).toBe(true);
  });

  it('returns one entry per remaining brand that has a same-category candidate', () => {
    const matches = findClosestShadeByBrand(target, brands, 'current');
    expect(matches.map(m => m.brandId).sort()).toEqual(['closeMatch', 'farOnly']);
  });

  it('returns no matches when the target has no recognized permanence category (e.g. the brand-agnostic generic chart)', () => {
    const genericTarget = { code: '6.1', level: 6, tone: 'ash' } as const;
    expect(findClosestShadeByBrand(genericTarget, brands, 'current')).toEqual([]);
  });

  it('matches the semi-permanent line a permanent target excluded, once the target itself is semi-permanent', () => {
    const semiPermTarget = { code: '6/1', level: 6, tone: 'ash', line: 'color-touch' } as const;
    const matches = findClosestShadeByBrand(semiPermTarget, brands, 'current');
    expect(matches.map(m => m.brandId)).toEqual(['wrongChemistry']);
  });
});

describe('describeShadeMatchQuality', () => {
  it('labels a near-imperceptible difference as excellent', () => {
    expect(describeShadeMatchQuality(0)).toBe('excellent');
    expect(describeShadeMatchQuality(2)).toBe('excellent');
  });

  it('labels a moderate difference as good', () => {
    expect(describeShadeMatchQuality(2.01)).toBe('good');
    expect(describeShadeMatchQuality(5)).toBe('good');
  });

  it('labels a noticeable difference as fair', () => {
    expect(describeShadeMatchQuality(5.01)).toBe('fair');
    expect(describeShadeMatchQuality(10)).toBe('fair');
  });

  it('labels a large difference as poor', () => {
    expect(describeShadeMatchQuality(10.01)).toBe('poor');
    expect(describeShadeMatchQuality(50)).toBe('poor');
  });
});
