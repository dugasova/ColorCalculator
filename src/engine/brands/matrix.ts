import type { LiftTable } from "../levels";
import { highLiftOverride, type Shade } from "../shades";

// Transcribed from Matrix's European SoColor Pre-Bonded Technical Guide V4 (UK
// distributor Salon Services' PDF; the tubes pictured carry Ukrainian/Russian/Polish text,
// so this is the range sold in Ukraine), checked 2026-11-23. It replaced the US chart,
// whose range differs widely (no mocha MA/MV/MM series or NW warm naturals; 1N, 8A, 9P,
// 11P instead). SoColor Pre-Bonded is Matrix's PERMANENT oxidative line
// (see LINE_PERMANENCE in shadeMatch.ts). It mixes 1:1 with Matrix Cream Developer
// 10/20/30/40 vol -- see `matrixMixingRatio` in brands.ts, the same flat ratio Igora
// Royal uses, not a level-based one.
//
// Included: the whole Blended Natural Collection (69 shades), the Reflect Collection's
// Power Cool and Reflective shades, the High Lift palette (11A, 11N) and the Ultra Blonde
// series (UL-, at level 12 like other brands' special blondes). Both lift only natural
// (never colored) hair: color does not lift color (colorist, 2026-11-23).
//  - High Lift: 1:1 with any of the four developers (colorist): 3% lifts 0–0.5 level, a
//    toner on a bleached 10–11 base, 15–35 min; 6% 1–2 levels from a natural 9–10,
//    35–45 min; 9% 2–3 levels from 8–9, 35–45 min; 12% 3–4 levels from 7–8, 45 min. Each
//    lift is the top of its range and each time the middle of its window. From 6 it
//    under-lifts to 8–9 on a bright yellow-orange background its pigment is not made to
//    neutralize: below 7 it warns, and Ultra Blonde is the series to take.
//  - Ultra Blonde: 1:2 with 9% or 12% only (colorist), from a natural level 6, 50 min
//    (European guide: mid-lengths and ends 15 min, then the roots). 9% lifts 3–4 levels,
//    the softer reaction leaving the pigment more to neutralize, for a natural 7–8 going
//    to a clean 10–11 (colorist): 4 here. Past 4 levels it is 12% (user's decision,
//    2026-11-23; the colorist's "up to 4–5", so 5 here), the one for a natural 6. Only
//    the shades on the European guide are
//    listed. UL-Silver reads as slate-grey (a silver tone for an already clean base,
//    like Super Sync's 6T); UL-Clear carries no pigment and reads as natural.
//
// Code format: level + one or two UPPERCASE reflect letters, no separator (e.g. "6N",
// "7CG") -- for a two-letter code the first letter is the dominant/primary reflect
// (-> `tone`) and the second modifies it (-> `secondaryTone`), mirroring how every other
// brand in this catalog already reads a two-part code. A repeated letter (AA, MM, RR)
// means an intensified version of that single family, encoded as `secondaryTone` ===
// `tone`, the same repeated-letter convention Wella/Igora/Redken's own charts use.
//
// Letter -> `ToneFamily` reading: N natural, A ash, G gold, C copper, R red, V violet,
// P pearl, SP "Silver Pearl" -> pearl, M "Mocha" -> chocolate (`ToneFamily` has no
// dedicated mocha/brown entry), B "Brown" -> chocolate (same reasoning as M -- Matrix uses
// M and B for two distinct named families that both read as a brown/mocha reflect, so
// both approximate to the one `ToneFamily` chocolate slot), W "Warm" -> gold (a warm
// reflect with no dedicated `ToneFamily` of its own -- same gold approximation Igora's own
// "warm" digit uses), J "Jade" -> matt (`ToneFamily` has no green entry; Igora's own
// digit-3 green reads as matt for the same reason). Examples: 6NW = natural/gold, 4VA =
// violet/ash, 7CG = copper/gold, 6MA = chocolate/ash, 5BV = chocolate/violet.
//
// Deliberately excluded: the "+" HD shades (4VR+, 6VR+, 5RR+, 7RR+, 4RV+, 5RV+, 6RV+,
// 6RC+; see the Super Sync note below; UL-N+ / UL-A+ are Ultra Blondes, not HD), SoRed
// boosters (SR-) and the Extra Coverage 500 series -- each its own rules; add them later
// as separate `line` values under this same brand, same as Igora keeps Royal and Vibrance
// apart (brands/igora.ts).
const highLiftLiftTable: LiftTable = volume => {
  switch (volume) {
    case 20:
      return 2;
    case 30:
      return 3;
    case 40:
      return 4;
    default:
      return 0;
  }
};

