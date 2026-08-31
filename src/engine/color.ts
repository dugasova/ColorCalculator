import type { Level } from './levels';
import type { Shade, ToneFamily } from './shades';

const LEVEL_BASE_HEX: Record<Level, string> = {
  1: '#1b1410',
  2: '#2c1e18',
  3: '#3d2820',
  4: '#4f3328',
  5: '#6b4432',
  6: '#8a5a3c',
  7: '#a87548',
  8: '#c79761',
  9: '#dbb37e',
  10: '#e8c99a',
  11: '#f0dcb8',
  12: '#f7ecd4',
};

const TONE_REFLECT: Record<ToneFamily, { hue: number; sat: number; lightDelta: number }> = {
  natural: { hue: 32, sat: 0.42, lightDelta: 0 },
  ash: { hue: 205, sat: 0.22, lightDelta: -0.02 },
  matt: { hue: 100, sat: 0.2, lightDelta: -0.02 },
  gold: { hue: 42, sat: 0.58, lightDelta: 0.015 },
  copper: { hue: 28, sat: 0.62, lightDelta: 0.015 },
  red: { hue: 8, sat: 0.55, lightDelta: 0.015 },
  violet: { hue: 283, sat: 0.32, lightDelta: -0.01 },
  chocolate: { hue: 22, sat: 0.45, lightDelta: -0.03 },
  pearl: { hue: 248, sat: 0.14, lightDelta: 0.03 },
  'slate-grey': { hue: 212, sat: 0.08, lightDelta: -0.01 },
  mahogany: { hue: 350, sat: 0.42, lightDelta: -0.02 },
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / d) % 6);
        break;
      case g:
        h = 60 * ((b - r) / d + 2);
        break;
      default:
        h = 60 * ((r - g) / d + 4);
        break;
    }
  }
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r: number;
  let g: number;
  let b: number;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function strengthForLevel(level: Level): number {
  return Math.min(0.42, 0.1 + (level - 1) * 0.032);
}

function applyTone(hex: string, level: Level, tone: ToneFamily, isSecondary: boolean): string {
  const [r, g, b] = hexToRgb(hex);
  const [, , baseL] = rgbToHsl(r, g, b);
  const reflect = TONE_REFLECT[tone];
  const tintL = Math.min(1, Math.max(0, baseL + reflect.lightDelta));
  const [tr, tg, tb] = hslToRgb(reflect.hue, reflect.sat, tintL);
  const strength = isSecondary ? strengthForLevel(level) * 0.5 : strengthForLevel(level);
  return rgbToHex([r + (tr - r) * strength, g + (tg - g) * strength, b + (tb - b) * strength]);
}

export function shadeToHexColor(shade: Shade): string {
  let hex = applyTone(LEVEL_BASE_HEX[shade.level], shade.level, shade.tone, false);
  if (shade.secondaryTone) {
    hex = applyTone(hex, shade.level, shade.secondaryTone, true);
  }
  return hex;
}

// Previews the swatch a blend would produce: a straight RGB interpolation of the two
// component shades' own rendered swatches, weighted by the same ratio the formula splits
// their grams by (see `splitShadeBlend`). Approximate -- real pigment mixing isn't linear
// in RGB -- but close enough for a preview swatch.
export function blendShadeHexColors(shadeA: Shade, shadeB: Shade, primaryPercent: number): string {
  const ratio = Math.min(100, Math.max(0, primaryPercent)) / 100;
  const [ra, ga, ba] = hexToRgb(shadeToHexColor(shadeA));
  const [rb, gb, bb] = hexToRgb(shadeToHexColor(shadeB));
  return rgbToHex([
    ra * ratio + rb * (1 - ratio),
    ga * ratio + gb * (1 - ratio),
    ba * ratio + bb * (1 - ratio),
  ]);
}

