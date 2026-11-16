import type { BrandId } from "./brands";
import type { ToneFamily } from "./shades";

// What a brand calls the corrector for a tone: the tone suffix of an ordinary shade to
// add at the formula's level ("/8"), and the pure mixtone, where the line has one
// ("0/88"). The colorist's working table, 2026-11-16. Brands and tones not listed here
// are named by the generic tone ("ash", "violet").
export interface CorrectorProduct {
  // Absent where the brand corrects with a dedicated product only (Matrix SoBoost).
  shade?: string;
  mixtone?: string;
}

type CorrectorTable = Partial<Record<ToneFamily, CorrectorProduct>>;

// Keyed by the corrective tone neutralize.ts recommends: matt cancels red, ash (the blue
// corrector) cancels orange, violet cancels yellow. Wella's blue is its /8 series.
// Koleston Perfect has no pure green mixtone; 0/28 (matt blue) is its green one.
const WELLA_KOLESTON: CorrectorTable = {
  matt: { shade: "/2", mixtone: "0/28" },
  ash: { shade: "/8", mixtone: "0/88" },
  violet: { shade: "/6", mixtone: "0/66" },
};

// Color Touch's mixtones are 0/34, 0/45, 0/56, 0/68 and 0/88: no green, and the violet
// one is 0/68.
const WELLA_COLOR_TOUCH: CorrectorTable = {
  matt: { shade: "/2" },
  ash: { shade: "/8", mixtone: "0/88" },
  violet: { shade: "/6", mixtone: "0/68" },
};

// L'Oréal Professionnel's mixtones are named by color, not numbered, and belong to one
// line each: they must not be mixed across lines (different pH and base). Majirel Mix has
// no blue; Dia Color and Dia Light have no mixtones, so the shade's own reflect is used.
const LOREAL_MAJIREL: CorrectorTable = {
  matt: { shade: ".7", mixtone: "Mix Green" },
  ash: { shade: ".1" },
  violet: { shade: ".2", mixtone: "Mix Violet" },
};

const LOREAL_INOA: CorrectorTable = {
  matt: { shade: ".7", mixtone: "Mix Green" },
  ash: { shade: ".1", mixtone: "Mix Blue" },
  violet: { shade: ".2", mixtone: "Mix Violet" },
};

const LOREAL_SHADES_ONLY: CorrectorTable = {
  matt: { shade: ".7" },
  ash: { shade: ".1" },
  violet: { shade: ".2" },
};

// Matrix SoColor is corrected with SoBoost boosters. Super Sync is not listed: SoBoost is
// documented for SoColor only.
const MATRIX_SOCOLOR: CorrectorTable = {
  matt: { mixtone: "SoBoost Green" },
  ash: { mixtone: "SoBoost Blue" },
  violet: { mixtone: "SoBoost Violet" },
};

function lorealTable(line: string | null | undefined): CorrectorTable {
  if (line === "majirel") return LOREAL_MAJIREL;
  if (line === "inoa") return LOREAL_INOA;
  return LOREAL_SHADES_ONLY;
}

export function getCorrectorProduct(
  brandId: BrandId | undefined,
  line: string | null | undefined,
  tone: ToneFamily,
): CorrectorProduct | null {
  if (brandId === "wella") return (line === "color-touch" ? WELLA_COLOR_TOUCH : WELLA_KOLESTON)[tone] ?? null;
  if (brandId === "loreal") return lorealTable(line)[tone] ?? null;
  if (brandId === "matrix" && line === "socolor") return MATRIX_SOCOLOR[tone] ?? null;
  return null;
}

// How much developer the corrector itself needs, in parts per part of corrector, where the
// manufacturer asks for it on top of the formula's own: Matrix mixes Cream Developer 1:1
// with the summed weight of color and booster. Null where nothing extra is prescribed.
export function getCorrectorDeveloperParts(
  brandId: BrandId | undefined,
  line: string | null | undefined,
): number | null {
  return brandId === "matrix" && line === "socolor" ? 1 : null;
}
