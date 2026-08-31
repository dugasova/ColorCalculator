import { describe, it, expect } from 'vitest';
import { shadeToHexColor, blendShadeHexColors } from './color';

const HEX_RE = /^#[0-9a-f]{6}$/i;

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

describe('shadeToHexColor', () => {
  it('returns a valid 6-digit hex color', () => {
    expect(shadeToHexColor({ code: '5.0', level: 5, tone: 'natural' })).toMatch(HEX_RE);
  });

  it('produces lighter output for higher levels at the same tone', () => {
    const dark = shadeToHexColor({ code: '1.0', level: 1, tone: 'natural' });
    const light = shadeToHexColor({ code: '10.0', level: 10, tone: 'natural' });
    expect(luminance(light)).toBeGreaterThan(luminance(dark));
  });

  it('secondary tone changes the resulting color', () => {
    const withoutSecondary = shadeToHexColor({ code: '5/0', level: 5, tone: 'natural' });
    const withSecondary = shadeToHexColor({ code: '5/07', level: 5, tone: 'natural', secondaryTone: 'chocolate' });
    expect(withSecondary).not.toBe(withoutSecondary);
  });

  it('supports every tone family without throwing', () => {
    const tones: Array<Parameters<typeof shadeToHexColor>[0]['tone']> = [
      'natural', 'ash', 'matt', 'gold', 'copper', 'red', 'violet', 'chocolate', 'pearl', 'slate-grey', 'mahogany',
    ];
    for (const tone of tones) {
      expect(shadeToHexColor({ code: 'x', level: 6, tone })).toMatch(HEX_RE);
    }
  });

  it('keeps very dark levels close to black even with a saturated reflect tone', () => {
    const swatch = shadeToHexColor({ code: '1.3', level: 1, tone: 'gold' });
    expect(luminance(swatch)).toBeLessThan(40);
  });

  it('shows the tone reflect more strongly on lighter levels than darker levels', () => {
    function channelDelta(a: string, b: string): number {
      const an = parseInt(a.slice(1), 16), bn = parseInt(b.slice(1), 16);
      const ar = (an >> 16) & 255, ag = (an >> 8) & 255, ab = an & 255;
      const br = (bn >> 16) & 255, bg = (bn >> 8) & 255, bb = bn & 255;
      return Math.abs(ar - br) + Math.abs(ag - bg) + Math.abs(ab - bb);
    }
    const level1Delta = channelDelta(
      shadeToHexColor({ code: '1.0', level: 1, tone: 'natural' }),
      shadeToHexColor({ code: '1.3', level: 1, tone: 'gold' }),
    );
    const level10Delta = channelDelta(
      shadeToHexColor({ code: '10.0', level: 10, tone: 'natural' }),
      shadeToHexColor({ code: '10.3', level: 10, tone: 'gold' }),
    );
    expect(level10Delta).toBeGreaterThan(level1Delta);
  });
});

describe('blendShadeHexColors', () => {
  const ash = { code: '7/1', level: 7, tone: 'ash' } as const;
  const gold = { code: '7/3', level: 7, tone: 'gold' } as const;

  it('returns a valid 6-digit hex color', () => {
    expect(blendShadeHexColors(ash, gold, 50)).toMatch(HEX_RE);
  });

  it('matches the primary shade alone at 100%', () => {
    expect(blendShadeHexColors(ash, gold, 100)).toBe(shadeToHexColor(ash));
  });

  it('matches the secondary shade alone at 0%', () => {
    expect(blendShadeHexColors(ash, gold, 0)).toBe(shadeToHexColor(gold));
  });

  it('lands strictly between the two swatches at 50%', () => {
    const blended = blendShadeHexColors(ash, gold, 50);
    expect(blended).not.toBe(shadeToHexColor(ash));
    expect(blended).not.toBe(shadeToHexColor(gold));
  });
});
