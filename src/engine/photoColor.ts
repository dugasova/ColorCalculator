import { ciede2000, linearRgbToLab, linearToSrgb, rgbToHex, srgbToLinear, type Lab } from "./color";
import type { Brand, BrandId } from "./brands";
import type { Level } from "./levels";
import type { Shade } from "./shades";
import { shadeCalibrationId } from "./shadeCalibration";

export interface PhotoColorSample {
  lab: Lab;
  hex: string;
  pixelCount: number;
}

export interface ShadePhotoMatch {
  shade: Shade;
  distance: number;
}

// Below this many opaque, in-selection pixels a measurement is too noisy to trust --
// e.g. a crop that landed almost entirely on skin/background after alpha filtering.
export const MIN_SAMPLE_PIXELS = 50;

// Fraction of the darkest and (separately) lightest sampled pixels dropped before
// averaging -- trims shadow pixels and specular highlight glare, both of which skew a
// naive mean away from the measured surface's actual base color.
const TRIM_FRACTION = 0.15;

// A per-channel linear gain, applied in linear light (after srgbToLinear, before
// linearRgbToLab/linearToSrgb) -- see measureGreyCard/measureHairColor below.
export type LinearRgb = [number, number, number];

// A standard photography grey card reflects 18% of incident light -- the physical
// reference every one of this app's photo analyses is calibrated against (see the
// module comment below).
export const GREY_CARD_REFLECTANCE = 0.18;

// sRGB (0-255) channel level at/above which a pixel is treated as clipped (sensor
// saturation, not a real color reading) for the grey card's own overexposure check.
export const CARD_CLIP_LEVEL = 250;

// Above this fraction of the card selection clipped (see CARD_CLIP_LEVEL), the card
// itself is overexposed and no gain can be trusted to recover its real reflectance.
export const CARD_MAX_CLIPPED_FRACTION = 0.05;

// Per-channel linear-light floor below which the card selection is too dark (deep
// shadow, or genuinely not a grey card) to derive a trustworthy gain from.
export const CARD_MIN_LINEAR = 0.01;

export type GreyCardResult =
  | { ok: true; gains: LinearRgb }
  | { ok: false; reason: "tooSmall" | "clipped" | "tooDark" };

// Reads a cropped photo's grey-card pixel data (see readPhotoPixels) and derives the
// per-channel linear gain that maps its measured reflectance to GREY_CARD_REFLECTANCE --
// correcting both the camera's white balance (different gain per channel) and its
// exposure (same direction as a too-dark/too-bright scene) in one step. Every analysis
// photo carries this card in frame specifically so a client's hair and a salon's own
// calibration strand can be compared even when shot under different light or on
// different phones -- see measureHairColor below, which applies the resulting gains.
export function measureGreyCard(rgba: Uint8ClampedArray): GreyCardResult {
  const opaque: [number, number, number][] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    opaque.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
  }
  if (opaque.length < MIN_SAMPLE_PIXELS) return { ok: false, reason: "tooSmall" };

  const clippedCount = opaque.filter(
    ([r, g, b]) => r >= CARD_CLIP_LEVEL || g >= CARD_CLIP_LEVEL || b >= CARD_CLIP_LEVEL
  ).length;
  if (clippedCount / opaque.length > CARD_MAX_CLIPPED_FRACTION) return { ok: false, reason: "clipped" };

  const linear = opaque.map(([r, g, b]): LinearRgb => [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)]);
  linear.sort((a, b) => (0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]) - (0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2]));
  const trim = Math.floor(linear.length * TRIM_FRACTION);
  const kept = linear.slice(trim, linear.length - trim);

  const mean: LinearRgb = [0, 0, 0];
  for (const [r, g, b] of kept) { mean[0] += r; mean[1] += g; mean[2] += b; }
  mean[0] /= kept.length; mean[1] /= kept.length; mean[2] /= kept.length;

  if (mean[0] < CARD_MIN_LINEAR || mean[1] < CARD_MIN_LINEAR || mean[2] < CARD_MIN_LINEAR) {
    return { ok: false, reason: "tooDark" };
  }

  return {
    ok: true,
    gains: [GREY_CARD_REFLECTANCE / mean[0], GREY_CARD_REFLECTANCE / mean[1], GREY_CARD_REFLECTANCE / mean[2]],
  };
}

