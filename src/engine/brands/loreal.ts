import type { Shade } from '../shades';

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
    { code: '1', level: 1, tone: 'natural' },

    // Level 2
    { code: '2', level: 2, tone: 'natural' },
    { code: '2.10', level: 2, tone: 'ash', secondaryTone: 'natural' },

    // Level 3
    { code: '3', level: 3, tone: 'natural' },

    // Level 4
    { code: '4', level: 4, tone: 'natural' },
    { code: '4.0', level: 4, tone: 'natural' },
    { code: '4.15', level: 4, tone: 'ash', secondaryTone: 'mahogany' },
    { code: '4.3', level: 4, tone: 'gold' },
    { code: '4.35', level: 4, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '4.45', level: 4, tone: 'copper', secondaryTone: 'mahogany' },
    { code: '4.56', level: 4, tone: 'mahogany', secondaryTone: 'red' },
    { code: '4.8', level: 4, tone: 'chocolate' },

    // Level 5
    { code: '5', level: 5, tone: 'natural' },
    { code: '5.0', level: 5, tone: 'natural' },
    { code: '5.1', level: 5, tone: 'ash' },
    { code: '5.12', level: 5, tone: 'ash', secondaryTone: 'violet' },
    { code: '5.3', level: 5, tone: 'gold' },
    { code: '5.32', level: 5, tone: 'gold', secondaryTone: 'violet' },
    { code: '5.35', level: 5, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '5.4', level: 5, tone: 'copper' },
    { code: '5.5', level: 5, tone: 'mahogany' },
    { code: '5.52', level: 5, tone: 'mahogany', secondaryTone: 'violet' },
    { code: '5.8', level: 5, tone: 'chocolate' },

    // Level 6
    { code: '6', level: 6, tone: 'natural' },
    { code: '6.0', level: 6, tone: 'natural' },
    { code: '6.1', level: 6, tone: 'ash' },
    { code: '6.11', level: 6, tone: 'ash', secondaryTone: 'ash' },
    { code: '6.13', level: 6, tone: 'ash', secondaryTone: 'gold' },
    { code: '6.23', level: 6, tone: 'violet', secondaryTone: 'gold' },
    { code: '6.3', level: 6, tone: 'gold' },
    { code: '6.32', level: 6, tone: 'gold', secondaryTone: 'violet' },
    { code: '6.34', level: 6, tone: 'gold', secondaryTone: 'copper' },
    { code: '6.35', level: 6, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '6.4', level: 6, tone: 'copper' },
    { code: '6.45', level: 6, tone: 'copper', secondaryTone: 'mahogany' },
    { code: '6.46', level: 6, tone: 'copper', secondaryTone: 'red' },
    { code: '6.5', level: 6, tone: 'mahogany' },
    { code: '6.8', level: 6, tone: 'chocolate' },

    // Level 7
    { code: '7', level: 7, tone: 'natural' },
    { code: '7.0', level: 7, tone: 'natural' },
    { code: '7.03', level: 7, tone: 'natural', secondaryTone: 'gold' },
    { code: '7.1', level: 7, tone: 'ash' },
    { code: '7.11', level: 7, tone: 'ash', secondaryTone: 'ash' },
    { code: '7.13', level: 7, tone: 'ash', secondaryTone: 'gold' },
    { code: '7.23', level: 7, tone: 'violet', secondaryTone: 'gold' },
    { code: '7.3', level: 7, tone: 'gold' },
    { code: '7.31', level: 7, tone: 'gold', secondaryTone: 'ash' },
    { code: '7.35', level: 7, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '7.4', level: 7, tone: 'copper' },
    { code: '7.43', level: 7, tone: 'copper', secondaryTone: 'gold' },
    { code: '7.44', level: 7, tone: 'copper', secondaryTone: 'copper' },
    { code: '7.8', level: 7, tone: 'chocolate' },

    // Level 8
    { code: '8', level: 8, tone: 'natural' },
    { code: '8.0', level: 8, tone: 'natural' },
    { code: '8.03', level: 8, tone: 'natural', secondaryTone: 'gold' },
    { code: '8.04', level: 8, tone: 'natural', secondaryTone: 'copper' },
    { code: '8.1', level: 8, tone: 'ash' },
    { code: '8.11', level: 8, tone: 'ash', secondaryTone: 'ash' },
    { code: '8.13', level: 8, tone: 'ash', secondaryTone: 'gold' },
    { code: '8.3', level: 8, tone: 'gold' },
    { code: '8.31', level: 8, tone: 'gold', secondaryTone: 'ash' },
    { code: '8.34', level: 8, tone: 'gold', secondaryTone: 'copper' },
    { code: '8.43', level: 8, tone: 'copper', secondaryTone: 'gold' },
    { code: '8.8', level: 8, tone: 'chocolate' },

    // Level 9
    { code: '9', level: 9, tone: 'natural' },
    { code: '9.0', level: 9, tone: 'natural' },
    { code: '9.1', level: 9, tone: 'ash' },
    { code: '9.13', level: 9, tone: 'ash', secondaryTone: 'gold' },
    { code: '9.22', level: 9, tone: 'violet', secondaryTone: 'violet' },
    { code: '9.3', level: 9, tone: 'gold' },
    { code: '9.31', level: 9, tone: 'gold', secondaryTone: 'ash' },

    // Level 10
    { code: '10', level: 10, tone: 'natural' },
    { code: '10.1', level: 10, tone: 'ash' },
    { code: '10.31', level: 10, tone: 'gold', secondaryTone: 'ash' },
];

