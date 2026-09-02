import type { Shade } from '../shades';

// Transcribed from Schwarzkopf Professional's official Igora Royal numbering system
// (igora-royal.schwarzkopf-professional.com) and its Highlifts sub-range. Level-dash-tone
// notation, e.g. "6-88"; the first digit after the dash maps to `tone`, a second digit (if
// present) maps to `secondaryTone` (informational only — the calculation engine only reads
// `tone`). A repeated digit (e.g. "4-88") means an intensified version of that same tone,
// encoded here as tone === secondaryTone, mirroring Wella's own "9/00" convention.
//
// Digit->name reading of this chart: 0 natural, 1 cendré (a blue/violet ash), 2 ash (a
// separate, blue-based "ash/matt" reflect Schwarzkopf lists alongside cendré), 3 matt
// (green), 4 beige (a muted gold), 5 gold, 6 chocolate, 7 copper, 8 red, 9 violet.
// ToneFamily has no separate 'cendré' or "ash-matt" entry, so digits 1 and 2 both
// approximate to 'ash' (same precedent as Wella's cendré -> 'slate-grey' approximation,
// just landing on 'ash' here since that's the closer real family). ToneFamily also has no
// 'beige' entry, so digit 4 approximates to 'gold' (its own official description is "a
// muted gold tone").
//
// Levels 10 and 12 are the "Igora Royal Highlifts" sub-range (levels 1-9 are the base
// permanent line; Igora has no level-11 shades). Per Schwarzkopf's own spec: the 10-
// ("Ultra Blonde") series mixes at the brand's regular 1:1 ratio — no override needed
// below — while the 12- ("Special Blonde") series mixes at 1:2, encoded per-shade via
// `fixedMixingRatio` (same mechanism as Wella's own level-12 "Special Blonde" exception).
const igoraRoyalShades: Shade[] = [
    // Level 1
    { code: '1-0', level: 1, tone: 'natural' },
    { code: '1-1', level: 1, tone: 'ash' },

    // Level 2 (little official data available beyond the natural base)
    { code: '2-0', level: 2, tone: 'natural' },

    // Level 3
    { code: '3-0', level: 3, tone: 'natural' },
    { code: '3-22', level: 3, tone: 'ash', secondaryTone: 'ash' },
    { code: '3-19', level: 3, tone: 'ash', secondaryTone: 'violet' },
    { code: '3-65', level: 3, tone: 'chocolate', secondaryTone: 'gold' },
    { code: '3-68', level: 3, tone: 'chocolate', secondaryTone: 'red' },

    // Level 4
    { code: '4-0', level: 4, tone: 'natural' },
    { code: '4-33', level: 4, tone: 'matt', secondaryTone: 'matt' },
    { code: '4-6', level: 4, tone: 'chocolate' },
    { code: '4-46', level: 4, tone: 'gold', secondaryTone: 'chocolate' },
    { code: '4-63', level: 4, tone: 'chocolate', secondaryTone: 'matt' },
    { code: '4-68', level: 4, tone: 'chocolate', secondaryTone: 'red' },
    { code: '4-88', level: 4, tone: 'red', secondaryTone: 'red' },
    { code: '4-99', level: 4, tone: 'violet', secondaryTone: 'violet' },

    // Level 5
    { code: '5-0', level: 5, tone: 'natural' },
    { code: '5-00', level: 5, tone: 'natural', secondaryTone: 'natural' },
    { code: '5-1', level: 5, tone: 'ash' },
    { code: '5-13', level: 5, tone: 'ash', secondaryTone: 'matt' },
    { code: '5-16', level: 5, tone: 'ash', secondaryTone: 'chocolate' },
    { code: '5-21', level: 5, tone: 'ash', secondaryTone: 'ash' },
    { code: '5-5', level: 5, tone: 'gold' },
    { code: '5-57', level: 5, tone: 'gold', secondaryTone: 'copper' },
    { code: '5-7', level: 5, tone: 'copper' },
    { code: '5-88', level: 5, tone: 'red', secondaryTone: 'red' },
    { code: '5-99', level: 5, tone: 'violet', secondaryTone: 'violet' },
    { code: '5-6', level: 5, tone: 'chocolate' },
    { code: '5-63', level: 5, tone: 'chocolate', secondaryTone: 'matt' },
    { code: '5-65', level: 5, tone: 'chocolate', secondaryTone: 'gold' },
    { code: '5-68', level: 5, tone: 'chocolate', secondaryTone: 'red' },

    // Level 6
    { code: '6-0', level: 6, tone: 'natural' },
    { code: '6-00', level: 6, tone: 'natural', secondaryTone: 'natural' },
    { code: '6-1', level: 6, tone: 'ash' },
    { code: '6-12', level: 6, tone: 'ash', secondaryTone: 'ash' },
    { code: '6-16', level: 6, tone: 'ash', secondaryTone: 'chocolate' },
    { code: '6-23', level: 6, tone: 'ash', secondaryTone: 'matt' },
    { code: '6-31', level: 6, tone: 'matt', secondaryTone: 'ash' },
    { code: '6-5', level: 6, tone: 'gold' },
    { code: '6-77', level: 6, tone: 'copper', secondaryTone: 'copper' },
    { code: '6-88', level: 6, tone: 'red', secondaryTone: 'red' },
    { code: '6-99', level: 6, tone: 'violet', secondaryTone: 'violet' },
    { code: '6-6', level: 6, tone: 'chocolate' },
    { code: '6-63', level: 6, tone: 'chocolate', secondaryTone: 'matt' },
    { code: '6-65', level: 6, tone: 'chocolate', secondaryTone: 'gold' },
    { code: '6-68', level: 6, tone: 'chocolate', secondaryTone: 'red' },

    // Level 7
    { code: '7-0', level: 7, tone: 'natural' },
    { code: '7-00', level: 7, tone: 'natural', secondaryTone: 'natural' },
    { code: '7-1', level: 7, tone: 'ash' },
    { code: '7-13', level: 7, tone: 'ash', secondaryTone: 'matt' },
    { code: '7-57', level: 7, tone: 'gold', secondaryTone: 'copper' },
    { code: '7-77', level: 7, tone: 'copper', secondaryTone: 'copper' },
    { code: '7-88', level: 7, tone: 'red', secondaryTone: 'red' },

    // Level 8
    { code: '8-0', level: 8, tone: 'natural' },
    { code: '8-1', level: 8, tone: 'ash' },
    { code: '8-77', level: 8, tone: 'copper', secondaryTone: 'copper' },
    { code: '8-88', level: 8, tone: 'red', secondaryTone: 'red' },

    // Level 9
    { code: '9-0', level: 9, tone: 'natural' },
    { code: '9-11', level: 9, tone: 'ash', secondaryTone: 'ash' },
    { code: '9-19', level: 9, tone: 'ash', secondaryTone: 'violet' },
    { code: '9-5', level: 9, tone: 'gold' },
    { code: '9-98', level: 9, tone: 'violet', secondaryTone: 'red' },

    // Level 10 -- Highlifts "Ultra Blonde": regular 1:1 ratio, no override.
    { code: '10-0', level: 10, tone: 'natural' },
    { code: '10-1', level: 10, tone: 'ash' },
    { code: '10-14', level: 10, tone: 'ash', secondaryTone: 'gold' },
    { code: '10-19', level: 10, tone: 'ash', secondaryTone: 'violet' },
    { code: '10-21', level: 10, tone: 'ash', secondaryTone: 'ash' },
    { code: '10-4', level: 10, tone: 'gold' },
    { code: '10-46', level: 10, tone: 'gold', secondaryTone: 'chocolate' },
    { code: '10-49', level: 10, tone: 'gold', secondaryTone: 'violet' },

    // Level 12 -- Highlifts "Special Blonde": 1:2 ratio.
    { code: '12-0', level: 12, tone: 'natural', fixedMixingRatio: { colorParts: 1, developerParts: 2 } },
    { code: '12-1', level: 12, tone: 'ash', fixedMixingRatio: { colorParts: 1, developerParts: 2 } },
    { code: '12-11', level: 12, tone: 'ash', secondaryTone: 'ash', fixedMixingRatio: { colorParts: 1, developerParts: 2 } },
    { code: '12-19', level: 12, tone: 'ash', secondaryTone: 'violet', fixedMixingRatio: { colorParts: 1, developerParts: 2 } },
    { code: '12-2', level: 12, tone: 'ash', fixedMixingRatio: { colorParts: 1, developerParts: 2 } },
    { code: '12-21', level: 12, tone: 'ash', secondaryTone: 'ash', fixedMixingRatio: { colorParts: 1, developerParts: 2 } },
    { code: '12-4', level: 12, tone: 'gold', fixedMixingRatio: { colorParts: 1, developerParts: 2 } },
    { code: '12-46', level: 12, tone: 'gold', secondaryTone: 'chocolate', fixedMixingRatio: { colorParts: 1, developerParts: 2 } },
    { code: '12-49', level: 12, tone: 'gold', secondaryTone: 'violet', fixedMixingRatio: { colorParts: 1, developerParts: 2 } },
];

