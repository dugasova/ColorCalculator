import { describe, it, expect } from 'vitest';
import { shadeToHexColor, blendShadeHexColors, hexToLab, ciede2000 } from './color';

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

// The Sharma, Wu, Dalal (2005) supplementary test dataset for CIEDE2000 -- the standard
// reference pairs used to validate implementations of this exact formula (also embedded
// in e.g. python-colormath's own test suite). Each row is [L1, a1, b1, L2, a2, b2, expected
// delta-E00]; asserting against all 34 catches sign/branching errors a handful of
// hand-picked cases could miss.
const CIEDE2000_REFERENCE_PAIRS: Array<[number, number, number, number, number, number, number]> = [
  [50.0000, 2.6772, -79.7751, 50.0000, 0.0000, -82.7485, 2.0425],
  [50.0000, 3.1571, -77.2803, 50.0000, 0.0000, -82.7485, 2.8615],
  [50.0000, 2.8361, -74.0200, 50.0000, 0.0000, -82.7485, 3.4412],
  [50.0000, -1.3802, -84.2814, 50.0000, 0.0000, -82.7485, 1.0000],
  [50.0000, -1.1848, -84.8006, 50.0000, 0.0000, -82.7485, 1.0000],
  [50.0000, -0.9009, -85.5211, 50.0000, 0.0000, -82.7485, 1.0000],
  [50.0000, 0.0000, 0.0000, 50.0000, -1.0000, 2.0000, 2.3669],
  [50.0000, -1.0000, 2.0000, 50.0000, 0.0000, 0.0000, 2.3669],
  [50.0000, 2.4900, -0.0010, 50.0000, -2.4900, 0.0009, 7.1792],
  [50.0000, 2.4900, -0.0010, 50.0000, -2.4900, 0.0010, 7.1792],
  [50.0000, 2.4900, -0.0010, 50.0000, -2.4900, 0.0011, 7.2195],
  [50.0000, 2.4900, -0.0010, 50.0000, -2.4900, 0.0012, 7.2195],
  [50.0000, -0.0010, 2.4900, 50.0000, 0.0009, -2.4900, 4.8045],
  [50.0000, -0.0010, 2.4900, 50.0000, 0.0010, -2.4900, 4.8045],
  [50.0000, -0.0010, 2.4900, 50.0000, 0.0011, -2.4900, 4.7461],
  [50.0000, 2.5000, 0.0000, 50.0000, 0.0000, -2.5000, 4.3065],
  [50.0000, 2.5000, 0.0000, 73.0000, 25.0000, -18.0000, 27.1492],
  [50.0000, 2.5000, 0.0000, 61.0000, -5.0000, 29.0000, 22.8977],
  [50.0000, 2.5000, 0.0000, 56.0000, -27.0000, -3.0000, 31.9030],
  [50.0000, 2.5000, 0.0000, 58.0000, 24.0000, 15.0000, 19.4535],
  [50.0000, 2.5000, 0.0000, 50.0000, 3.1736, 0.5854, 1.0000],
  [50.0000, 2.5000, 0.0000, 50.0000, 3.2972, 0.0000, 1.0000],
  [50.0000, 2.5000, 0.0000, 50.0000, 1.8634, 0.5757, 1.0000],
  [50.0000, 2.5000, 0.0000, 50.0000, 3.2592, 0.3350, 1.0000],
  [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
  [63.0109, -31.0961, -5.8663, 62.8187, -29.7946, -4.0864, 1.2630],
  [61.2901, 3.7196, -5.3901, 61.4292, 2.2480, -4.9620, 1.8731],
  [35.0831, -44.1164, 3.7933, 35.0232, -40.0716, 1.5901, 1.8645],
  [22.7233, 20.0904, -46.6940, 23.0331, 14.9730, -42.5619, 2.0373],
  [36.4612, 47.8580, 18.3852, 36.2715, 50.5065, 21.2231, 1.4146],
  [90.8027, -2.0831, 1.4410, 91.1528, -1.6435, 0.0447, 1.4441],
  [90.9257, -0.5406, -0.9208, 88.6381, -0.8985, -0.7239, 1.5381],
  [6.7747, -0.2908, -2.4247, 5.8714, -0.0985, -2.2286, 0.6377],
  [2.0776, 0.0795, -1.1350, 0.9033, -0.0636, -0.5514, 0.9082],
];

describe('ciede2000', () => {
  it('matches every pair of the Sharma/Wu/Dalal (2005) reference test dataset to 3 decimal places', () => {
    for (const [l1, a1, b1, l2, a2, b2, expected] of CIEDE2000_REFERENCE_PAIRS) {
      expect(ciede2000([l1, a1, b1], [l2, a2, b2])).toBeCloseTo(expected, 3);
    }
  });

  it('is zero for identical colors', () => {
    expect(ciede2000([50, 10, -20], [50, 10, -20])).toBeCloseTo(0, 10);
  });

  it('is symmetric', () => {
    const a: [number, number, number] = [40, 20, -30];
    const b: [number, number, number] = [60, -10, 15];
    expect(ciede2000(a, b)).toBeCloseTo(ciede2000(b, a), 10);
  });

  it('rates black vs white at exactly 100', () => {
    expect(ciede2000(hexToLab('#000000'), hexToLab('#ffffff'))).toBeCloseTo(100, 1);
  });

  it('rates two shades of the same tone/level pair as closer than two very different colors', () => {
    const near = ciede2000(hexToLab(shadeToHexColor({ code: 'a', level: 7, tone: 'natural' })), hexToLab(shadeToHexColor({ code: 'b', level: 7, tone: 'ash' })));
    const far = ciede2000(hexToLab('#000000'), hexToLab('#ffffff'));
    expect(near).toBeLessThan(far);
  });
});
