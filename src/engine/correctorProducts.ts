import type { BrandId } from "./brands";
import type { Level } from "./levels";
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

// Some correctors change with depth: what cancels green at levels 4–7 is too strong (or
// too warm) on a light blonde. `light` is the softer product from its `fromLevel` up.
interface CorrectorEntry extends CorrectorProduct {
  light?: CorrectorProduct & { fromLevel: Level };
}

type CorrectorTable = Partial<Record<ToneFamily, CorrectorEntry>>;

// Keyed by the corrective tone neutralize.ts recommends: matt cancels red, ash (the blue
// corrector) cancels orange, violet cancels yellow. Wella's blue is its /8 series.
// Koleston Perfect has no pure green mixtone; 0/28 (matt blue) is its green one.
//
// `red` is the corrector against an unwanted green (Color Correction section; colorist,
// 2026-11-17): 0/44 red intense for dense green at levels 4–7; from level 8, or for a
// yellow-green cast, 0/65 violet-red, whose violet also cancels yellow and keeps the
// blonde from going pink. As a ready shade: /4 on mid levels, /65 on light blonde.
// `copper` is the corrector against an unwanted blue: 0/43 red-gold, equal red and gold
// giving a clean orange that turns the blue to neutral brown or beige.
const WELLA_KOLESTON: CorrectorTable = {
  matt: { shade: "/2", mixtone: "0/28" },
  ash: { shade: "/8", mixtone: "0/88" },
  violet: { shade: "/6", mixtone: "0/66" },
  red: { shade: "/4", mixtone: "0/44", light: { fromLevel: 8, shade: "/65", mixtone: "0/65" } },
  copper: { mixtone: "0/43" },
  // Against an unwanted violet: 0/33 gold intense for a dense violet (levels 7–9); 0/30
  // the softer, sheer gold for a light lilac haze on levels 9–10, to a clean pearl beige
  // without going yellow.
  gold: { shade: "/3", mixtone: "0/33", light: { fromLevel: 9, shade: "/3", mixtone: "0/30" } },
};

// Color Touch's mixtones are 0/34, 0/45, 0/56, 0/68 and 0/88: no green, and the violet
// one is 0/68. No 0/44 either: 0/45 red-mahogany is its green corrector, 0/56
// mahogany-violet the softer one for light green at levels 8–10 (no copper risk).
const WELLA_COLOR_TOUCH: CorrectorTable = {
  matt: { shade: "/2" },
  ash: { shade: "/8", mixtone: "0/88" },
  violet: { shade: "/6", mixtone: "0/68" },
  red: { mixtone: "0/45", light: { fromLevel: 8, mixtone: "0/56" } },
  // Against an unwanted blue: 0/34 gold-red, its only orange-copper mixtone, which cancels
  // blue and blue-green softly without darkening. As a ready shade: /34.
  copper: { shade: "/34", mixtone: "0/34" },
  // No gold mixtone (0/34, its only warm one, turns violet pink or peach): a ready /3
  // shade at the level being colored.
  gold: { shade: "/3" },
};

// L'Oréal Professionnel's mixtones are named by color, not numbered, and belong to one
// line each: they must not be mixed across lines (different pH and base). Since 2025
// Majirel's are Majirel Booster (cool Blue, Violet, Green; warm Orange, Red, Magenta);
// Dia Color and Dia Light have no mixtones, so the shade's own reflect is used.
//
// Against over-corrected hair (colorist, 2026-11-17): green is cancelled by red (.6),
// blue by copper (.4), violet by gold (.3). Majirel's warm boosters are Orange, Red and
// Magenta, with no yellow one, so violet takes a ready gold shade.
const LOREAL_MAJIREL: CorrectorTable = {
  matt: { shade: ".7", mixtone: "Booster Green" },
  ash: { shade: ".1", mixtone: "Booster Blue" },
  violet: { shade: ".2", mixtone: "Booster Violet" },
  // Green: Booster Red, or Magenta from level 8, where plain red risks bright pink.
  red: { shade: ".6", mixtone: "Booster Red", light: { fromLevel: 8, shade: ".6", mixtone: "Booster Magenta" } },
  copper: { shade: ".4", mixtone: "Booster Orange" },
  gold: { shade: ".3" },
};

