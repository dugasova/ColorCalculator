import { z } from "zod";
import type { BrandId } from "./brands";
import type { Lab } from "./color";

// A salon's own measured color for one real shade, photographed next to an 18% grey card
// (see photoColor.ts's measureGreyCard/measureHairColor) -- replaces the synthetic,
// hand-picked shadeToHexColor swatch as the reference photo matching ranks against.
// `line` mirrors Shade.line (null, not undefined, since Firestore document fields can't
// be undefined -- same reasoning as palette.ts's disableOverrideId).
export interface ShadeCalibration {
  id: string;
  brandId: BrandId;
  line: string | null;
  code: string;
  lab: Lab;
}

export const shadeCalibrationSchema: z.ZodType<Omit<ShadeCalibration, "id">> = z.object({
  brandId: z.string(),
  line: z.string().nullable(),
  code: z.string(),
  lab: z.tuple([z.number(), z.number(), z.number()]),
});

// Deterministic doc id, same format/rationale as palette.ts's disableOverrideId and
// stock/products.ts's shadeStockId: a recalibration overwrites the same document instead of
// accumulating duplicates, and every part is URI-encoded since Firestore document ids
// can't contain "/" (several Wella codes do, e.g. "5/41").
export function shadeCalibrationId(brandId: BrandId, line: string | null, code: string): string {
  return `${encodeURIComponent(brandId)}::${encodeURIComponent(line ?? "")}::${encodeURIComponent(code)}`;
}

// Keyed by shadeCalibrationId recomputed from each record's own fields, not its raw doc
// id -- a hand-made Firestore document with a mismatched id still keys correctly. Last
// record wins on an id collision (shouldn't happen via the app's own writes, which always
// use shadeCalibrationId as the doc id, but a hand-edited duplicate shouldn't crash this).
export function indexShadeCalibrations(calibrations: ShadeCalibration[]): Map<string, Lab> {
  const index = new Map<string, Lab>();
  for (const calibration of calibrations) {
    index.set(shadeCalibrationId(calibration.brandId, calibration.line, calibration.code), calibration.lab);
  }
  return index;
}