export const LOREAL_MAJIREL_CHART: Shade[] = majirelShades.map(shade => ({
    ...shade,
    line: 'majirel',
    fixedMixingRatio: { colorParts: 1, developerParts: 1.5 },
}));

// INOA, Dia Light, and Dia Richesse below are still approximated from publicly
// documented L'Oréal Professionnel shade-numbering conventions, not transcribed
// byte-exact from an official chart (unlike Majirel above, which is). Digit->name
// reading used across these three lines: 0 natural, 1 cendré, 2 irisé, 3 doré,
// 4 cuivré, 5 acajou, 6 rouge/violine, 7 marron, 8 beige/perle, 9 cendré intense.
// ToneFamily has no 'cendré'/'irisé'/'doré'/'cuivré'/'acajou'/'rouge'/'marron'/
// 'beige'/'perle' entries, so those French reflect names are approximated onto
// the closest ToneFamily member: cendré -> 'ash', irisé -> 'matt' (or 'violet'
// as a secondary digit for a stronger/double irisé), doré -> 'gold',
// cuivré -> 'copper' (also covers vénitien), acajou -> 'mahogany',
// rouge/violine -> 'red' (or 'violet' for a double-violine intensifier),
// marron -> 'chocolate', beige/perle -> 'pearl', cendré intense -> 'slate-grey'.
//
// INOA — ammonia-free permanent, oil-delivery system (ODS). Its defining trait
// vs Majirel is an exact 1:1 mix ratio; developer volume is auto-picked the
// same way as Majirel.
const inoaShades: Shade[] = [
    // level 1
    { code: '1', level: 1, tone: 'natural' },
    // level 2
    { code: '2', level: 2, tone: 'natural' },
    // Level 3
    { code: '3', level: 3, tone: 'natural' },
    // Level 4
    { code: '4', level: 4, tone: 'natural' },
    { code: '4.0', level: 4, tone: 'natural' },
    { code: '4.3', level: 4, tone: 'gold' },
    { code: '4.20', level: 4, tone: 'violet' },
    { code: '4.35', level: 4, tone: 'gold' },
    { code: '4.45', level: 4, tone: 'copper' },
    { code: '4.56', level: 4, tone: 'mahogany' },
    { code: '4.62', level: 4, tone: 'mahogany' },
    { code: '4.15', level: 4, tone: 'chocolate' },
    { code: '4.8', level: 4, tone: 'pearl' },

    // Level 5
    { code: '5', level: 5, tone: 'natural' },
    { code: '5.0', level: 5, tone: 'natural' },
    { code: '5.1', level: 5, tone: 'ash' },
    { code: '5.12', level: 5, tone: 'ash', secondaryTone: 'violet' },
    { code: '5.17', level: 5, tone: 'ash', secondaryTone: 'matt' },
    { code: '5.25', level: 5, tone: 'violet', secondaryTone: 'mahogany' },
    { code: '5.3', level: 5, tone: 'gold' },
    { code: '5.35', level: 5, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '5.4', level: 5, tone: 'copper' },
    { code: '5.5', level: 5, tone: 'mahogany' },
    { code: '5.6', level: 5, tone: 'red' },
    { code: '5.62', level: 5, tone: 'red', secondaryTone: 'violet' },
    { code: '5.8', level: 5, tone: 'pearl' },
    { code: '5.15', level: 5, tone: 'ash', secondaryTone: 'mahogany' },
    { code: '5.18', level: 5, tone: 'ash', secondaryTone: 'pearl' },
    { code: '5.32', level: 5, tone: 'gold', secondaryTone: 'violet' },


    // Level 6
    { code: '6.0', level: 6, tone: 'natural' },
    { code: '6.1', level: 6, tone: 'ash' },
    { code: '6.3', level: 6, tone: 'gold' },
    { code: '6.34', level: 6, tone: 'gold', secondaryTone: 'copper' },
    { code: '6.35', level: 6, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '6.40', level: 6, tone: 'copper' },
    { code: '6.45', level: 6, tone: 'copper', secondaryTone: 'mahogany' },
    { code: '6.46', level: 6, tone: 'copper', secondaryTone: 'red' },
    { code: '6.66', level: 6, tone: 'red', secondaryTone: 'red' },
    { code: '6.8', level: 6, tone: 'chocolate' },
    { code: '6.13', level: 6, tone: 'ash', secondaryTone: 'gold' },
    { code: '6.23', level: 6, tone: 'matt', secondaryTone: 'gold' },
    { code: '6.32', level: 6, tone: 'gold', secondaryTone: 'matt' },

    // Level 7
    { code: '7', level: 7, tone: 'natural' },
    { code: '7.0', level: 7, tone: 'natural' },
    { code: '7.1', level: 7, tone: 'ash' },
    { code: '7.11', level: 7, tone: 'ash', secondaryTone: 'ash' },
    { code: '7.3', level: 7, tone: 'gold' },
    { code: '7.34', level: 7, tone: 'gold', secondaryTone: 'copper' },
    { code: '7.35', level: 7, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '7.4', level: 7, tone: 'copper' },
    { code: '7.43', level: 7, tone: 'copper', secondaryTone: 'copper' },
    { code: '7.44', level: 7, tone: 'copper', secondaryTone: 'copper' },
    { code: '7.8', level: 7, tone: 'chocolate' },
    { code: '7.13', level: 7, tone: 'ash', secondaryTone: 'gold' },
    { code: '7.18', level: 7, tone: 'ash', secondaryTone: 'chocolate' },
    { code: '7.31', level: 7, tone: 'gold', secondaryTone: 'ash' },
    { code: '7.23', level: 7, tone: 'pearl', secondaryTone: 'gold' },

    // Level 8
    { code: '8', level: 8, tone: 'natural' },
    { code: '8.0', level: 8, tone: 'natural' },
    { code: '8.1', level: 8, tone: 'ash' },
    { code: '8.11', level: 8, tone: 'ash', secondaryTone: 'ash' },
    { code: '8.12', level: 8, tone: 'ash', secondaryTone: 'pearl' },
    { code: '8.21', level: 8, tone: 'pearl', secondaryTone: 'ash' },
    { code: '8.3', level: 8, tone: 'gold' },
    { code: '8.34', level: 8, tone: 'gold', secondaryTone: 'copper' },
    { code: '8.13', level: 8, tone: 'ash', secondaryTone: 'gold' },
    { code: '8.23`', level: 8, tone: 'pearl', secondaryTone: 'gold' },
    { code: '8.31', level: 8, tone: 'copper' },

    // Level 9
    { code: '9', level: 9, tone: 'natural' },
    { code: '9.0', level: 9, tone: 'natural' },
    { code: '9.1', level: 9, tone: 'ash' },
    { code: '9.2', level: 9, tone: 'pearl' },
    { code: '9.12', level: 9, tone: 'ash', secondaryTone: 'pearl' },
    { code: '9.3', level: 9, tone: 'gold' },
    { code: '9.13', level: 9, tone: 'ash', secondaryTone: 'gold' },
    { code: '9.31', level: 9, tone: 'ash', secondaryTone: 'gold' },

    // Level 10
    { code: '10', level: 10, tone: 'natural' },
    { code: '10.1', level: 10, tone: 'ash' },
    { code: '10.11', level: 10, tone: 'ash', secondaryTone: 'ash' },
    { code: '10.12', level: 10, tone: 'ash', secondaryTone: 'pearl' },
    { code: '10.21', level: 10, tone: 'pearl', secondaryTone: 'ash' },
];

