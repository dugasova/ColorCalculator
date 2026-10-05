import { highLiftOverride, type Shade } from "../shades";
import type { LiftTable } from "../levels";

// Majirel High Lift / Majiblond Ultra - Majirel's own maximum-lift sub-range, sold as a
// companion product to the numbered chart below rather than a separate product line.
// Transcribed from L'Oréal Professionnel's official Majirel High Lift / Majiblond Ultra
// color chart and formulation guide: 30 vol lifts up to 4 levels, 40 vol up to a
// documented "4 to 4½" - rounded up to 5 since Level has no fractional values, matching
// how Igora Highlifts/Wella Special Blonde (igora.ts, wella.ts) already round their own
// developer ladders to whole levels and rely on visual confirmation near the ceiling.
const majiblondUltraLiftTable: LiftTable = (volume) => {
  switch (volume) {
    case 30: return 4;
    case 40: return 5;
    default: return 0;
  }
};

// Majiblond Ultra's own instructions call for a fixed 50-minute process without heat,
// regardless of gray coverage -- unlike the rest of Majirel, whose processing time is
// picked from gray percentage alone (see getRecommendedProcessingMinutes, ../formula.ts).
const MAJIBLOND_ULTRA_PROCESSING_MINUTES = 50;

// Majirel — permanent oxidation cream, L'Oréal's flagship line. Always mixes
// 1:1.5 with developer (never diff-based), and developer volume is picked by
// the shared lift-ladder logic, same as Koleston Perfect.
//
// Transcribed from L'Oréal's official 74-shade Majirel chart (level.reflect dot
// notation, e.g. "6.34"; a bare level with no dot, e.g. "6", is a distinct real
// shade too — Majirel sells both "6" and "6.0" as separate products at several
// levels). The reflect digit right after the dot maps to `tone`; a second digit,
// if present, maps to `secondaryTone` (informational only — the calculation
// engine only reads `tone`). Reflect digits: 0 natural, 1 ash, 2 iridescent,
// 3 gold, 4 copper, 5 mahogany, 6 red, 8 mocha (the real Majirel range has no
// standalone .7 or .9 shades). ToneFamily has no 'iridescent'/'mocha' entries,
// so those are mapped onto the closest member: iridescent -> 'violet' (matches
// its actual violet-blue hue, unlike the olive-green 'matt' family), mocha ->
// 'chocolate' (a warm neutral brown, unlike the cool blue-violet 'pearl' family).
const majirelShades: Shade[] = [
  // Level 1
  { code: "1", level: 1, tone: "natural" },

  // Level 2
  { code: "2", level: 2, tone: "natural" },
  { code: "2.10", level: 2, tone: "ash", secondaryTone: "natural" },

  // Level 3
  { code: "3", level: 3, tone: "natural" },

  // Level 4
  { code: "4", level: 4, tone: "natural" },
  { code: "4.0", level: 4, tone: "natural" },
  { code: "4.15", level: 4, tone: "ash", secondaryTone: "mahogany" },
  { code: "4.3", level: 4, tone: "gold" },
  { code: "4.35", level: 4, tone: "gold", secondaryTone: "mahogany" },
  { code: "4.45", level: 4, tone: "copper", secondaryTone: "mahogany" },
  { code: "4.56", level: 4, tone: "mahogany", secondaryTone: "red" },
  { code: "4.8", level: 4, tone: "chocolate" },

  // Level 5
  { code: "5", level: 5, tone: "natural" },
  { code: "5.0", level: 5, tone: "natural" },
  { code: "5.1", level: 5, tone: "ash" },
  { code: "5.12", level: 5, tone: "ash", secondaryTone: "violet" },
  { code: "5.3", level: 5, tone: "gold" },
  { code: "5.32", level: 5, tone: "gold", secondaryTone: "violet" },
  { code: "5.35", level: 5, tone: "gold", secondaryTone: "mahogany" },
  { code: "5.4", level: 5, tone: "copper" },
  { code: "5.5", level: 5, tone: "mahogany" },
  { code: "5.52", level: 5, tone: "mahogany", secondaryTone: "violet" },
  { code: "5.8", level: 5, tone: "chocolate" },

  // Level 6
  { code: "6", level: 6, tone: "natural" },
  { code: "6.0", level: 6, tone: "natural" },
  { code: "6.1", level: 6, tone: "ash" },
  { code: "6.11", level: 6, tone: "ash", secondaryTone: "ash" },
  { code: "6.13", level: 6, tone: "ash", secondaryTone: "gold" },
  { code: "6.23", level: 6, tone: "violet", secondaryTone: "gold" },
  { code: "6.3", level: 6, tone: "gold" },
  { code: "6.32", level: 6, tone: "gold", secondaryTone: "violet" },
  { code: "6.34", level: 6, tone: "gold", secondaryTone: "copper" },
  { code: "6.35", level: 6, tone: "gold", secondaryTone: "mahogany" },
  { code: "6.4", level: 6, tone: "copper" },
  { code: "6.45", level: 6, tone: "copper", secondaryTone: "mahogany" },
  { code: "6.46", level: 6, tone: "copper", secondaryTone: "red" },
  { code: "6.5", level: 6, tone: "mahogany" },
  { code: "6.8", level: 6, tone: "chocolate" },

  // Level 7
  { code: "7", level: 7, tone: "natural" },
  { code: "7.0", level: 7, tone: "natural" },
  { code: "7.03", level: 7, tone: "natural", secondaryTone: "gold" },
  { code: "7.1", level: 7, tone: "ash" },
  { code: "7.11", level: 7, tone: "ash", secondaryTone: "ash" },
  { code: "7.13", level: 7, tone: "ash", secondaryTone: "gold" },
  { code: "7.23", level: 7, tone: "violet", secondaryTone: "gold" },
  { code: "7.3", level: 7, tone: "gold" },
  { code: "7.31", level: 7, tone: "gold", secondaryTone: "ash" },
  { code: "7.35", level: 7, tone: "gold", secondaryTone: "mahogany" },
  { code: "7.4", level: 7, tone: "copper" },
  { code: "7.43", level: 7, tone: "copper", secondaryTone: "gold" },
  { code: "7.44", level: 7, tone: "copper", secondaryTone: "copper" },
  { code: "7.8", level: 7, tone: "chocolate" },

  // Level 8
  { code: "8", level: 8, tone: "natural" },
  { code: "8.0", level: 8, tone: "natural" },
  { code: "8.03", level: 8, tone: "natural", secondaryTone: "gold" },
  { code: "8.04", level: 8, tone: "natural", secondaryTone: "copper" },
  { code: "8.1", level: 8, tone: "ash" },
  { code: "8.11", level: 8, tone: "ash", secondaryTone: "ash" },
  { code: "8.13", level: 8, tone: "ash", secondaryTone: "gold" },
  { code: "8.3", level: 8, tone: "gold" },
  { code: "8.31", level: 8, tone: "gold", secondaryTone: "ash" },
  { code: "8.34", level: 8, tone: "gold", secondaryTone: "copper" },
  { code: "8.43", level: 8, tone: "copper", secondaryTone: "gold" },
  { code: "8.8", level: 8, tone: "chocolate" },

  // Level 9
  { code: "9", level: 9, tone: "natural" },
  { code: "9.0", level: 9, tone: "natural" },
  { code: "9.1", level: 9, tone: "ash" },
  { code: "9.13", level: 9, tone: "ash", secondaryTone: "gold" },
  { code: "9.22", level: 9, tone: "violet", secondaryTone: "violet" },
  { code: "9.3", level: 9, tone: "gold" },
  { code: "9.31", level: 9, tone: "gold", secondaryTone: "ash" },

  // Level 10
  { code: "10", level: 10, tone: "natural" },
  { code: "10.1", level: 10, tone: "ash" },
  { code: "10.31", level: 10, tone: "gold", secondaryTone: "ash" },

  // High Lift / Majiblond Ultra -- 1:2 ratio, lift table, min start level, and fixed
  // processing time encoded once below via LOREAL_MAJIREL_CHART's own post-processing
  // map, not repeated per shade here. Real tube codes have no leading depth digit --
  // `name` carries the chart's own descriptor instead of a marketing name.
  { code: ".0", level: 12, tone: "natural", name: "Neutral" },
  { code: ".1", level: 12, tone: "ash", name: "Ash" },
  { code: ".11", level: 12, tone: "ash", secondaryTone: "ash", name: "Ash+" },
  { code: ".13", level: 12, tone: "ash", secondaryTone: "gold", name: "Beige" },
  { code: ".2", level: 12, tone: "violet", name: "Violet" },
];