const LOREAL_INOA: CorrectorTable = {
  matt: { shade: ".7", mixtone: "Mix Green" },
  ash: { shade: ".1", mixtone: "Mix Blue" },
  violet: { shade: ".2", mixtone: "Mix Violet" },
};

// Dia Color has no boosters (only Clear): every correction is an intense shade of the
// palette at the same level. Dia Light shares the table until it is removed (discontinued).
const LOREAL_SHADES_ONLY: CorrectorTable = {
  matt: { shade: ".7" },
  ash: { shade: ".1" },
  violet: { shade: ".2" },
  red: { shade: ".6" },
  copper: { shade: ".4" },
  gold: { shade: ".3" },
};

// Matrix SoColor is corrected with SoBoost boosters. Super Sync is not listed: SoBoost is
// documented for SoColor only.
//
// Against over-corrected hair (colorist, 2026-11-17): green ← SoBoost Red or R / .6 shades
// (6R, 7R, 6VR, 8RV); blue ← SoBoost Copper or C / .4 shades (7CC, 8C, 8GC, 6BC); violet ←
// SoBoost Yellow or G / W shades (8G, 9G, 8W, 9NW). The shade is named by its letter.
// Matrix's 2026 chart: Blue and Red are current; Yellow and Copper are classic boosters
// being phased out in some regions (see the Color Correction tips). SoBoost Green and
// Violet are no longer sold (colorist, 2026-11-17): red is cancelled with a matt-green
// Jade shade (J, e.g. 4J, 6J), yellow with a violet V shade (8V, 10V; 9AV in SoColor
// Pre-Bonded), or with booster blends the tips name.
const MATRIX_SOCOLOR: CorrectorTable = {
  matt: { shade: "J" },
  ash: { mixtone: "SoBoost Blue" },
  violet: { shade: "V" },
  red: { shade: "R", mixtone: "SoBoost Red" },
  copper: { shade: "C", mixtone: "SoBoost Copper" },
  gold: { shade: "G", mixtone: "SoBoost Yellow" },
};

function lorealTable(line: string | null | undefined): CorrectorTable {
  if (line === "majirel") return LOREAL_MAJIREL;
  if (line === "inoa") return LOREAL_INOA;
  return LOREAL_SHADES_ONLY;
}

function getCorrectorTable(brandId: BrandId | undefined, line: string | null | undefined): CorrectorTable | null {
  if (brandId === "wella") return line === "color-touch" ? WELLA_COLOR_TOUCH : WELLA_KOLESTON;
  if (brandId === "loreal") return lorealTable(line);
  if (brandId === "matrix" && line === "socolor") return MATRIX_SOCOLOR;
  return null;
}

// `level` is the depth the corrector works at; without one, the mid-level product.
export function getCorrectorProduct(
  brandId: BrandId | undefined,
  line: string | null | undefined,
  tone: ToneFamily,
  level?: Level,
): CorrectorProduct | null {
  const entry = getCorrectorTable(brandId, line)?.[tone];
  if (entry === undefined) return null;
  const { light, ...product } = entry;
  if (light === undefined || level === undefined || level < light.fromLevel) return product;
  return {
    ...(light.shade !== undefined && { shade: light.shade }),
    ...(light.mixtone !== undefined && { mixtone: light.mixtone }),
  };
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

// What the colorist decided for one tone of the corrector: take it as an ordinary shade,
// as a mixtone, or leave it out. A tone with no entry is taken, in its default form.
export type CorrectorChoice = "shade" | "mixtone" | "skip";
export type CorrectorSelection = Partial<Record<ToneFamily, CorrectorChoice>>;

// The form a tone is mixed in when the colorist has not picked one: the mixtone where the
// line has it, since it is the purer corrector.
export function getDefaultCorrectorForm(product: CorrectorProduct): "shade" | "mixtone" {
  return product.mixtone !== undefined ? "mixtone" : "shade";
}