export const LOREAL_INOA_CHART: Shade[] = inoaShades.map(shade => ({
    ...shade,
    line: 'inoa',
    fixedMixingRatio: { colorParts: 1, developerParts: 1 },
}));

// Dia Light — ammonia-free demi-permanent gloss, deposit-only (tone-on-tone,
// at most very slight lift/grey blending), so it skips the darkest levels.
// Mixes 1:1.5 with a choice of 6 vol (standard tone-on-tone gloss) or 10 vol
// (grey-blending option) — mirrors Color Touch's [6, 13] choice in wella.ts.
const diaLightShades: Shade[] = [
    // Level 4
    { code: '4', level: 4, tone: 'natural' },

    // Level 5
    { code: '5.1', level: 5, tone: 'ash' },
    { code: '5.07', level: 5, tone: 'natural', secondaryTone: 'ash' },
    { code: '5.31', level: 5, tone: 'ash', secondaryTone: 'gold' },
    { code: '5.66`', level: 5, tone: 'ash', secondaryTone: 'gold' },

    // Level 6
    { code: '6', level: 6, tone: 'natural' },
    { code: '6.3', level: 6, tone: 'gold' },
    { code: '6.34', level: 6, tone: 'gold', secondaryTone: 'copper' },
    { code: '6.45', level: 6, tone: 'copper', secondaryTone: 'mahogany' },
    { code: '6.46', level: 6, tone: 'copper', secondaryTone: 'red' },


    { code: '6.1', level: 6, tone: 'ash' },
    { code: '6.11', level: 6, tone: 'ash', secondaryTone: 'ash' },
    { code: '6.13', level: 6, tone: 'ash', secondaryTone: 'gold' },
    { code: '6.23', level: 6, tone: 'pearl', secondaryTone: 'gold' },


    // Level 7
    { code: '7', level: 7, tone: 'natural' },
    { code: '7.3', level: 7, tone: 'gold' },
    { code: '7.43', level: 7, tone: 'copper', secondaryTone: 'gold' },
    { code: '7.40', level: 7, tone: 'copper', secondaryTone: 'copper' },
    { code: '7.01', level: 7, tone: 'natural', secondaryTone: 'ash' },
    { code: '7.12', level: 7, tone: 'ash', secondaryTone: 'pearl' },
    { code: '7.2', level: 7, tone: 'matt' },
    { code: '7.13', level: 7, tone: 'gold' },
    { code: '7.8', level: 7, tone: 'chocolate' },
    { code: '7.31', level: 7, tone: 'gold', secondaryTone: 'ash' },

    // Level 8
    { code: '8', level: 8, tone: 'natural' },
    { code: '8.3', level: 8, tone: 'gold' },
    { code: '8.43', level: 8, tone: 'copper', secondaryTone: 'gold' },
    { code: '8.34', level: 8, tone: 'gold', secondaryTone: 'copper' },
    { code: '8.18', level: 8, tone: 'ash', secondaryTone: 'chocolate' },
    { code: '8.21', level: 8, tone: 'pearl', secondaryTone: 'ash' },
    { code: '8.23', level: 8, tone: 'gold' },

    // Level 9
    { code: '9', level: 9, tone: 'natural' },
    { code: '9.03', level: 9, tone: 'natural', secondaryTone: 'gold' },
    { code: '9.3', level: 9, tone: 'gold' },
    { code: '9.1', level: 9, tone: 'ash' },
    { code: '9.11', level: 9, tone: 'ash' },
    { code: '9.01', level: 9, tone: 'natural', secondaryTone: 'ash' },
    { code: '9.18', level: 9, tone: 'ash', secondaryTone: 'chocolate' },
    { code: '9.2', level: 9, tone: 'pearl' },
    { code: '9.21', level: 9, tone: 'pearl', secondaryTone: 'ash' },
    { code: '9.02', level: 9, tone: 'natural', secondaryTone: 'pearl' },
    { code: '9.12', level: 9, tone: 'ash', secondaryTone: 'pearl' },
    { code: '9.13', level: 9, tone: 'ash', secondaryTone: 'gold' },
    { code: '9.82', level: 9, tone: 'chocolate', secondaryTone: 'pearl' },
    { code: '9.31', level: 9, tone: 'ash', secondaryTone: 'gold' },

    // Level 10
    { code: '10.01', level: 10, tone: 'natural', secondaryTone: 'ash' },
    { code: '10.18', level: 10, tone: 'ash', secondaryTone: 'chocolate' },
    { code: '10.21', level: 10, tone: 'pearl', secondaryTone: 'ash' },
    { code: '10.22', level: 10, tone: 'pearl', secondaryTone: 'pearl' },
    { code: '10.2', level: 10, tone: 'pearl' },
    { code: '10.02', level: 10, tone: 'natural', secondaryTone: 'pearl' },
    { code: '10.12', level: 10, tone: 'pearl' },
    { code: '10.13', level: 10, tone: 'pearl', secondaryTone: 'gold' },
    { code: '10.23', level: 10, tone: 'pearl' },
    { code: '10.82', level: 10, tone: 'chocolate', secondaryTone: 'pearl' },
    { code: '10.32', level: 10, tone: 'gold', secondaryTone: 'pearl' },
];