export const LOREAL_MAJIREL_CHART: Shade[] = majirelShades.map(shade => ({
  ...shade,
  line: "majirel",
  // High Lift / Majiblond Ultra (level 12) overrides Majirel's own default 1:1.5 ratio
  // with its own 1:2 and -- like Igora Highlifts/Wella Special Blonde (igora.ts,
  // wella.ts) -- is routinely chosen purely to lift as far as a single process safely
  // allows rather than to guarantee its own nominal level, so it alone gets
  // acceptsPartialLift (see Shade.acceptsPartialLift, ../shades.ts) instead.
  ...(shade.level === 12
    ? highLiftOverride({
      developerLiftTable: majiblondUltraLiftTable,
      minStartLevel: 5,
      fixedProcessingMinutes: MAJIBLOND_ULTRA_PROCESSING_MINUTES,
    })
    : { fixedMixingRatio: { colorParts: 1, developerParts: 1.5 } }),
}));

// INOA and Dia Light below are still approximated from publicly documented L'Oréal
// Professionnel shade-numbering conventions, not transcribed byte-exact from an
// official chart (unlike Majirel above, which is). Digit->name reading used across
// these two lines: 0 natural, 1 cendré, 2 irisé, 3 doré, 4 cuivré, 5 acajou, 6
// rouge/violine, 7 marron, 8 beige/perle, 9 cendré intense. ToneFamily has no
// 'cendré'/'irisé'/'doré'/'cuivré'/'acajou'/'rouge'/'marron'/'beige'/'perle' entries,
// so those French reflect names are approximated onto the closest ToneFamily member:
// cendré -> 'ash', irisé -> 'matt' (or 'violet' as a secondary digit for a
// stronger/double irisé), doré -> 'gold', cuivré -> 'copper' (also covers vénitien),
// acajou -> 'mahogany', rouge/violine -> 'red' (or 'violet' for a double-violine
// intensifier), marron -> 'chocolate', beige/perle -> 'pearl', cendré intense ->
// 'slate-grey'.
//
// Dia Color (further below, after Dia Light) is a newer line and uses its own,
// English-named digit convention instead, matching Majirel's reflect digits above
// rather than INOA/Dia Light's French one: 1 ash, 2 iridescent -> 'violet', 3
// golden -> 'gold', 4 copper, 5 mahogany, 6 red, 7 mat -> 'matt', 8 mocha ->
// 'chocolate', 0 or no second digit natural.
//
// INOA — ammonia-free permanent, oil-delivery system (ODS). Its defining trait
// vs Majirel is an exact 1:1 mix ratio; developer volume is auto-picked the
// same way as Majirel.
const inoaShades: Shade[] = [
  // level 1
  { code: "1", level: 1, tone: "natural" },
  // level 2
  { code: "2", level: 2, tone: "natural" },
  // Level 3
  { code: "3", level: 3, tone: "natural" },
  // Level 4
  { code: "4", level: 4, tone: "natural" },
  { code: "4.0", level: 4, tone: "natural" },
  { code: "4.3", level: 4, tone: "gold" },
  { code: "4.20", level: 4, tone: "violet" },
  { code: "4.35", level: 4, tone: "gold" },
  { code: "4.45", level: 4, tone: "copper" },
  { code: "4.56", level: 4, tone: "mahogany" },
  { code: "4.62", level: 4, tone: "mahogany" },
  { code: "4.15", level: 4, tone: "chocolate" },
  { code: "4.8", level: 4, tone: "pearl" },

  // Level 5
  { code: "5", level: 5, tone: "natural" },
  { code: "5.0", level: 5, tone: "natural" },
  { code: "5.1", level: 5, tone: "ash" },
  { code: "5.12", level: 5, tone: "ash", secondaryTone: "violet" },
  { code: "5.17", level: 5, tone: "ash", secondaryTone: "matt" },
  { code: "5.25", level: 5, tone: "violet", secondaryTone: "mahogany" },
  { code: "5.3", level: 5, tone: "gold" },
  { code: "5.35", level: 5, tone: "gold", secondaryTone: "mahogany" },
  { code: "5.4", level: 5, tone: "copper" },
  { code: "5.5", level: 5, tone: "mahogany" },
  { code: "5.6", level: 5, tone: "red" },
  { code: "5.62", level: 5, tone: "red", secondaryTone: "violet" },
  { code: "5.8", level: 5, tone: "pearl" },
  { code: "5.15", level: 5, tone: "ash", secondaryTone: "mahogany" },
  { code: "5.18", level: 5, tone: "ash", secondaryTone: "pearl" },
  { code: "5.32", level: 5, tone: "gold", secondaryTone: "violet" },


  // Level 6
  { code: "6.0", level: 6, tone: "natural" },
  { code: "6.1", level: 6, tone: "ash" },
  { code: "6.3", level: 6, tone: "gold" },
  { code: "6.34", level: 6, tone: "gold", secondaryTone: "copper" },
  { code: "6.35", level: 6, tone: "gold", secondaryTone: "mahogany" },
  { code: "6.40", level: 6, tone: "copper" },
  { code: "6.45", level: 6, tone: "copper", secondaryTone: "mahogany" },
  { code: "6.46", level: 6, tone: "copper", secondaryTone: "red" },
  { code: "6.66", level: 6, tone: "red", secondaryTone: "red" },
  { code: "6.8", level: 6, tone: "chocolate" },
  { code: "6.13", level: 6, tone: "ash", secondaryTone: "gold" },
  { code: "6.23", level: 6, tone: "matt", secondaryTone: "gold" },
  { code: "6.32", level: 6, tone: "gold", secondaryTone: "matt" },

  // Level 7
  { code: "7", level: 7, tone: "natural" },
  { code: "7.0", level: 7, tone: "natural" },
  { code: "7.1", level: 7, tone: "ash" },
  { code: "7.11", level: 7, tone: "ash", secondaryTone: "ash" },
  { code: "7.3", level: 7, tone: "gold" },
  { code: "7.34", level: 7, tone: "gold", secondaryTone: "copper" },
  { code: "7.35", level: 7, tone: "gold", secondaryTone: "mahogany" },
  { code: "7.4", level: 7, tone: "copper" },
  { code: "7.43", level: 7, tone: "copper", secondaryTone: "copper" },
  { code: "7.44", level: 7, tone: "copper", secondaryTone: "copper" },
  { code: "7.8", level: 7, tone: "chocolate" },
  { code: "7.13", level: 7, tone: "ash", secondaryTone: "gold" },
  { code: "7.18", level: 7, tone: "ash", secondaryTone: "chocolate" },
  { code: "7.31", level: 7, tone: "gold", secondaryTone: "ash" },
  { code: "7.23", level: 7, tone: "pearl", secondaryTone: "gold" },

  // Level 8
  { code: "8", level: 8, tone: "natural" },
  { code: "8.0", level: 8, tone: "natural" },
  { code: "8.1", level: 8, tone: "ash" },
  { code: "8.11", level: 8, tone: "ash", secondaryTone: "ash" },
  { code: "8.12", level: 8, tone: "ash", secondaryTone: "pearl" },
  { code: "8.21", level: 8, tone: "pearl", secondaryTone: "ash" },
  { code: "8.3", level: 8, tone: "gold" },
  { code: "8.34", level: 8, tone: "gold", secondaryTone: "copper" },
  { code: "8.13", level: 8, tone: "ash", secondaryTone: "gold" },
  { code: "8.23`", level: 8, tone: "pearl", secondaryTone: "gold" },
  { code: "8.31", level: 8, tone: "copper" },

  // Level 9
  { code: "9", level: 9, tone: "natural" },
  { code: "9.0", level: 9, tone: "natural" },
  { code: "9.1", level: 9, tone: "ash" },
  { code: "9.2", level: 9, tone: "pearl" },
  { code: "9.12", level: 9, tone: "ash", secondaryTone: "pearl" },
  { code: "9.3", level: 9, tone: "gold" },
  { code: "9.13", level: 9, tone: "ash", secondaryTone: "gold" },
  { code: "9.31", level: 9, tone: "ash", secondaryTone: "gold" },

  // Level 10
  { code: "10", level: 10, tone: "natural" },
  { code: "10.1", level: 10, tone: "ash" },
  { code: "10.11", level: 10, tone: "ash", secondaryTone: "ash" },
  { code: "10.12", level: 10, tone: "ash", secondaryTone: "pearl" },
  { code: "10.21", level: 10, tone: "pearl", secondaryTone: "ash" },
];