// Reads a cropped photo's hair pixel data (see readPhotoPixels), applies the grey card's
// white-balance/exposure gains (see measureGreyCard) in linear light, trims shadow/
// highlight outliers by L*, and averages the rest in Lab space. Deliberately doesn't
// clamp the corrected linear values to [0,1] before converting to Lab -- a gain pushing a
// bright pixel above 1 is a legitimate corrected reading, not an error; only the
// preview hex (via linearToSrgb) clamps, since a swatch color has to render. Returns null
// rather than a noisy guess when too few pixels survive.
export function measureHairColor(rgba: Uint8ClampedArray, gains: LinearRgb): PhotoColorSample | null {
  const samples: { corrected: LinearRgb; lab: Lab }[] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    const corrected: LinearRgb = [
      srgbToLinear(rgba[i]) * gains[0],
      srgbToLinear(rgba[i + 1]) * gains[1],
      srgbToLinear(rgba[i + 2]) * gains[2],
    ];
    samples.push({ corrected, lab: linearRgbToLab(corrected) });
  }
  if (samples.length < MIN_SAMPLE_PIXELS) return null;

  samples.sort((a, b) => a.lab[0] - b.lab[0]);
  const trim = Math.floor(samples.length * TRIM_FRACTION);
  const kept = samples.slice(trim, samples.length - trim);

  const sum = kept.reduce(
    (acc, s) => {
      acc.lab[0] += s.lab[0]; acc.lab[1] += s.lab[1]; acc.lab[2] += s.lab[2];
      acc.corrected[0] += s.corrected[0]; acc.corrected[1] += s.corrected[1]; acc.corrected[2] += s.corrected[2];
      return acc;
    },
    { lab: [0, 0, 0] as Lab, corrected: [0, 0, 0] as LinearRgb },
  );
  const n = kept.length;
  const lab: Lab = [sum.lab[0] / n, sum.lab[1] / n, sum.lab[2] / n];
  const meanCorrected: LinearRgb = [sum.corrected[0] / n, sum.corrected[1] / n, sum.corrected[2] / n];

  return {
    lab,
    hex: rgbToHex([linearToSrgb(meanCorrected[0]), linearToSrgb(meanCorrected[1]), linearToSrgb(meanCorrected[2])]),
    pixelCount: n,
  };
}

export interface CalibratedShade {
  shade: Shade;
  lab: Lab;
}

// Narrows a line's shade list down to the ones an admin has actually calibrated (see
// src/shadeCalibrations.ts) -- the only shades photo matching ever offers. There is no
// synthetic-swatch fallback for the rest: an uncalibrated shade's rendered color
// (shadeToHexColor) is an invented placeholder, not a measurement, and ranking a photo
// against it would reproduce the exact inaccuracy this calibration flow replaces.
export function calibratedShades(brandId: BrandId, shades: Shade[], index: Map<string, Lab>): CalibratedShade[] {
  const result: CalibratedShade[] = [];
  for (const shade of shades) {
    const lab = index.get(shadeCalibrationId(brandId, shade.line ?? null, shade.code));
    if (lab !== undefined) result.push({ shade, lab });
  }
  return result;
}

