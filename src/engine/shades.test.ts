import { describe, it, expect } from 'vitest';
import { canBlendShades, suggestBlendComponents } from './shades';
import type { Shade } from './shades';

describe('canBlendShades', () => {
  it('accepts two shades on the same level and line with no mixing overrides', () => {
    const a: Shade = { code: '7/1', level: 7, tone: 'ash', line: 'koleston-perfect' };
    const b: Shade = { code: '7/3', level: 7, tone: 'gold', line: 'koleston-perfect' };
    expect(canBlendShades(a, b)).toBe(true);
  });

  it('rejects shades on different levels -- the developer math was calculated for one level', () => {
    const a: Shade = { code: '7/1', level: 7, tone: 'ash' };
    const b: Shade = { code: '9/1', level: 9, tone: 'ash' };
    expect(canBlendShades(a, b)).toBe(false);
  });

  it('rejects shades from different lines even at the same level and code', () => {
    const a: Shade = { code: '7.1', level: 7, tone: 'ash', line: 'majirel' };
    const b: Shade = { code: '7.1', level: 7, tone: 'ash', line: 'inoa' };
    expect(canBlendShades(a, b)).toBe(false);
  });

  it('rejects shades whose fixedMixingRatio overrides disagree, even at the same level', () => {
    const a: Shade = { code: '12/1', level: 12, tone: 'ash', fixedMixingRatio: { colorParts: 1, developerParts: 2 } };
    const b: Shade = { code: '12/3', level: 12, tone: 'gold' };
    expect(canBlendShades(a, b)).toBe(false);
  });

  it('rejects shades whose developerVolumeChoices disagree', () => {
    const a: Shade = { code: '6/0', level: 6, tone: 'natural', developerVolumeChoices: [6, 13] };
    const b: Shade = { code: '6/1', level: 6, tone: 'ash' };
    expect(canBlendShades(a, b)).toBe(false);
  });
});

describe('suggestBlendComponents', () => {
  const chart: Shade[] = [
    { code: '7/0', level: 7, tone: 'natural' },
    { code: '7/1', level: 7, tone: 'ash' },
    { code: '7/17', level: 7, tone: 'ash', secondaryTone: 'chocolate' },
    { code: '7/7', level: 7, tone: 'chocolate' },
    { code: '7/71', level: 7, tone: 'chocolate', secondaryTone: 'ash' },
    { code: '9/1', level: 9, tone: 'ash' },
  ];

  it('suggests the pure-primary and pure-secondary reflect shades for a double-digit target', () => {
    const target = chart.find(s => s.code === '7/17')!;
    const { primary, secondary } = suggestBlendComponents(target, chart);
    expect(primary?.code).toBe('7/1');
    expect(secondary?.code).toBe('7/7');
  });

  it('never suggests the target itself even when it is otherwise a pure-reflect match', () => {
    const soloAsh: Shade[] = [{ code: '7/1', level: 7, tone: 'ash' }];
    const { primary } = suggestBlendComponents(soloAsh[0], soloAsh);
    expect(primary).toBeNull();
  });

  it('leaves the secondary suggestion null when the target has no secondary reflect', () => {
    const target = chart.find(s => s.code === '7/1')!;
    const { secondary } = suggestBlendComponents(target, chart);
    expect(secondary).toBeNull();
  });

  it('never suggests a shade from an incompatible level', () => {
    const target: Shade = { code: '10/17', level: 10, tone: 'ash', secondaryTone: 'chocolate' };
    const { primary } = suggestBlendComponents(target, chart);
    // Only a level-7 '7/1' exists in the chart for tone 'ash'; the level-10 target must not match it.
    expect(primary).toBeNull();
  });
});