// sRGB (0-255) -> CIE Lab (D65 reference white), the standard input space for perceptual
// color-difference formulas (see ciede2000). RGB/HSL distances over- or under-weight hue
// differences relative to how people actually perceive them; Lab is built so that a fixed
// numeric distance corresponds to a roughly fixed *perceived* difference, hue or no hue.
function rgbToLab([r, g, b]: [number, number, number]): [number, number, number] {
  function toLinear(c: number): number {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b);
  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  function f(t: number): number {
    const delta = 6 / 29;
    return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
  }
  const fx = f(x / xn), fy = f(y / yn), fz = f(z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToLab(hex: string): [number, number, number] {
  return rgbToLab(hexToRgb(hex));
}

// CIEDE2000 perceptual color difference (delta-E) between two Lab colors -- see Sharma,
// Wu, Dalal (2005), "The CIEDE2000 Color-Difference Formula: Implementation Notes,
// Supplementary Test Data, and Mathematical Observations". Verified against all 34 pairs
// of that paper's published reference test data (see color.test.ts) to within 5e-5.
// Roughly: ~1 is a just-noticeable difference under ideal viewing, ~2-5 is noticeable
// side by side, beyond ~10 the colors read as clearly different at a glance.
export function ciede2000([l1, a1, b1]: [number, number, number], [l2, a2, b2]: [number, number, number]): number {
  const avgLp = (l1 + l2) / 2;
  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const avgC = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(avgC ** 7 / (avgC ** 7 + 25 ** 7)));

  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);
  const avgCp = (c1p + c2p) / 2;

  function hueAngle(ap: number, bComp: number): number {
    if (ap === 0 && bComp === 0) return 0;
    const deg = (Math.atan2(bComp, ap) * 180) / Math.PI;
    return deg < 0 ? deg + 360 : deg;
  }
  const h1p = hueAngle(a1p, b1);
  const h2p = hueAngle(a2p, b2);

  let avgHp: number;
  if (c1p === 0 || c2p === 0) avgHp = h1p + h2p;
  else if (Math.abs(h1p - h2p) > 180) avgHp = (h1p + h2p + 360) / 2;
  else avgHp = (h1p + h2p) / 2;

  const t = 1
    - 0.17 * Math.cos(((avgHp - 30) * Math.PI) / 180)
    + 0.24 * Math.cos((2 * avgHp * Math.PI) / 180)
    + 0.32 * Math.cos(((3 * avgHp + 6) * Math.PI) / 180)
    - 0.20 * Math.cos(((4 * avgHp - 63) * Math.PI) / 180);

  let deltahp: number;
  if (c1p === 0 || c2p === 0) {
    deltahp = 0;
  } else {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) deltahp = diff;
    else if (diff > 180) deltahp = diff - 360;
    else deltahp = diff + 360;
  }

  const deltaLp = l2 - l1;
  const deltaCp = c2p - c1p;
  const deltaHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(((deltahp / 2) * Math.PI) / 180);

  const sl = 1 + (0.015 * (avgLp - 50) ** 2) / Math.sqrt(20 + (avgLp - 50) ** 2);
  const sc = 1 + 0.045 * avgCp;
  const sh = 1 + 0.015 * avgCp * t;

  const deltaRo = 30 * Math.exp(-(((avgHp - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(avgCp ** 7 / (avgCp ** 7 + 25 ** 7));
  const rt = -rc * Math.sin((2 * deltaRo * Math.PI) / 180);

  const lTerm = deltaLp / sl;
  const cTerm = deltaCp / sc;
  const hTerm = deltaHp / sh;

  return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rt * cTerm * hTerm);
}

// How perceptually different two shades' rendered swatches are (see shadeToHexColor),
// via CIEDE2000 -- the metric findClosestShadeByBrand (shadeMatch.ts) ranks candidates by.
export function shadeColorDistance(a: Shade, b: Shade): number {
  return ciede2000(hexToLab(shadeToHexColor(a)), hexToLab(shadeToHexColor(b)));
}