export const IGORA_ROYAL_CHART: Shade[] = igoraRoyalShades.map(shade => ({ ...shade, line: 'royal' }));

// Igora Vibrance -- Schwarzkopf's ammonia-free demi-permanent "toner" system: used to
// gloss/refresh/tone rather than lift, and (unlike Royal) applied for shorter,
// visually-checked processing rather than a fixed permanent-color window. It reuses
// Royal's exact level/tone numbering (same 0-9 digit meanings, see the file header) --
// Schwarzkopf designs the two lines to be directly cross-referenced, e.g. for a
// "Color Melt" root-to-end technique. Two Activator Lotion strengths are offered,
// 1.9% and 4% -- expressed here via `developerVolumeChoices` as their nearest
// close-system-developer equivalents, 6vol and 13vol, same convention as Wella Color
// Touch's own demi-permanent line. `developerVolumeChoices` presence is also what
// routes this line to the engine's 20-minute demi-permanent processing time instead of
// permanent color's 30/45 (see `getRecommendedProcessingMinutes`, src/engine/formula.ts).
//
// The requested "Toner" ratio -- a softer, sheer 1:2 mix with Activator Lotion,
// specifically called out for the Level 10 Toners sub-range -- is applied to the whole
// line via `fixedMixingRatio` below, mirroring how Wella Color Touch fixes one ratio
// for its whole demi-permanent chart rather than varying it per shade.
//
// Vibrance also sells standalone 0-xx "Concentrate" boosters and a 0-00 "Clear" gloss
// base -- both left out here, since neither has a real depth `level` (Shade.level is a
// required 1-12 value; a concentrate/clear is mixed into another shade, not selected as
// one) -- and the 9.5-level toners, left out because `Level` has no fractional values.
const igoraVibranceShades: Shade[] = [
    // Level 1
    { code: '1-0', level: 1, tone: 'natural' },

    // Level 3
    { code: '3-0', level: 3, tone: 'natural' },
    { code: '3-19', level: 3, tone: 'ash', secondaryTone: 'violet' },
    { code: '3-65', level: 3, tone: 'chocolate', secondaryTone: 'gold' },

    // Level 4
    { code: '4-0', level: 4, tone: 'natural' },
    { code: '4-00', level: 4, tone: 'natural', secondaryTone: 'natural' },
    { code: '4-13', level: 4, tone: 'ash', secondaryTone: 'matt' },
    { code: '4-33', level: 4, tone: 'matt', secondaryTone: 'matt' },
    { code: '4-46', level: 4, tone: 'gold', secondaryTone: 'chocolate' },
    { code: '4-6', level: 4, tone: 'chocolate' },
    { code: '4-68', level: 4, tone: 'chocolate', secondaryTone: 'red' },

    // Level 5
    { code: '5-0', level: 5, tone: 'natural' },
    { code: '5-00', level: 5, tone: 'natural', secondaryTone: 'natural' },
    { code: '5-1', level: 5, tone: 'ash' },
    { code: '5-16', level: 5, tone: 'ash', secondaryTone: 'chocolate' },
    { code: '5-21', level: 5, tone: 'ash', secondaryTone: 'ash' },
    { code: '5-4', level: 5, tone: 'gold' },
    { code: '5-5', level: 5, tone: 'gold' },
    { code: '5-57', level: 5, tone: 'gold', secondaryTone: 'copper' },
    { code: '5-65', level: 5, tone: 'chocolate', secondaryTone: 'gold' },
    { code: '5-67', level: 5, tone: 'chocolate', secondaryTone: 'copper' },
    { code: '5-7', level: 5, tone: 'copper' },
    { code: '5-88', level: 5, tone: 'red', secondaryTone: 'red' },

    // Level 6
    { code: '6-0', level: 6, tone: 'natural' },
    { code: '6-00', level: 6, tone: 'natural', secondaryTone: 'natural' },
    { code: '6-12', level: 6, tone: 'ash', secondaryTone: 'ash' },
    { code: '6-16', level: 6, tone: 'ash', secondaryTone: 'chocolate' },
    { code: '6-23', level: 6, tone: 'ash', secondaryTone: 'matt' },
    { code: '6-46', level: 6, tone: 'gold', secondaryTone: 'chocolate' },
    { code: '6-6', level: 6, tone: 'chocolate' },
    { code: '6-63', level: 6, tone: 'chocolate', secondaryTone: 'matt' },
    { code: '6-68', level: 6, tone: 'chocolate', secondaryTone: 'red' },
    { code: '6-78', level: 6, tone: 'copper', secondaryTone: 'red' },
    { code: '6-99', level: 6, tone: 'violet', secondaryTone: 'violet' },

    // Level 7
    { code: '7-0', level: 7, tone: 'natural' },
    { code: '7-00', level: 7, tone: 'natural', secondaryTone: 'natural' },
    { code: '7-1', level: 7, tone: 'ash' },
    { code: '7-21', level: 7, tone: 'ash', secondaryTone: 'ash' },
    { code: '7-24', level: 7, tone: 'ash', secondaryTone: 'gold' },
    { code: '7-4', level: 7, tone: 'gold' },
    { code: '7-42', level: 7, tone: 'gold', secondaryTone: 'ash' },
    { code: '7-48', level: 7, tone: 'gold', secondaryTone: 'red' },
    { code: '7-55', level: 7, tone: 'gold', secondaryTone: 'gold' },
    { code: '7-57', level: 7, tone: 'gold', secondaryTone: 'copper' },
    { code: '7-65', level: 7, tone: 'chocolate', secondaryTone: 'gold' },
    { code: '7-77', level: 7, tone: 'copper', secondaryTone: 'copper' },
    { code: '7-88', level: 7, tone: 'red', secondaryTone: 'red' },

    // Level 9
    { code: '9-0', level: 9, tone: 'natural' },
    { code: '9-00', level: 9, tone: 'natural', secondaryTone: 'natural' },
    { code: '9-1', level: 9, tone: 'ash' },
    { code: '9-12', level: 9, tone: 'ash', secondaryTone: 'ash' },
    { code: '9-24', level: 9, tone: 'ash', secondaryTone: 'gold' },
    { code: '9-4', level: 9, tone: 'gold' },
    { code: '9-42', level: 9, tone: 'gold', secondaryTone: 'ash' },
    { code: '9-55', level: 9, tone: 'gold', secondaryTone: 'gold' },
    { code: '9-57', level: 9, tone: 'gold', secondaryTone: 'copper' },
    { code: '9-65', level: 9, tone: 'chocolate', secondaryTone: 'gold' },
    { code: '9-7', level: 9, tone: 'copper' },

    // Level 10 -- the official "Igora Vibrance Level 10 Toners" sub-range.
    { code: '10-1', level: 10, tone: 'ash' },
    { code: '10-12', level: 10, tone: 'ash', secondaryTone: 'ash' },
    { code: '10-19', level: 10, tone: 'ash', secondaryTone: 'violet' },
    { code: '10-42', level: 10, tone: 'gold', secondaryTone: 'ash' },
    { code: '10-51', level: 10, tone: 'gold', secondaryTone: 'ash' },
    { code: '10-57', level: 10, tone: 'gold', secondaryTone: 'copper' },
    { code: '10-91', level: 10, tone: 'violet', secondaryTone: 'ash' },
];

export const IGORA_VIBRANCE_CHART: Shade[] = igoraVibranceShades.map(shade => ({
    ...shade,
    line: 'vibrance',
    fixedMixingRatio: { colorParts: 1, developerParts: 2 },
    developerVolumeChoices: [6, 13],
}));
