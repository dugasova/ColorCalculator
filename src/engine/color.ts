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
