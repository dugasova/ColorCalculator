import { describe, it, expect } from "vitest";
import {
  measureGreyCard, measureHairColor, estimateStartLevel, toneDirection, buildNaturalLevelReferences,
  calibratedShades, rankShadesByPhotoColor, MIN_SAMPLE_PIXELS, TONE_DIRECTION_MIN_CHROMA,
  type LevelReference, type LinearRgb,
} from "./photoColor";
import { ciede2000, linearRgbToLab, linearToSrgb, type Lab } from "./color";
import { indexShadeCalibrations, type ShadeCalibration } from "./shadeCalibration";
import type { Shade } from "./shades";
import type { Brand, BrandId } from "./brands";

// Uniform opaque RGBA buffer of `n` pixels at the given already-linear-light color --
// stands in for readPhotoPixels' decoded output of a flat, evenly lit card/strand.
function fillLinear(linear: LinearRgb, n: number): Uint8ClampedArray {
  const srgb = linear.map(linearToSrgb) as [number, number, number];
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    out[i * 4] = srgb[0]; out[i * 4 + 1] = srgb[1]; out[i * 4 + 2] = srgb[2]; out[i * 4 + 3] = 255;
  }
  return out;
}

// Same, but the triple is already plain sRGB (0-255) -- for tests that need to hit an
// exact byte level (clipping/darkness thresholds) rather than a linear-light color.
function fillSrgb(rgb: [number, number, number], n: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    out[i * 4] = rgb[0]; out[i * 4 + 1] = rgb[1]; out[i * 4 + 2] = rgb[2]; out[i * 4 + 3] = 255;
  }
  return out;
}

describe("measureGreyCard + measureHairColor", () => {
  it("cancels a white-balance/exposure cast when the grey card's own gains are applied", () => {
    // A strand's true linear-light color, and a camera's white-balance cast (per-channel
    // gain) times exposure -- both applied identically to the card and the hair, exactly
    // as a real photo would.
    const hair: LinearRgb = [0.06, 0.04, 0.025];
    const cast: LinearRgb = [1.35, 1.0, 0.7];
    const exposure = 1.8;

    const cardLinear: LinearRgb = [0.18 * cast[0] * exposure, 0.18 * cast[1] * exposure, 0.18 * cast[2] * exposure];
    const hairLinear: LinearRgb = [hair[0] * cast[0] * exposure, hair[1] * cast[1] * exposure, hair[2] * cast[2] * exposure];
    const cardPixels = fillLinear(cardLinear, 100);
    const hairPixels = fillLinear(hairLinear, 100);

    const card = measureGreyCard(cardPixels);
    if (!card.ok) throw new Error(`expected a measurable grey card, got "${card.reason}"`);

    const referenceLab = linearRgbToLab(hair);
    const correctedSample = measureHairColor(hairPixels, card.gains);
    expect(correctedSample).not.toBeNull();
    expect(ciede2000(correctedSample!.lab, referenceLab)).toBeLessThan(1.5);

    // Without the grey card's correction, the same pixels read far from the true color --
    // proving the gain, not coincidence, cancels the cast above.
    const uncorrectedSample = measureHairColor(hairPixels, [1, 1, 1]);
    expect(ciede2000(uncorrectedSample!.lab, referenceLab)).toBeGreaterThanOrEqual(5);
  });

  it("rejects a card selection with too few opaque pixels", () => {
    expect(MIN_SAMPLE_PIXELS).toBe(50);
    const card = measureGreyCard(fillSrgb([128, 128, 128], 49));
    expect(card).toEqual({ ok: false, reason: "tooSmall" });
  });

  it("rejects an overexposed (clipped) card selection", () => {
    const card = measureGreyCard(fillSrgb([255, 255, 255], 100));
    expect(card).toEqual({ ok: false, reason: "clipped" });
  });

  it("rejects a too-dark card selection", () => {
    const card = measureGreyCard(fillSrgb([5, 5, 5], 100));
    expect(card).toEqual({ ok: false, reason: "tooDark" });
  });
});

describe("estimateStartLevel", () => {
  const references: LevelReference[] = [
    { level: 5, lab: [30, 0, 0], sampleCount: 1 },
    { level: 6, lab: [45, 0, 0], sampleCount: 1 },
    { level: 7, lab: [60, 0, 0], sampleCount: 1 },
  ];

  it("picks the reference whose L* is closest to the measured color", () => {
    const estimate = estimateStartLevel([47, 3, -2], references);
    expect(estimate?.level).toBe(6);
  });

  it("breaks an exact L* tie toward the lower level", () => {
    const estimate = estimateStartLevel([52.5, 0, 0], references);
    expect(estimate?.level).toBe(6);
  });

  it("returns null for an empty reference list", () => {
    expect(estimateStartLevel([50, 0, 0], [])).toBeNull();
  });
});

