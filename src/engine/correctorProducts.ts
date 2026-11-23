import type { BrandId } from "./brands";
import type { Level } from "./levels";
import type { ToneFamily } from "./shades";

// What a brand calls the corrector for a tone: the tone suffix of an ordinary shade to
// add at the formula's level ("/8"), and the pure mixtone, where the line has one
// ("0/88"). The colorist's working table, 2026-11-16. Brands and tones not listed here
// are named by the generic tone ("ash", "violet").
export interface CorrectorProduct {
  // Absent where the brand corrects with a dedicated product only.
  shade?: string;
  mixtone?: string;
  // The two forms may also go in together, the tone's grams shared between them, rather
  // than one or the other (Igora's 0-11 with 0-99 on light blonde).
  combinable?: boolean;
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

// Matrix SoColor, as sold in Ukraine: SoBoost boosters are no longer sold there; the only
// boosters on the European card are SoRed (SR-RV, SR-R, SR-RC, SR-C; colorist,
// 2026-11-23). So most tones are corrected with a shade named by its letter: orange with
// an A shade (AA, 4AA / 6AA, for a dense orange), red with a matt-green Jade shade (J:
// 4NJ, 7NJ, 6AJ). Super Sync is not listed: no boosters of its own in Ukraine either.
//
// Against over-corrected hair (colorist, 2026-11-17): green ← SoRed SR-R or R shades
// (4RR, 7RR, 8RC); blue ← SoRed SR-C or C shades (5C, 7C, 8C, 8CC); violet ← G / W
// shades (8G, 9G, 7W, 9W). SoColor has no plain V shade
// (colorist, 2026-11-23; neither card lists one): yellow is cancelled with the ready
// balanced AV shades (7AV, 8AV, 10AV) while orange still shows in the background, and with
// pearl P (8P, 10P) on a clean yellow from level 9, where blue could turn greenish grey.
const MATRIX_SOCOLOR: CorrectorTable = {
  matt: { shade: "J" },
  ash: { shade: "A" },
  violet: { shade: "AV", light: { fromLevel: 9, shade: "P" } },
  red: { shade: "R", mixtone: "SR-R" },
  copper: { shade: "C", mixtone: "SR-C" },
  gold: { shade: "G" },
};

// Schwarzkopf Igora: the 0- mixtones carry the same codes in Royal and Vibrance but are
// mixed only within their own line (colorist, 2026-11-17/18). 0-22 anti-orange (blue) on
// levels 6–7; 0-33 anti-red (matt green); 0-11 anti-yellow, a blue-violet cendré with blue
// leading, works on 7–10 against yellow-orange and yellow; warm: 0-77 copper, 0-55 gold.
// 0-00 is clear; E-1 cendré extract is not listed. The blue part of a blend stays 0-22, so
// a yellow-orange background takes 0-22 + 0-11 (colorist, 2026-11-18).
//
// Igora has no shade suffixes to offer, so the `shade` slot carries the colorist's
// alternative mixtone instead: 0-99 pure violet for a pearl beige on porous yellow blonde
// at 9–10 (no green risk), which may also go in together with 0-11; and 0-88 red against
// green next to the default 0-89 red-violet.
const IGORA: CorrectorTable = {
  matt: { mixtone: "0-33" },
  ash: { mixtone: "0-22" },
  violet: { mixtone: "0-11", light: { fromLevel: 9, shade: "0-99", mixtone: "0-11", combinable: true } },
  red: { shade: "0-88", mixtone: "0-89" },
  copper: { mixtone: "0-77" },
  gold: { mixtone: "0-55" },
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
  if (brandId === "igora" && (line === "royal" || line === "vibrance")) return IGORA;
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
    ...(light.combinable === true && { combinable: true }),
  };
}

// How much developer the corrector itself needs, in parts per part of corrector, where the
// manufacturer asks for it on top of the formula's own: Matrix mixes Cream Developer 1:1
// with the summed weight of color and booster, Igora its mixtones 1:1 too (30 g color +
// 3 g mixtone + 33 g developer). Null where nothing extra is prescribed.
export function getCorrectorDeveloperParts(
  brandId: BrandId | undefined,
  line: string | null | undefined,
): number | null {
  if (brandId === "matrix" && line === "socolor") return 1;
  if (brandId === "igora" && (line === "royal" || line === "vibrance")) return 1;
  return null;
}

// What the colorist decided for one tone of the corrector: take it as an ordinary shade,
// as a mixtone, both together where the product is combinable, or leave it out. A tone
// with no entry is taken, in its default form.
export type CorrectorChoice = "shade" | "mixtone" | "both" | "skip";
export type CorrectorSelection = Partial<Record<ToneFamily, CorrectorChoice>>;

// The form a tone is mixed in when the colorist has not picked one: the mixtone where the
// line has it, since it is the purer corrector.
export function getDefaultCorrectorForm(product: CorrectorProduct): "shade" | "mixtone" {
  return product.mixtone !== undefined ? "mixtone" : "shade";
}