// Ranks a line's calibrated shades (see calibratedShades) by how close their measured
// color is to a measured hair color (see measureHairColor), via CIEDE2000 -- the "which
// of this line's shades looks like this reference photo" lookup behind the target-shade
// picker's photo mode. Stable sort keeps calibratedShades' own input order among
// equal-distance ties.
export function rankShadesByPhotoColor(lab: Lab, candidates: CalibratedShade[], limit: number): ShadePhotoMatch[] {
  return candidates
    .map(candidate => ({ shade: candidate.shade, distance: ciede2000(lab, candidate.lab) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

// A plain, undyed natural-tone shade -- e.g. Wella 3/00 or Igora 5-00, both of which
// carry secondaryTone "natural" rather than leaving it unset. These are the only shades
// buildNaturalLevelReferences below draws a level's reference color from: a shade with
// any other (secondary) tone reflects that tone's own cast, not the level's own base
// depth.
export function isNaturalLevelShade(shade: Shade): boolean {
  return shade.tone === "natural" && (shade.secondaryTone === undefined || shade.secondaryTone === "natural");
}

export interface LevelReference {
  level: Level;
  lab: Lab;
  sampleCount: number;
}

// Builds the per-level color references estimateStartLevel below reads a photo against,
// from every calibrated natural shade (see isNaturalLevelShade) across the live brand
// catalog -- several brands' level-6 naturals, for instance, average into one level-6
// reference. Walking `brands` (not the raw calibration list) means a discontinued
// shade's stale calibration never contributes. Returns an empty array when nothing
// qualifies, sorted ascending by level otherwise.
export function buildNaturalLevelReferences(brands: Record<BrandId, Brand>, index: Map<string, Lab>): LevelReference[] {
  const byLevel = new Map<Level, { sum: Lab; count: number }>();
  for (const brandId of Object.keys(brands)) {
    for (const shade of brands[brandId].shades) {
      if (!isNaturalLevelShade(shade)) continue;
      const lab = index.get(shadeCalibrationId(brandId, shade.line ?? null, shade.code));
      if (lab === undefined) continue;
      const entry = byLevel.get(shade.level) ?? { sum: [0, 0, 0] as Lab, count: 0 };
      entry.sum = [entry.sum[0] + lab[0], entry.sum[1] + lab[1], entry.sum[2] + lab[2]];
      entry.count += 1;
      byLevel.set(shade.level, entry);
    }
  }
  return [...byLevel.entries()]
    .map(([level, { sum, count }]): LevelReference => ({ level, lab: [sum[0] / count, sum[1] / count, sum[2] / count], sampleCount: count }))
    .sort((a, b) => a.level - b.level);
}

export type ToneDirection = "neutral" | "warm" | "cool" | "red";

// Below this a*/b* chroma distance from the level reference, a photo's hue angle is
// noise (sensor/lighting jitter), not a real undertone -- toneDirection below reports
// "neutral" rather than an arbitrary direction for it.
export const TONE_DIRECTION_MIN_CHROMA = 4;

// Coarse undertone read, not an exact tone-family match (the old estimateLevelAndTone's
// 0.3-3 delta-E gaps between tone families were smaller than real photo noise -- see this
// feature's design notes). `reference` is the measured color's own level reference (see
// buildNaturalLevelReferences); the hue angle of (measured - reference) in a*b* space
// sorts into the four directions a colorist actually acts on: warm/gold-copper casts
// read around +b* (yellow-red quadrant), red casts read close to +a* alone, and
// everything on the cool side (ash, violet, matte) shares -b*.
export function toneDirection(measured: Lab, reference: Lab): ToneDirection {
  const da = measured[1] - reference[1];
  const db = measured[2] - reference[2];
  if (Math.hypot(da, db) < TONE_DIRECTION_MIN_CHROMA) return "neutral";
  const hue = Math.atan2(db, da) * (180 / Math.PI);
  if (hue >= -30 && hue < 30) return "red";
  if (hue >= 30 && hue < 150) return "warm";
  return "cool";
}

export interface StartLevelEstimate {
  level: Level;
  distance: number;
  direction: ToneDirection;
}

// Finds the calibrated level reference (see buildNaturalLevelReferences) whose lightness
// is closest to a measured hair color -- the "what starting level is this photo" reading
// shown next to Starting level. Matches on L* alone, deliberately ignoring a*/b*: a
// reference's own chroma noise (lighting cast, calibration strand variance) must never
// move which *level* a photo reads as -- that's exactly what toneDirection above reports
// separately instead. Ties keep the lower level (first found while iterating ascending).
export function estimateStartLevel(lab: Lab, references: LevelReference[]): StartLevelEstimate | null {
  if (references.length === 0) return null;
  let best = references[0];
  for (const reference of references) {
    if (Math.abs(lab[0] - reference.lab[0]) < Math.abs(lab[0] - best.lab[0])) best = reference;
  }
  return { level: best.level, distance: ciede2000(lab, best.lab), direction: toneDirection(lab, best.lab) };
}
