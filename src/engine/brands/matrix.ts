import type { Shade } from "../shades";

// Transcribed from Matrix's 2026 US SoColor quick reference guide (matrixhaircare.co.uk),
// Blended Natural Collection -- SoColor Pre-Bonded is Matrix's PERMANENT oxidative line
// (see LINE_PERMANENCE in shadeMatch.ts). It mixes 1:1 with Matrix Cream Developer
// 10/20/30/40 vol, no exceptions -- see `matrixMixingRatio` in brands.ts, the same flat
// ratio Redken Chromatics and Igora Royal use, not a level-based one. There's no per-shade
// `developerLiftTable` override here either: unlike Wella/Igora/L'Oréal's dedicated
// Highlift/Special Blonde sub-ranges (double ratio, own lift table, fixed processing
// time), SoColor's level 11 shades are ordinary Blended Natural entries that go through
// the engine's standard permanent lift path exactly like every level below them.
//
// Code format: level + one or two UPPERCASE reflect letters, no separator (e.g. "6N",
// "7CG") -- for a two-letter code the first letter is the dominant/primary reflect
// (-> `tone`) and the second modifies it (-> `secondaryTone`), mirroring how every other
// brand in this catalog already reads a two-part code. A repeated letter (AA, RR) means
// an intensified version of that single family, encoded as `secondaryTone` === `tone`,
// the same repeated-letter convention Wella/Igora/Redken's own charts use.
//
// Letter -> `ToneFamily` reading: N natural, A ash, G gold, C copper, R red, V violet,
// P pearl, M "Mocha" -> chocolate (`ToneFamily` has no dedicated mocha/brown entry), B
// "Brown" -> chocolate (same reasoning as M -- Matrix uses M and B for two distinct named
// families that both read as a brown/mocha reflect, so both approximate to the one
// `ToneFamily` chocolate slot), W "Warm" -> gold (a warm reflect with no dedicated
// `ToneFamily` of its own -- same gold approximation Igora's own "warm" digit uses), J
// "Jade" -> matt (`ToneFamily` has no green entry; Igora's own digit-3 green reads as matt
// for the same reason). Examples: 6NW = natural/gold, 3RV = red/violet, 7CG =
// copper/gold, 6BR = chocolate/red, 5BC = chocolate/copper, 6RB = red/chocolate.
//
// Deliberately excluded: Color Sync (Matrix's demi line) and the separate Reflect and
// Extra Coverage collections -- no complete verified public shade list for any of them at
// time of writing; add them later as separate `line` values under this same brand, same
// as Redken keeps Shades EQ and Chromatics apart (brands/redken.ts).
const socolorShades: Shade[] = [
  // Level 1
  { code: "1N", level: 1, tone: "natural" },

  // Level 2
  { code: "2N", level: 2, tone: "natural" },

  // Level 3
  { code: "3N", level: 3, tone: "natural" },
  { code: "3AA", level: 3, tone: "ash", secondaryTone: "ash" },
  { code: "3BR", level: 3, tone: "chocolate", secondaryTone: "red" },
  { code: "3RR", level: 3, tone: "red", secondaryTone: "red" },
  { code: "3RV", level: 3, tone: "red", secondaryTone: "violet" },

  // Level 4
  { code: "4N", level: 4, tone: "natural" },
  { code: "4AA", level: 4, tone: "ash", secondaryTone: "ash" },
  { code: "4A", level: 4, tone: "ash" },
  { code: "4VA", level: 4, tone: "violet", secondaryTone: "ash" },
  { code: "4NJ", level: 4, tone: "natural", secondaryTone: "matt" },
  { code: "4M", level: 4, tone: "chocolate" },
  { code: "4RB", level: 4, tone: "red", secondaryTone: "chocolate" },

  // Level 5
  { code: "5N", level: 5, tone: "natural" },
  { code: "5A", level: 5, tone: "ash" },
  { code: "5NA", level: 5, tone: "natural", secondaryTone: "ash" },
  { code: "5W", level: 5, tone: "gold" },
  { code: "5M", level: 5, tone: "chocolate" },
  { code: "5G", level: 5, tone: "gold" },
  { code: "5CG", level: 5, tone: "copper", secondaryTone: "gold" },
  { code: "5BC", level: 5, tone: "chocolate", secondaryTone: "copper" },
  { code: "5BR", level: 5, tone: "chocolate", secondaryTone: "red" },

  // Level 6
  { code: "6N", level: 6, tone: "natural" },
  { code: "6AA", level: 6, tone: "ash", secondaryTone: "ash" },
  { code: "6A", level: 6, tone: "ash" },
  { code: "6NA", level: 6, tone: "natural", secondaryTone: "ash" },
  { code: "6NV", level: 6, tone: "natural", secondaryTone: "violet" },
  { code: "6VA", level: 6, tone: "violet", secondaryTone: "ash" },
  { code: "6NJ", level: 6, tone: "natural", secondaryTone: "matt" },
  { code: "6NW", level: 6, tone: "natural", secondaryTone: "gold" },
  { code: "6W", level: 6, tone: "gold" },
  { code: "6M", level: 6, tone: "chocolate" },
  { code: "6BR", level: 6, tone: "chocolate", secondaryTone: "red" },
  { code: "6RB", level: 6, tone: "red", secondaryTone: "chocolate" },

  // Level 7
  { code: "7N", level: 7, tone: "natural" },
  { code: "7A", level: 7, tone: "ash" },
  { code: "7NA", level: 7, tone: "natural", secondaryTone: "ash" },
  { code: "7W", level: 7, tone: "gold" },
  { code: "7M", level: 7, tone: "chocolate" },
  { code: "7G", level: 7, tone: "gold" },
  { code: "7CG", level: 7, tone: "copper", secondaryTone: "gold" },
  { code: "7BC", level: 7, tone: "chocolate", secondaryTone: "copper" },
  { code: "7RB", level: 7, tone: "red", secondaryTone: "chocolate" },
  { code: "7P", level: 7, tone: "pearl" },

  // Level 8
  { code: "8N", level: 8, tone: "natural" },
  { code: "8AA", level: 8, tone: "ash", secondaryTone: "ash" },
  { code: "8A", level: 8, tone: "ash" },
  { code: "8AV", level: 8, tone: "ash", secondaryTone: "violet" },
  { code: "8NA", level: 8, tone: "natural", secondaryTone: "ash" },
  { code: "8W", level: 8, tone: "gold" },
  { code: "8M", level: 8, tone: "chocolate" },

  // Level 9
  { code: "9N", level: 9, tone: "natural" },
  { code: "9A", level: 9, tone: "ash" },
  { code: "9G", level: 9, tone: "gold" },
  { code: "9CG", level: 9, tone: "copper", secondaryTone: "gold" },
  { code: "9P", level: 9, tone: "pearl" },

  // Level 10
  { code: "10N", level: 10, tone: "natural" },
  { code: "10AV", level: 10, tone: "ash", secondaryTone: "violet" },

  // Level 11
  { code: "11N", level: 11, tone: "natural" },
  { code: "11A", level: 11, tone: "ash" },
  { code: "11P", level: 11, tone: "pearl" },
];