export const LOREAL_INOA_CHART: Shade[] = inoaShades.map(shade => ({
  ...shade,
  line: "inoa",
  fixedMixingRatio: { colorParts: 1, developerParts: 1 },
}));

// Dia Light — ammonia-free demi-permanent gloss, deposit-only (tone-on-tone,
// at most very slight lift/grey blending), so it skips the darkest levels.
// Mixes 1:1.5 by default, with a manual option for 1:2 (both real Dia Light
// dilutions, colorist's choice for a thinner/more fluid mix), and independently
// a developer choice of 6 vol (standard tone-on-tone gloss) or 10 vol
// (grey-blending option) — mirrors Color Touch's [6, 13] choice in wella.ts.
const diaLightShades: Shade[] = [
  // Level 4
  { code: "4", level: 4, tone: "natural" },

  // Level 5
  { code: "5.1", level: 5, tone: "ash" },
  { code: "5.07", level: 5, tone: "natural", secondaryTone: "ash" },
  { code: "5.31", level: 5, tone: "ash", secondaryTone: "gold" },
  { code: "5.66`", level: 5, tone: "ash", secondaryTone: "gold" },

  // Level 6
  { code: "6", level: 6, tone: "natural" },
  { code: "6.3", level: 6, tone: "gold" },
  { code: "6.34", level: 6, tone: "gold", secondaryTone: "copper" },
  { code: "6.45", level: 6, tone: "copper", secondaryTone: "mahogany" },
  { code: "6.46", level: 6, tone: "copper", secondaryTone: "red" },


  { code: "6.1", level: 6, tone: "ash" },
  { code: "6.11", level: 6, tone: "ash", secondaryTone: "ash" },
  { code: "6.13", level: 6, tone: "ash", secondaryTone: "gold" },
  { code: "6.23", level: 6, tone: "pearl", secondaryTone: "gold" },


  // Level 7
  { code: "7", level: 7, tone: "natural" },
  { code: "7.3", level: 7, tone: "gold" },
  { code: "7.43", level: 7, tone: "copper", secondaryTone: "gold" },
  { code: "7.40", level: 7, tone: "copper", secondaryTone: "copper" },
  { code: "7.01", level: 7, tone: "natural", secondaryTone: "ash" },
  { code: "7.12", level: 7, tone: "ash", secondaryTone: "pearl" },
  { code: "7.2", level: 7, tone: "matt" },
  { code: "7.13", level: 7, tone: "gold" },
  { code: "7.8", level: 7, tone: "chocolate" },
  { code: "7.31", level: 7, tone: "gold", secondaryTone: "ash" },

  // Level 8
  { code: "8", level: 8, tone: "natural" },
  { code: "8.3", level: 8, tone: "gold" },
  { code: "8.43", level: 8, tone: "copper", secondaryTone: "gold" },
  { code: "8.34", level: 8, tone: "gold", secondaryTone: "copper" },
  { code: "8.18", level: 8, tone: "ash", secondaryTone: "chocolate" },
  { code: "8.21", level: 8, tone: "pearl", secondaryTone: "ash" },
  { code: "8.23", level: 8, tone: "gold" },

  // Level 9
  { code: "9", level: 9, tone: "natural" },
  { code: "9.03", level: 9, tone: "natural", secondaryTone: "gold" },
  { code: "9.3", level: 9, tone: "gold" },
  { code: "9.1", level: 9, tone: "ash" },
  { code: "9.11", level: 9, tone: "ash" },
  { code: "9.01", level: 9, tone: "natural", secondaryTone: "ash" },
  { code: "9.18", level: 9, tone: "ash", secondaryTone: "chocolate" },
  { code: "9.2", level: 9, tone: "pearl" },
  { code: "9.21", level: 9, tone: "pearl", secondaryTone: "ash" },
  { code: "9.02", level: 9, tone: "natural", secondaryTone: "pearl" },
  { code: "9.12", level: 9, tone: "ash", secondaryTone: "pearl" },
  { code: "9.13", level: 9, tone: "ash", secondaryTone: "gold" },
  { code: "9.82", level: 9, tone: "chocolate", secondaryTone: "pearl" },
  { code: "9.31", level: 9, tone: "ash", secondaryTone: "gold" },

  // Level 10
  { code: "10.01", level: 10, tone: "natural", secondaryTone: "ash" },
  { code: "10.18", level: 10, tone: "ash", secondaryTone: "chocolate" },
  { code: "10.21", level: 10, tone: "pearl", secondaryTone: "ash" },
  { code: "10.22", level: 10, tone: "pearl", secondaryTone: "pearl" },
  { code: "10.2", level: 10, tone: "pearl" },
  { code: "10.02", level: 10, tone: "natural", secondaryTone: "pearl" },
  { code: "10.12", level: 10, tone: "pearl" },
  { code: "10.13", level: 10, tone: "pearl", secondaryTone: "gold" },
  { code: "10.23", level: 10, tone: "pearl" },
  { code: "10.82", level: 10, tone: "chocolate", secondaryTone: "pearl" },
  { code: "10.32", level: 10, tone: "gold", secondaryTone: "pearl" },
];