const SOCOLOR_HIGH_LIFT: Partial<Shade> = {
  developerLiftTable: highLiftLiftTable,
  fixedMixingRatio: { colorParts: 1, developerParts: 1 },
  minStartLevel: 7,
  processingMinutesByVolume: { 10: 25, 20: 40, 30: 40, 40: 45 },
  acceptsPartialLift: true,
  highLift: true,
};

const ultraBlondeLiftTable: LiftTable = volume => {
  switch (volume) {
    case 30:
      return 4;
    case 40:
      return 5;
    default:
      return 0;
  }
};

const SOCOLOR_ULTRA_BLONDE: Partial<Shade> = {
  ...highLiftOverride({
    developerLiftTable: ultraBlondeLiftTable,
    minStartLevel: 6,
    fixedProcessingMinutes: 50,
  }),
  // 9% even when nothing is lifted: Ultra Blonde never takes 3% or 6%.
  noLiftDeveloperVolume: 30,
  highLift: true,
};

const socolorShades: Shade[] = [
  // Level 1
  { code: "1A", level: 1, tone: "ash" },

  // Level 2
  { code: "2N", level: 2, tone: "natural" },

  // Level 3
  { code: "3N", level: 3, tone: "natural" },
  { code: "3VR", level: 3, tone: "violet", secondaryTone: "red" },

  // Level 4
  { code: "4AA", level: 4, tone: "ash", secondaryTone: "ash" },
  { code: "4VA", level: 4, tone: "violet", secondaryTone: "ash" },
  { code: "4NJ", level: 4, tone: "natural", secondaryTone: "matt" },
  { code: "4N", level: 4, tone: "natural" },
  { code: "4NW", level: 4, tone: "natural", secondaryTone: "gold" },
  { code: "4MA", level: 4, tone: "chocolate", secondaryTone: "ash" },
  { code: "4MV", level: 4, tone: "chocolate", secondaryTone: "violet" },
  { code: "4M", level: 4, tone: "chocolate" },
  { code: "4RR", level: 4, tone: "red", secondaryTone: "red" },
  { code: "4RV", level: 4, tone: "red", secondaryTone: "violet" },

  // Level 5
  { code: "5A", level: 5, tone: "ash" },
  { code: "5N", level: 5, tone: "natural" },
  { code: "5NW", level: 5, tone: "natural", secondaryTone: "gold" },
  { code: "5M", level: 5, tone: "chocolate" },
  { code: "5MG", level: 5, tone: "chocolate", secondaryTone: "gold" },
  { code: "5W", level: 5, tone: "gold" },
  { code: "5BV", level: 5, tone: "chocolate", secondaryTone: "violet" },
  { code: "5BC", level: 5, tone: "chocolate", secondaryTone: "copper" },
  { code: "5C", level: 5, tone: "copper" },

  // Level 6
  { code: "6AJ", level: 6, tone: "ash", secondaryTone: "matt" },
  { code: "6AA", level: 6, tone: "ash", secondaryTone: "ash" },
  { code: "6VA", level: 6, tone: "violet", secondaryTone: "ash" },
  { code: "6VR", level: 6, tone: "violet", secondaryTone: "red" },
  { code: "6A", level: 6, tone: "ash" },
  { code: "6NA", level: 6, tone: "natural", secondaryTone: "ash" },
  { code: "6NV", level: 6, tone: "natural", secondaryTone: "violet" },
  { code: "6N", level: 6, tone: "natural" },
  { code: "6NW", level: 6, tone: "natural", secondaryTone: "gold" },
  { code: "6AM", level: 6, tone: "ash", secondaryTone: "chocolate" },
  { code: "6VM", level: 6, tone: "violet", secondaryTone: "chocolate" },
  { code: "6MA", level: 6, tone: "chocolate", secondaryTone: "ash" },
  { code: "6MV", level: 6, tone: "chocolate", secondaryTone: "violet" },
  { code: "6MM", level: 6, tone: "chocolate", secondaryTone: "chocolate" },
  { code: "6M", level: 6, tone: "chocolate" },
  { code: "6MG", level: 6, tone: "chocolate", secondaryTone: "gold" },
  { code: "6MR", level: 6, tone: "chocolate", secondaryTone: "red" },
  { code: "6MC", level: 6, tone: "chocolate", secondaryTone: "copper" },
  { code: "6BV", level: 6, tone: "chocolate", secondaryTone: "violet" },
  { code: "6BC", level: 6, tone: "chocolate", secondaryTone: "copper" },

  // Level 7
  { code: "7AV", level: 7, tone: "ash", secondaryTone: "violet" },
  { code: "7A", level: 7, tone: "ash" },
  { code: "7NJ", level: 7, tone: "natural", secondaryTone: "matt" },
  { code: "7N", level: 7, tone: "natural" },
  { code: "7NW", level: 7, tone: "natural", secondaryTone: "gold" },
  { code: "7M", level: 7, tone: "chocolate" },
  { code: "7MG", level: 7, tone: "chocolate", secondaryTone: "gold" },
  { code: "7W", level: 7, tone: "gold" },
  { code: "7G", level: 7, tone: "gold" },
  { code: "7BC", level: 7, tone: "chocolate", secondaryTone: "copper" },
  { code: "7C", level: 7, tone: "copper" },
  { code: "7CG", level: 7, tone: "copper", secondaryTone: "gold" },
  { code: "7RR", level: 7, tone: "red", secondaryTone: "red" },

  // Level 8
  { code: "8AV", level: 8, tone: "ash", secondaryTone: "violet" },
  { code: "8AG", level: 8, tone: "ash", secondaryTone: "gold" },
  { code: "8SP", level: 8, tone: "pearl" },
  { code: "8P", level: 8, tone: "pearl" },
  { code: "8NA", level: 8, tone: "natural", secondaryTone: "ash" },
  { code: "8N", level: 8, tone: "natural" },
  { code: "8NW", level: 8, tone: "natural", secondaryTone: "gold" },
  { code: "8VM", level: 8, tone: "violet", secondaryTone: "chocolate" },
  { code: "8MA", level: 8, tone: "chocolate", secondaryTone: "ash" },
  { code: "8MM", level: 8, tone: "chocolate", secondaryTone: "chocolate" },
  { code: "8M", level: 8, tone: "chocolate" },
  { code: "8G", level: 8, tone: "gold" },
  { code: "8C", level: 8, tone: "copper" },
  { code: "8RC", level: 8, tone: "red", secondaryTone: "copper" },
  { code: "8CC", level: 8, tone: "copper", secondaryTone: "copper" },

  // Level 9
  { code: "9A", level: 9, tone: "ash" },
  { code: "9N", level: 9, tone: "natural" },
  { code: "9M", level: 9, tone: "chocolate" },
  { code: "9W", level: 9, tone: "gold" },
  { code: "9G", level: 9, tone: "gold" },

  // Level 10
  { code: "10AV", level: 10, tone: "ash", secondaryTone: "violet" },
  { code: "10P", level: 10, tone: "pearl" },
  { code: "10N", level: 10, tone: "natural" },
  { code: "10NW", level: 10, tone: "natural", secondaryTone: "gold" },
  { code: "10MM", level: 10, tone: "chocolate", secondaryTone: "chocolate" },
  { code: "10G", level: 10, tone: "gold" },

  // Level 11: High Lift
  { code: "11A", level: 11, tone: "ash", ...SOCOLOR_HIGH_LIFT },
  { code: "11N", level: 11, tone: "natural", ...SOCOLOR_HIGH_LIFT },

  // Level 12: Ultra Blonde, as on the European guide
  { code: "UL-N", level: 12, tone: "natural", ...SOCOLOR_ULTRA_BLONDE },
  { code: "UL-N+", level: 12, tone: "natural", secondaryTone: "natural", ...SOCOLOR_ULTRA_BLONDE },
  { code: "UL-NV+", level: 12, tone: "natural", secondaryTone: "violet", ...SOCOLOR_ULTRA_BLONDE },
  { code: "UL-A+", level: 12, tone: "ash", secondaryTone: "ash", ...SOCOLOR_ULTRA_BLONDE },
  { code: "UL-AA", level: 12, tone: "ash", secondaryTone: "ash", ...SOCOLOR_ULTRA_BLONDE },
  { code: "UL-V+", level: 12, tone: "violet", secondaryTone: "violet", ...SOCOLOR_ULTRA_BLONDE },
  { code: "UL-VV", level: 12, tone: "violet", secondaryTone: "violet", ...SOCOLOR_ULTRA_BLONDE },
  { code: "UL-Violet", level: 12, tone: "violet", ...SOCOLOR_ULTRA_BLONDE },
  { code: "UL-Silver", level: 12, tone: "slate-grey", ...SOCOLOR_ULTRA_BLONDE },
  { code: "UL-M", level: 12, tone: "chocolate", ...SOCOLOR_ULTRA_BLONDE },
  { code: "UL-Clear", level: 12, tone: "natural", ...SOCOLOR_ULTRA_BLONDE },
];