describe("toneDirection", () => {
  const reference: Lab = [50, 0, 0];

  it("reads an identical color as neutral", () => {
    expect(toneDirection(reference, reference)).toBe("neutral");
  });

  it("reads a positive b* shift as warm", () => {
    expect(toneDirection([50, 0, 10], reference)).toBe("warm");
  });

  it("reads a positive a* shift as red", () => {
    expect(toneDirection([50, 10, 0], reference)).toBe("red");
  });

  it("reads a negative b* shift as cool", () => {
    expect(toneDirection([50, 0, -10], reference)).toBe("cool");
  });

  it("reads chroma below the minimum threshold as neutral", () => {
    expect(TONE_DIRECTION_MIN_CHROMA).toBe(4);
    expect(toneDirection([50, 3.9, 0], reference)).toBe("neutral");
  });
});

const BRAND_A: BrandId = "brand-a";
const BRAND_B: BrandId = "brand-b";

describe("buildNaturalLevelReferences", () => {
  it("averages calibrated natural shades per level and excludes non-natural/non-00 ones", () => {
    const brandANatural6: Shade = { code: "6.0", level: 6, tone: "natural" };
    const brandBNatural6: Shade = { code: "6N", level: 6, tone: "natural" };
    const ash6: Shade = { code: "6.1", level: 6, tone: "ash" };
    const chocolate6: Shade = { code: "6/07", level: 6, tone: "natural", secondaryTone: "chocolate" };
    const natural5: Shade = { code: "5/00", level: 5, tone: "natural", secondaryTone: "natural" };

    const brands: Record<BrandId, Brand> = {
      [BRAND_A]: { id: BRAND_A, name: "Brand A", shades: [brandANatural6, ash6, chocolate6, natural5], mixingRatio: () => ({ colorParts: 1, developerParts: 1 }), pricePerGram: 0.1 },
      [BRAND_B]: { id: BRAND_B, name: "Brand B", shades: [brandBNatural6], mixingRatio: () => ({ colorParts: 1, developerParts: 1 }), pricePerGram: 0.1 },
    };

    const calibrations: ShadeCalibration[] = [
      { id: "a", brandId: BRAND_A, line: null, code: brandANatural6.code, lab: [50, 2, 3] },
      { id: "b", brandId: BRAND_B, line: null, code: brandBNatural6.code, lab: [52, -2, 1] },
      { id: "c", brandId: BRAND_A, line: null, code: ash6.code, lab: [48, -4, -6] },
      { id: "d", brandId: BRAND_A, line: null, code: chocolate6.code, lab: [49, 1, 8] },
      { id: "e", brandId: BRAND_A, line: null, code: natural5.code, lab: [35, 1, 2] },
    ];

    const references = buildNaturalLevelReferences(brands, indexShadeCalibrations(calibrations));

    expect(references).toEqual([
      { level: 5, lab: [35, 1, 2], sampleCount: 1 },
      { level: 6, lab: [51, 0, 2], sampleCount: 2 },
    ]);
  });

  it("returns an empty array when nothing is calibrated", () => {
    const brands: Record<BrandId, Brand> = {
      [BRAND_A]: { id: BRAND_A, name: "Brand A", shades: [{ code: "6.0", level: 6, tone: "natural" }], mixingRatio: () => ({ colorParts: 1, developerParts: 1 }), pricePerGram: 0.1 },
    };
    expect(buildNaturalLevelReferences(brands, new Map())).toEqual([]);
  });
});

describe("calibratedShades + rankShadesByPhotoColor", () => {
  const lineShades: Shade[] = [
    { code: "5.0", level: 5, tone: "natural" },
    { code: "8.3", level: 8, tone: "gold" },
    { code: "10.1", level: 10, tone: "ash" },
  ];

  const calibrations: ShadeCalibration[] = [
    { id: "a", brandId: BRAND_A, line: null, code: "5.0", lab: [70, 0, 0] },
    { id: "b", brandId: BRAND_A, line: null, code: "8.3", lab: [60, 15, 25] },
    // "10.1" is deliberately left uncalibrated.
  ];
  const index = indexShadeCalibrations(calibrations);

  it("skips uncalibrated shades", () => {
    const candidates = calibratedShades(BRAND_A, lineShades, index);
    expect(candidates.map(c => c.shade.code)).toEqual(["5.0", "8.3"]);
  });

  it("ranks the closest calibrated shade first", () => {
    const candidates = calibratedShades(BRAND_A, lineShades, index);
    const ranked = rankShadesByPhotoColor([60, 14, 24], candidates, 3);
    expect(ranked[0].shade.code).toBe("8.3");
    expect(ranked).toHaveLength(2);
  });
});