export const LOREAL_DIA_LIGHT_CHART: Shade[] = diaLightShades.map(shade => ({
  ...shade,
  line: "dia-light",
  fixedMixingRatio: { colorParts: 1, developerParts: 1.5 },
  mixingRatioChoices: [{ colorParts: 1, developerParts: 1.5 }, { colorParts: 1, developerParts: 2 }],
  developerVolumeChoices: [6, 10],
}));

// Dia Color — L'Oréal's alkaline (MEA), ammonia-free demi-permanent successor to Dia
// Richesse. Mixes fixed 1:1.5 with Diactivateur (no 1:2 option, unlike Dia Light/Dia
// Richesse before it). Diactivateur comes in 6, 9, or 15 vol; mapped onto the
// existing DeveloperVolume members 6/10/13 (9 vol ~2.7% rounds to 10 vol's 3%, 15
// vol's 4.5% rounds up to 13 vol — the strongest demi-range member, the same
// nearest-member convention Igora Vibrance/Redken Shades EQ use for their own
// developer strengths, not a literal percentage match). Sold in 60 ml tubes (vs.
// Dia Light/Dia Richesse's 50 g). Shade list transcribed from a search-indexed copy
// of cmhairandbeauty.co.uk's Dia Color 60ml listing (the live page itself returned
// HTTP 500 at transcription time).
const diaColorShades: Shade[] = [
  // Level 1
  { code: "1", level: 1, tone: "natural" },

  // Level 3
  { code: "3", level: 3, tone: "natural" },

  // Level 4
  { code: "4", level: 4, tone: "natural" },
  { code: "4.15", level: 4, tone: "ash", secondaryTone: "mahogany" },
  { code: "4.20", level: 4, tone: "violet", secondaryTone: "natural" },
  { code: "4.62", level: 4, tone: "red", secondaryTone: "violet" },

  // Level 5
  { code: "5", level: 5, tone: "natural" },
  { code: "5.1", level: 5, tone: "ash" },
  { code: "5.18", level: 5, tone: "ash", secondaryTone: "chocolate" },
  { code: "5.35", level: 5, tone: "gold", secondaryTone: "mahogany" },
  { code: "5.4", level: 5, tone: "copper" },
  { code: "5.5", level: 5, tone: "mahogany" },
  { code: "5.71", level: 5, tone: "matt", secondaryTone: "ash" },
  { code: "5.8", level: 5, tone: "chocolate" },

  // Level 6
  { code: "6", level: 6, tone: "natural" },
  { code: "6.1", level: 6, tone: "ash" },
  { code: "6.12", level: 6, tone: "ash", secondaryTone: "violet" },
  { code: "6.23", level: 6, tone: "violet", secondaryTone: "gold" },
  { code: "6.3", level: 6, tone: "gold" },
  { code: "6.60", level: 6, tone: "red", secondaryTone: "natural" },
  { code: "6.8", level: 6, tone: "chocolate" },
  { code: "6.84", level: 6, tone: "chocolate", secondaryTone: "copper" },

  // Level 7
  { code: "7.18", level: 7, tone: "ash", secondaryTone: "chocolate" },
  { code: "7.32", level: 7, tone: "gold", secondaryTone: "violet" },
  { code: "7.44", level: 7, tone: "copper" },
  { code: "7.8", level: 7, tone: "chocolate" },

  // Level 8
  { code: "8", level: 8, tone: "natural" },
  { code: "8.1", level: 8, tone: "ash" },
  { code: "8.13", level: 8, tone: "ash", secondaryTone: "gold" },
  { code: "8.2", level: 8, tone: "violet" },
  { code: "8.23", level: 8, tone: "violet", secondaryTone: "gold" },
  { code: "8.3", level: 8, tone: "gold" },
  { code: "8.31", level: 8, tone: "gold", secondaryTone: "ash" },
  { code: "8.34", level: 8, tone: "gold", secondaryTone: "copper" },
  { code: "8.43", level: 8, tone: "copper", secondaryTone: "gold" },
];

export const LOREAL_DIA_COLOR_CHART: Shade[] = diaColorShades.map(shade => ({
  ...shade,
  line: "dia-color",
  fixedMixingRatio: { colorParts: 1, developerParts: 1.5 },
  developerVolumeChoices: [6, 10, 13],
}));