export const LOREAL_DIA_LIGHT_CHART: Shade[] = diaLightShades.map(shade => ({
    ...shade,
    line: 'dia-light',
    fixedMixingRatio: { colorParts: 1, developerParts: 1.5 },
    developerVolumeChoices: [6, 10],
}));

// Dia Richesse — Dia Light's richer, more opaque sibling gloss line, skewed
// toward deep/warm/red reflects (acajou/cuivré/rouge). Same mixing mechanics
// as Dia Light: 1:1.5 with a 6/10 vol choice.
const diaRichesseShades: Shade[] = [
    // Level 1
    { code: '1', level: 1, tone: 'natural' },
    // Level 2
    { code: '2.1', level: 2, tone: 'ash' },
    // Level 3
    { code: '3', level: 3, tone: 'natural' },
    { code: '3.00', level: 3, tone: 'natural' },
    // Level 4
    { code: '4', level: 4, tone: 'natural' },
    { code: '4.01', level: 4, tone: 'natural', secondaryTone: 'ash' },
    { code: '4.20', level: 4, tone: 'violet', secondaryTone: 'natural' },
    { code: '4.26', level: 4, tone: 'violet', secondaryTone: 'red' },
    { code: '4.15', level: 4, tone: 'mahogany' },
    { code: '4.3', level: 4, tone: 'gold', secondaryTone: 'natural' },
    { code: '4.62', level: 4, tone: 'red', secondaryTone: 'pearl' },

    // Level 5
    { code: '5', level: 5, tone: 'natural' },
    { code: '5.01', level: 5, tone: 'natural', secondaryTone: 'ash' },
    { code: '5.07', level: 5, tone: 'natural' },
    { code: '5.12', level: 5, tone: 'ash', secondaryTone: 'pearl' },
    { code: '5.13', level: 5, tone: 'ash', secondaryTone: 'gold' },
    { code: '5.15', level: 5, tone: 'ash', secondaryTone: 'mahogany' },
    { code: '5.8', level: 5, tone: 'chocolate' },
    { code: '5.31', level: 5, tone: 'gold', secondaryTone: 'ash' },
    { code: '5.32', level: 5, tone: 'gold', secondaryTone: 'chocolate' },
    { code: '5.35', level: 5, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '5.3', level: 5, tone: 'gold' },
    { code: '5.5', level: 5, tone: 'mahogany' },
    { code: '5.54', level: 5, tone: 'gold', secondaryTone: 'gold' },
    { code: '5.60', level: 5, tone: 'gold', secondaryTone: 'gold' },

    // Level 6
    { code: '6', level: 6, tone: 'natural' },
    { code: '6.3', level: 6, tone: 'gold' },
    { code: '6.01', level: 6, tone: 'natural', secondaryTone: 'ash' },
    { code: '6.12', level: 6, tone: 'ash', secondaryTone: 'pearl' },
    { code: '6.13', level: 6, tone: 'ash', secondaryTone: 'gold' },
    { code: '6.23', level: 6, tone: 'pearl', secondaryTone: 'gold' },
    { code: '6.8', level: 6, tone: 'chocolate' },
    { code: '6.31', level: 6, tone: 'gold', secondaryTone: 'ash' },
    { code: '6.32', level: 6, tone: 'gold', secondaryTone: 'chocolate' },
    { code: '6.35', level: 6, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '6.34', level: 6, tone: 'natural' },
    { code: '6.40', level: 6, tone: 'natural' },
    { code: '6.45', level: 6, tone: 'copper', secondaryTone: 'mahogany' },
    { code: '6.64', level: 6, tone: 'red', secondaryTone: 'red' },

    // Level 7
    { code: '7', level: 7, tone: 'natural' },
    { code: '7.01', level: 7, tone: 'natural', secondaryTone: 'ash' },
    { code: '7.13', level: 7, tone: 'ash', secondaryTone: 'gold' },
    { code: '7.14', level: 7, tone: 'ash', secondaryTone: 'copper' },
    { code: '7.8', level: 7, tone: 'chocolate' },
    { code: '7.30', level: 7, tone: 'gold', secondaryTone: 'natural' },
    { code: '7.40', level: 7, tone: 'copper' },
    { code: '7.43', level: 7, tone: 'copper', secondaryTone: 'gold' },
    { code: '7.31', level: 7, tone: 'gold', secondaryTone: 'ash' },
    { code: '7.35', level: 7, tone: 'gold', secondaryTone: 'ash' },
    { code: '7.34', level: 7, tone: 'gold', secondaryTone: 'copper' },

    // Level 8
    { code: '8', level: 8, tone: 'natural' },
    { code: '8.3', level: 8, tone: 'gold' },
    { code: '8.34', level: 8, tone: 'gold', secondaryTone: 'copper' },
    { code: '8.31', level: 8, tone: 'gold', secondaryTone: 'ash' },
    { code: '8.02', level: 8, tone: 'copper', secondaryTone: 'gold' },
    { code: '8.13', level: 8, tone: 'ash', secondaryTone: 'gold' },

    // Level 9
    { code: '9', level: 9, tone: 'natural' },
    { code: '9.3', level: 9, tone: 'gold' },
    { code: '9.31', level: 9, tone: 'ash', secondaryTone: 'gold' },
    { code: '9.01', level: 9, tone: 'natural', secondaryTone: 'ash' },
    { code: '9.11', level: 9, tone: 'ash' },
    { code: '9.02', level: 9, tone: 'natural', secondaryTone: 'pearl' },
    { code: '9.13', level: 9, tone: 'ash', secondaryTone: 'gold' },


    // Level 10
    { code: '10.31', level: 10, tone: 'ash', secondaryTone: 'ash' },
    { code: '10.3', level: 10, tone: 'gold' },
];

export const LOREAL_DIA_RICHESSE_CHART: Shade[] = diaRichesseShades.map(shade => ({
    ...shade,
    line: 'dia-richesse',
    fixedMixingRatio: { colorParts: 1, developerParts: 1.5 },
    developerVolumeChoices: [6, 10],
}));