// SoColor has no corrector cap: the 25% of the dye was SoBoost's, and SoBoost is no
// longer sold in Ukraine (see ../correctorProducts.ts).
export const MATRIX_SOCOLOR_CHART: Shade[] = socolorShades.map(shade => ({
  ...shade,
  line: "socolor",
}));

// Super Sync (formerly SoColor Sync / Color Sync) -- Matrix's ammonia-free, alkaline
// demi-permanent line, a second Matrix line alongside the permanent SoColor Pre-Bonded
// chart above but a fundamentally different chemistry (little to no ammonia, a single
// 10 vol developer strength, 20-minute processing at room temperature -- see
// LINE_PERMANENCE in shadeMatch.ts, which is why the two lines are kept separate under
// one brand rather than merged, the same split Igora keeps between its own Royal
// and Vibrance). Transcribed from Matrix's official Super Sync 2026 shade chart
// (matrix.com, us_usmx/shade-chart-pdfs/matrix-super-sync-2026-shade-chart; checked
// 2026-11-23, replacing the earlier 2024 EU chart, which lacked 16 of its regular
// shades), which documents its own numeric-suffix reflect system (".0" natural through
// ".9" pearl) alongside the plain letter codes printed on the tubes themselves -- this
// catalog only transcribes the letter codes, same as every other chart in this file.
//
// Code format: level + one or two UPPERCASE reflect letters, same first-letter-primary /
// second-letter-secondary convention as SoColor Pre-Bonded above (confirmed by the
// chart's own worked example, "10NV": N primary/natural, V secondary/violet). A
// repeated letter (NN, MM) means an intensified version of that single family,
// `secondaryTone` === `tone`, the same repeated-letter convention used throughout this
// catalog. A three-letter code with a doubled N (4NNG, 6NNA) reads as N plus the third
// letter (natural/gold, natural/ash): the NN intensity has no field of its own.
//
// Letter -> `ToneFamily` reading, per Matrix's own decoder legend: N natural, A ash, V
// violet, G "Gold/Warm" -> gold (Super Sync's legend merges Gold and Warm into one
// column, unlike SoColor Pre-Bonded's separate G/W letters above -- both still read as
// gold, the only `ToneFamily` either maps to), C copper, B "Brown" -> chocolate, R red,
// M "Mocha" -> chocolate (same chocolate approximation B and M already share on the
// Pre-Bonded chart above), P pearl, T "Titanium" (a cool metallic ash, not one of the
// legend's own ten columns) -> slate-grey, the same approximation Redken's own
// Shades EQ Titanium reflects use (brands/redken.ts).
//
// Mixing: fixed 1:1 with Matrix Cream Developer 10 Volume (3%) -- the only developer
// strength Super Sync's own instructions call for, expressed here as a single-entry
// `developerVolumeChoices: [10]`, the same honesty tradeoff Redken Shades EQ's own
// single-entry `developerVolumeChoices: [6]` documents (routes through the engine's demi
// machinery -- 20-minute processing, no-lift warning -- without implying a developer-
// strength choice that doesn't really exist). Matrix's own instructions note Super Sync
// "can provide up to 1 level of lift" as an incidental side effect of its alkaline
// formula, not a colorist-selectable lift the way a real permanent developer ladder is --
// same reasoning Shades EQ's own single-strength Processing Solution gives for not
// modeling a developer-volume ladder here. That one level is `depositLift`: a shade one
// level above the start gives no warning, and past that the warning asks for a base of
// its level minus one to its level (11V: 10–11; user, 2026-11-23).
//
// Deliberately excluded: the five "+" boosted shades (4RV+, 6RC+, 6RV+, 7CC+, 7RR+) -- Matrix's
// own materials warn these HD-technology shades must not be used in combination with any
// other shade besides Clear or each other, a mixing restriction this catalog has no field
// to represent (same reasoning the dedicated HD-R/HD-RV correctors and "Clear" diluter
// are left out); the Sheer Pastel toners (SP-A/SP-AG/SP-P/SP-V/SP-M/SP-N; fashion-tone
// toners applied only to pre-lightened hair, same exclusion reasoning as Redken's own
// Shades EQ Pastels); and Tonal Control (a separate acidic, zero-lift gel-cream toner
// product with its own different chemistry and shade codes, not part of Super Sync itself).
const superSyncShades: Shade[] = [
  // Level 1
  { code: "1A", level: 1, tone: "ash" },

  // Level 2
  { code: "2N", level: 2, tone: "natural" },

  // Level 3
  { code: "3N", level: 3, tone: "natural" },
  { code: "3NN", level: 3, tone: "natural", secondaryTone: "natural" },

  // Level 4
  { code: "4N", level: 4, tone: "natural" },
  { code: "4NN", level: 4, tone: "natural", secondaryTone: "natural" },
  { code: "4NNG", level: 4, tone: "natural", secondaryTone: "gold" },
  { code: "4BR", level: 4, tone: "chocolate", secondaryTone: "red" },
  { code: "4A", level: 4, tone: "ash" },

  // Level 5
  { code: "5M", level: 5, tone: "chocolate" },
  { code: "5NN", level: 5, tone: "natural", secondaryTone: "natural" },
  { code: "5N", level: 5, tone: "natural" },
  { code: "5WN", level: 5, tone: "gold", secondaryTone: "natural" },
  { code: "5VV", level: 5, tone: "violet", secondaryTone: "violet" },

  // Level 6
  { code: "6A", level: 6, tone: "ash" },
  { code: "6T", level: 6, tone: "slate-grey" },
  { code: "6P", level: 6, tone: "pearl" },
  { code: "6M", level: 6, tone: "chocolate" },
  { code: "6NNA", level: 6, tone: "natural", secondaryTone: "ash" },
  { code: "6NN", level: 6, tone: "natural", secondaryTone: "natural" },
  { code: "6N", level: 6, tone: "natural" },
  { code: "6NNG", level: 6, tone: "natural", secondaryTone: "gold" },
  { code: "6WN", level: 6, tone: "gold", secondaryTone: "natural" },
  { code: "6BR", level: 6, tone: "chocolate", secondaryTone: "red" },
  { code: "6BC", level: 6, tone: "chocolate", secondaryTone: "copper" },
  { code: "6RB", level: 6, tone: "red", secondaryTone: "chocolate" },
  { code: "6G", level: 6, tone: "gold" },
  { code: "6CG", level: 6, tone: "copper", secondaryTone: "gold" },

  // Level 7
  { code: "7NA", level: 7, tone: "natural", secondaryTone: "ash" },
  { code: "7NN", level: 7, tone: "natural", secondaryTone: "natural" },
  { code: "7N", level: 7, tone: "natural" },

  // Level 8
  { code: "8A", level: 8, tone: "ash" },
  { code: "8AG", level: 8, tone: "ash", secondaryTone: "gold" },
  { code: "8P", level: 8, tone: "pearl" },
  { code: "8V", level: 8, tone: "violet" },
  { code: "8VG", level: 8, tone: "violet", secondaryTone: "gold" },
  { code: "8M", level: 8, tone: "chocolate" },
  { code: "8NN", level: 8, tone: "natural", secondaryTone: "natural" },
  { code: "8N", level: 8, tone: "natural" },
  { code: "8NNG", level: 8, tone: "natural", secondaryTone: "gold" },
  { code: "8WN", level: 8, tone: "gold", secondaryTone: "natural" },
  { code: "8BC", level: 8, tone: "chocolate", secondaryTone: "copper" },
  { code: "8GV", level: 8, tone: "gold", secondaryTone: "violet" },
  { code: "8G", level: 8, tone: "gold" },
  { code: "8CG", level: 8, tone: "copper", secondaryTone: "gold" },

  // Level 9
  { code: "9MM", level: 9, tone: "chocolate", secondaryTone: "chocolate" },
  { code: "9NA", level: 9, tone: "natural", secondaryTone: "ash" },
  { code: "9N", level: 9, tone: "natural" },
  { code: "9GV", level: 9, tone: "gold", secondaryTone: "violet" },

  // Level 10
  { code: "10N", level: 10, tone: "natural" },
  { code: "10G", level: 10, tone: "gold" },
  { code: "10A", level: 10, tone: "ash" },
  { code: "10AG", level: 10, tone: "ash", secondaryTone: "gold" },
  { code: "10P", level: 10, tone: "pearl" },
  { code: "10V", level: 10, tone: "violet" },
  { code: "10MM", level: 10, tone: "chocolate", secondaryTone: "chocolate" },
  { code: "10M", level: 10, tone: "chocolate" },
  { code: "10NV", level: 10, tone: "natural", secondaryTone: "violet" },
  { code: "10NN", level: 10, tone: "natural", secondaryTone: "natural" },
  { code: "10NNG", level: 10, tone: "natural", secondaryTone: "gold" },
  { code: "10NR", level: 10, tone: "natural", secondaryTone: "red" },

  // Level 11
  { code: "11A", level: 11, tone: "ash" },
  { code: "11P", level: 11, tone: "pearl" },
  { code: "11V", level: 11, tone: "violet" },
  { code: "11VG", level: 11, tone: "violet", secondaryTone: "gold" },
  { code: "11GV", level: 11, tone: "gold", secondaryTone: "violet" },
];

export const MATRIX_SUPER_SYNC_CHART: Shade[] = superSyncShades.map(shade => ({
  ...shade,
  line: "super-sync",
  fixedMixingRatio: { colorParts: 1, developerParts: 1 },
  developerVolumeChoices: [10],
  // "Can provide up to 1 level of lift" (see the Mixing note above): 11V from a 10.
  depositLift: 1,
}));