export const MATRIX_SOCOLOR_CHART: Shade[] = socolorShades.map(shade => ({ ...shade, line: "socolor" }));

// Super Sync (formerly SoColor Sync / Color Sync) -- Matrix's ammonia-free, alkaline
// demi-permanent line, a second Matrix line alongside the permanent SoColor Pre-Bonded
// chart above but a fundamentally different chemistry (little to no ammonia, a single
// 10 vol developer strength, 20-minute processing at room temperature -- see
// LINE_PERMANENCE in shadeMatch.ts, which is why the two lines are kept separate under
// one brand rather than merged, the same split Redken keeps between its own Chromatics
// and Shades EQ). Transcribed from Matrix's official "Decoding Super Sync" EU shade
// chart (matrix.com, shade-chart-pdfs/matrix-2024-eu-dmi-education-sync-shade-chart),
// which documents its own numeric-suffix reflect system (".0" natural through ".9"
// pearl) alongside the plain letter codes printed on the tubes themselves -- this
// catalog only transcribes the letter codes, same as every other chart in this file.
//
// Code format: level + one or two UPPERCASE reflect letters, same first-letter-primary /
// second-letter-secondary convention as SoColor Pre-Bonded above (confirmed by the
// chart's own worked example, "10NV": N primary/natural, V secondary/violet). A
// repeated letter (NN, MM) means an intensified version of that single family,
// `secondaryTone` === `tone`, the same repeated-letter convention used throughout this
// catalog.
//
// Letter -> `ToneFamily` reading, per Matrix's own decoder legend: N natural, A ash, V
// violet, G "Gold/Warm" -> gold (Super Sync's legend merges Gold and Warm into one
// column, unlike SoColor Pre-Bonded's separate G/W letters above -- both still read as
// gold, the only `ToneFamily` either maps to), C copper, B "Brown" -> chocolate, R red,
// M "Mocha" -> chocolate (same chocolate approximation B and M already share on the
// Pre-Bonded chart above), P pearl, T "Titanium" (a cool metallic ash, not one of the
// legend's own ten columns) -> slate-grey, the same approximation Redken's own
// Chromatics/Shades EQ Titanium reflects use (brands/redken.ts).
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
// modeling a developer-volume ladder here.
//
// Deliberately excluded: the four "+" boosted shades (6RC+, 6RV+, 7CC+, 7RR+) -- Matrix's
// own materials warn these HD-technology shades must not be used in combination with any
// other shade besides Clear or each other, a mixing restriction this catalog has no field
// to represent (same reasoning the dedicated HD-R/HD-RV correctors and "Clear" diluter
// are left out); the Sheer (SP-A/SP-P/SP-V/SP-N) and Pastel sub-collections (fashion-tone
// lines applied only to pre-lightened hair, same exclusion reasoning as Redken's own
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
  { code: "4BR", level: 4, tone: "chocolate", secondaryTone: "red" },
  { code: "4A", level: 4, tone: "ash" },

  // Level 5
  { code: "5M", level: 5, tone: "chocolate" },
  { code: "5NN", level: 5, tone: "natural", secondaryTone: "natural" },
  { code: "5N", level: 5, tone: "natural" },
  { code: "5VV", level: 5, tone: "violet", secondaryTone: "violet" },

  // Level 6
  { code: "6A", level: 6, tone: "ash" },
  { code: "6T", level: 6, tone: "slate-grey" },
  { code: "6P", level: 6, tone: "pearl" },
  { code: "6M", level: 6, tone: "chocolate" },
  { code: "6NN", level: 6, tone: "natural", secondaryTone: "natural" },
  { code: "6N", level: 6, tone: "natural" },
  { code: "6WN", level: 6, tone: "gold", secondaryTone: "natural" },
  { code: "6BR", level: 6, tone: "chocolate", secondaryTone: "red" },
  { code: "6BC", level: 6, tone: "chocolate", secondaryTone: "copper" },
  { code: "6RB", level: 6, tone: "red", secondaryTone: "chocolate" },
  { code: "6G", level: 6, tone: "gold" },
  { code: "6CG", level: 6, tone: "copper", secondaryTone: "gold" },

  // Level 7
  { code: "7NA", level: 7, tone: "natural", secondaryTone: "ash" },
  { code: "7N", level: 7, tone: "natural" },

  // Level 8
  { code: "8A", level: 8, tone: "ash" },
  { code: "8P", level: 8, tone: "pearl" },
  { code: "8V", level: 8, tone: "violet" },
  { code: "8M", level: 8, tone: "chocolate" },
  { code: "8NN", level: 8, tone: "natural", secondaryTone: "natural" },
  { code: "8N", level: 8, tone: "natural" },
  { code: "8WN", level: 8, tone: "gold", secondaryTone: "natural" },
  { code: "8BC", level: 8, tone: "chocolate", secondaryTone: "copper" },
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
  { code: "10P", level: 10, tone: "pearl" },
  { code: "10V", level: 10, tone: "violet" },
  { code: "10MM", level: 10, tone: "chocolate", secondaryTone: "chocolate" },
  { code: "10M", level: 10, tone: "chocolate" },
  { code: "10NV", level: 10, tone: "natural", secondaryTone: "violet" },

  // Level 11
  { code: "11A", level: 11, tone: "ash" },
  { code: "11P", level: 11, tone: "pearl" },
  { code: "11V", level: 11, tone: "violet" },
];

export const MATRIX_SUPER_SYNC_CHART: Shade[] = superSyncShades.map(shade => ({
  ...shade,
  line: "super-sync",
  fixedMixingRatio: { colorParts: 1, developerParts: 1 },
  developerVolumeChoices: [10],
}));
