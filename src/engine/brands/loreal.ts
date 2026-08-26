import type { Shade } from '../shades';

// Approximated from publicly documented L'Oréal Professionnel shade-numbering
// conventions (level.reflect dot notation, e.g. "6.34"), not transcribed
// byte-exact from an official chart. The reflect digit after the dot maps to
// `tone`; a second digit, if present, maps to `secondaryTone` (informational
// only — the calculation engine only reads `tone`). Digit->name reading used
// throughout this file: 0 natural, 1 cendré, 2 irisé, 3 doré, 4 cuivré,
// 5 acajou, 6 rouge/violine, 7 marron, 8 beige/perle, 9 cendré intense.
// ToneFamily has no 'cendré'/'irisé'/'doré'/'cuivré'/'acajou'/'rouge'/'marron'/
// 'beige'/'perle' entries, so those French reflect names are approximated onto
// the closest ToneFamily member: cendré -> 'ash', irisé -> 'matt' (or 'violet'
// as a secondary digit for a stronger/double irisé), doré -> 'gold',
// cuivré -> 'copper' (also covers vénitien), acajou -> 'mahogany',
// rouge/violine -> 'red' (or 'violet' for a double-violine intensifier),
// marron -> 'chocolate', beige/perle -> 'pearl', cendré intense -> 'slate-grey'.

// Majirel — permanent oxidation cream, L'Oréal's flagship line. Always mixes
// 1:1.5 with developer (never diff-based), and developer volume is picked by
// the shared lift-ladder logic, same as Koleston Perfect.
const majirelShades: Shade[] = [
    // Level 3
    { code: '3.0', level: 3, tone: 'natural' },
    { code: '3.1', level: 3, tone: 'ash' },
    { code: '3.3', level: 3, tone: 'gold' },
    { code: '3.5', level: 3, tone: 'mahogany' },
    { code: '3.7', level: 3, tone: 'chocolate' },

    // Level 4
    { code: '4.0', level: 4, tone: 'natural' },
    { code: '4.1', level: 4, tone: 'ash' },
    { code: '4.3', level: 4, tone: 'gold' },
    { code: '4.31', level: 4, tone: 'gold', secondaryTone: 'ash' },
    { code: '4.4', level: 4, tone: 'copper' },
    { code: '4.5', level: 4, tone: 'mahogany' },
    { code: '4.56', level: 4, tone: 'mahogany', secondaryTone: 'violet' },
    { code: '4.6', level: 4, tone: 'red' },
    { code: '4.7', level: 4, tone: 'chocolate' },
    { code: '4.75', level: 4, tone: 'chocolate', secondaryTone: 'mahogany' },
    { code: '4.8', level: 4, tone: 'pearl' },

    // Level 5
    { code: '5.0', level: 5, tone: 'natural' },
    { code: '5.1', level: 5, tone: 'ash' },
    { code: '5.3', level: 5, tone: 'gold' },
    { code: '5.35', level: 5, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '5.4', level: 5, tone: 'copper' },
    { code: '5.43', level: 5, tone: 'copper', secondaryTone: 'gold' },
    { code: '5.5', level: 5, tone: 'mahogany' },
    { code: '5.6', level: 5, tone: 'red' },
    { code: '5.62', level: 5, tone: 'red', secondaryTone: 'matt' },
    { code: '5.7', level: 5, tone: 'chocolate' },
    { code: '5.75', level: 5, tone: 'chocolate', secondaryTone: 'mahogany' },
    { code: '5.8', level: 5, tone: 'pearl' },

    // Level 6
    { code: '6.0', level: 6, tone: 'natural' },
    { code: '6.1', level: 6, tone: 'ash' },
    { code: '6.3', level: 6, tone: 'gold' },
    { code: '6.34', level: 6, tone: 'gold', secondaryTone: 'copper' },
    { code: '6.4', level: 6, tone: 'copper' },
    { code: '6.45', level: 6, tone: 'copper', secondaryTone: 'mahogany' },
    { code: '6.5', level: 6, tone: 'mahogany' },
    { code: '6.6', level: 6, tone: 'red' },
    { code: '6.66', level: 6, tone: 'red', secondaryTone: 'red' },
    { code: '6.7', level: 6, tone: 'chocolate' },
    { code: '6.8', level: 6, tone: 'pearl' },
    { code: '6.88', level: 6, tone: 'pearl', secondaryTone: 'pearl' },

    // Level 7
    { code: '7.0', level: 7, tone: 'natural' },
    { code: '7.01', level: 7, tone: 'natural', secondaryTone: 'ash' },
    { code: '7.1', level: 7, tone: 'ash' },
    { code: '7.2', level: 7, tone: 'matt' },
    { code: '7.26', level: 7, tone: 'matt', secondaryTone: 'violet' },
    { code: '7.3', level: 7, tone: 'gold' },
    { code: '7.31', level: 7, tone: 'gold', secondaryTone: 'ash' },
    { code: '7.4', level: 7, tone: 'copper' },
    { code: '7.43', level: 7, tone: 'copper', secondaryTone: 'gold' },
    { code: '7.5', level: 7, tone: 'mahogany' },
    { code: '7.6', level: 7, tone: 'red' },
    { code: '7.7', level: 7, tone: 'chocolate' },
    { code: '7.8', level: 7, tone: 'pearl' },
    { code: '7.81', level: 7, tone: 'pearl', secondaryTone: 'ash' },

    // Level 8
    { code: '8.0', level: 8, tone: 'natural' },
    { code: '8.1', level: 8, tone: 'ash' },
    { code: '8.2', level: 8, tone: 'matt' },
    { code: '8.26', level: 8, tone: 'matt', secondaryTone: 'violet' },
    { code: '8.3', level: 8, tone: 'gold' },
    { code: '8.31', level: 8, tone: 'gold', secondaryTone: 'ash' },
    { code: '8.4', level: 8, tone: 'copper' },
    { code: '8.5', level: 8, tone: 'mahogany' },
    { code: '8.6', level: 8, tone: 'red' },
    { code: '8.7', level: 8, tone: 'chocolate' },
    { code: '8.8', level: 8, tone: 'pearl' },
    { code: '8.81', level: 8, tone: 'pearl', secondaryTone: 'ash' },
    { code: '8.9', level: 8, tone: 'slate-grey' },

    // Level 9
    { code: '9.0', level: 9, tone: 'natural' },
    { code: '9.01', level: 9, tone: 'natural', secondaryTone: 'ash' },
    { code: '9.1', level: 9, tone: 'ash' },
    { code: '9.2', level: 9, tone: 'matt' },
    { code: '9.3', level: 9, tone: 'gold' },
    { code: '9.31', level: 9, tone: 'gold', secondaryTone: 'ash' },
    { code: '9.4', level: 9, tone: 'copper' },
    { code: '9.7', level: 9, tone: 'chocolate' },
    { code: '9.8', level: 9, tone: 'pearl' },
    { code: '9.81', level: 9, tone: 'pearl', secondaryTone: 'ash' },
    { code: '9.9', level: 9, tone: 'slate-grey' },

    // Level 10
    { code: '10.0', level: 10, tone: 'natural' },
    { code: '10.01', level: 10, tone: 'natural', secondaryTone: 'ash' },
    { code: '10.1', level: 10, tone: 'ash' },
    { code: '10.2', level: 10, tone: 'matt' },
    { code: '10.3', level: 10, tone: 'gold' },
    { code: '10.31', level: 10, tone: 'gold', secondaryTone: 'ash' },
    { code: '10.8', level: 10, tone: 'pearl' },
    { code: '10.81', level: 10, tone: 'pearl', secondaryTone: 'ash' },
    { code: '10.9', level: 10, tone: 'slate-grey' },
];

export const LOREAL_MAJIREL_CHART: Shade[] = majirelShades.map(shade => ({
    ...shade,
    line: 'majirel',
    fixedMixingRatio: { colorParts: 1, developerParts: 1.5 },
}));

// INOA — ammonia-free permanent, oil-delivery system (ODS). Its defining trait
// vs Majirel is an exact 1:1 mix ratio; developer volume is auto-picked the
// same way as Majirel.
const inoaShades: Shade[] = [
    // Level 3
    { code: '3.0', level: 3, tone: 'natural' },
    { code: '3.1', level: 3, tone: 'ash' },
    { code: '3.7', level: 3, tone: 'chocolate' },

    // Level 4
    { code: '4.0', level: 4, tone: 'natural' },
    { code: '4.1', level: 4, tone: 'ash' },
    { code: '4.3', level: 4, tone: 'gold' },
    { code: '4.4', level: 4, tone: 'copper' },
    { code: '4.5', level: 4, tone: 'mahogany' },
    { code: '4.7', level: 4, tone: 'chocolate' },
    { code: '4.8', level: 4, tone: 'pearl' },

    // Level 5
    { code: '5.0', level: 5, tone: 'natural' },
    { code: '5.01', level: 5, tone: 'natural', secondaryTone: 'ash' },
    { code: '5.1', level: 5, tone: 'ash' },
    { code: '5.3', level: 5, tone: 'gold' },
    { code: '5.35', level: 5, tone: 'gold', secondaryTone: 'mahogany' },
    { code: '5.4', level: 5, tone: 'copper' },
    { code: '5.5', level: 5, tone: 'mahogany' },
    { code: '5.6', level: 5, tone: 'red' },
    { code: '5.7', level: 5, tone: 'chocolate' },
    { code: '5.8', level: 5, tone: 'pearl' },

    // Level 6
    { code: '6.0', level: 6, tone: 'natural' },
    { code: '6.1', level: 6, tone: 'ash' },
    { code: '6.3', level: 6, tone: 'gold' },
    { code: '6.34', level: 6, tone: 'gold', secondaryTone: 'copper' },
    { code: '6.4', level: 6, tone: 'copper' },
    { code: '6.5', level: 6, tone: 'mahogany' },
    { code: '6.6', level: 6, tone: 'red' },
    { code: '6.7', level: 6, tone: 'chocolate' },
    { code: '6.8', level: 6, tone: 'pearl' },

    // Level 7
    { code: '7.0', level: 7, tone: 'natural' },
    { code: '7.1', level: 7, tone: 'ash' },
    { code: '7.13', level: 7, tone: 'ash', secondaryTone: 'gold' },
    { code: '7.2', level: 7, tone: 'matt' },
    { code: '7.3', level: 7, tone: 'gold' },
    { code: '7.31', level: 7, tone: 'gold', secondaryTone: 'ash' },
    { code: '7.4', level: 7, tone: 'copper' },
    { code: '7.5', level: 7, tone: 'mahogany' },
    { code: '7.7', level: 7, tone: 'chocolate' },
    { code: '7.8', level: 7, tone: 'pearl' },

    // Level 8
    { code: '8.0', level: 8, tone: 'natural' },
    { code: '8.1', level: 8, tone: 'ash' },
    { code: '8.13', level: 8, tone: 'ash', secondaryTone: 'gold' },
    { code: '8.2', level: 8, tone: 'matt' },
    { code: '8.3', level: 8, tone: 'gold' },
    { code: '8.31', level: 8, tone: 'gold', secondaryTone: 'ash' },
    { code: '8.4', level: 8, tone: 'copper' },
    { code: '8.5', level: 8, tone: 'mahogany' },
    { code: '8.7', level: 8, tone: 'chocolate' },
    { code: '8.8', level: 8, tone: 'pearl' },
    { code: '8.9', level: 8, tone: 'slate-grey' },

    // Level 9
    { code: '9.0', level: 9, tone: 'natural' },
    { code: '9.1', level: 9, tone: 'ash' },
    { code: '9.2', level: 9, tone: 'matt' },
    { code: '9.3', level: 9, tone: 'gold' },
    { code: '9.31', level: 9, tone: 'gold', secondaryTone: 'ash' },
    { code: '9.4', level: 9, tone: 'copper' },
    { code: '9.7', level: 9, tone: 'chocolate' },
    { code: '9.8', level: 9, tone: 'pearl' },
    { code: '9.9', level: 9, tone: 'slate-grey' },

    // Level 10
    { code: '10.0', level: 10, tone: 'natural' },
    { code: '10.1', level: 10, tone: 'ash' },
    { code: '10.2', level: 10, tone: 'matt' },
    { code: '10.3', level: 10, tone: 'gold' },
    { code: '10.8', level: 10, tone: 'pearl' },
    { code: '10.81', level: 10, tone: 'pearl', secondaryTone: 'ash' },
    { code: '10.9', level: 10, tone: 'slate-grey' },
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
    { code: '4.0', level: 4, tone: 'natural' },
    { code: '4.1', level: 4, tone: 'ash' },
    { code: '4.3', level: 4, tone: 'gold' },

    // Level 5
    { code: '5.0', level: 5, tone: 'natural' },
    { code: '5.1', level: 5, tone: 'ash' },
    { code: '5.3', level: 5, tone: 'gold' },
    { code: '5.4', level: 5, tone: 'copper' },
    { code: '5.5', level: 5, tone: 'mahogany' },
    { code: '5.7', level: 5, tone: 'chocolate' },

    // Level 6
    { code: '6.0', level: 6, tone: 'natural' },
    { code: '6.1', level: 6, tone: 'ash' },
    { code: '6.13', level: 6, tone: 'ash', secondaryTone: 'gold' },
    { code: '6.3', level: 6, tone: 'gold' },
    { code: '6.4', level: 6, tone: 'copper' },
    { code: '6.6', level: 6, tone: 'red' },
    { code: '6.7', level: 6, tone: 'chocolate' },
    { code: '6.8', level: 6, tone: 'pearl' },

    // Level 7
    { code: '7.0', level: 7, tone: 'natural' },
    { code: '7.1', level: 7, tone: 'ash' },
    { code: '7.11', level: 7, tone: 'ash', secondaryTone: 'ash' },
    { code: '7.2', level: 7, tone: 'matt' },
    { code: '7.3', level: 7, tone: 'gold' },
    { code: '7.31', level: 7, tone: 'gold', secondaryTone: 'ash' },
    { code: '7.4', level: 7, tone: 'copper' },
    { code: '7.8', level: 7, tone: 'pearl' },

    // Level 8
    { code: '8.0', level: 8, tone: 'natural' },
    { code: '8.1', level: 8, tone: 'ash' },
    { code: '8.11', level: 8, tone: 'ash', secondaryTone: 'ash' },
    { code: '8.2', level: 8, tone: 'matt' },
    { code: '8.3', level: 8, tone: 'gold' },
    { code: '8.31', level: 8, tone: 'gold', secondaryTone: 'ash' },
    { code: '8.4', level: 8, tone: 'copper' },
    { code: '8.8', level: 8, tone: 'pearl' },
    { code: '8.9', level: 8, tone: 'slate-grey' },

    // Level 9
    { code: '9.0', level: 9, tone: 'natural' },
    { code: '9.1', level: 9, tone: 'ash' },
    { code: '9.2', level: 9, tone: 'matt' },
    { code: '9.3', level: 9, tone: 'gold' },
    { code: '9.13', level: 9, tone: 'ash', secondaryTone: 'gold' },
    { code: '9.8', level: 9, tone: 'pearl' },
    { code: '9.9', level: 9, tone: 'slate-grey' },

    // Level 10
    { code: '10.0', level: 10, tone: 'natural' },
    { code: '10.1', level: 10, tone: 'ash' },
    { code: '10.2', level: 10, tone: 'matt' },
    { code: '10.21', level: 10, tone: 'matt', secondaryTone: 'ash' },
    { code: '10.3', level: 10, tone: 'gold' },
    { code: '10.8', level: 10, tone: 'pearl' },
    { code: '10.9', level: 10, tone: 'slate-grey' },
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
    // Level 4
    { code: '4.5', level: 4, tone: 'mahogany' },
    { code: '4.56', level: 4, tone: 'mahogany', secondaryTone: 'violet' },
    { code: '4.6', level: 4, tone: 'red' },

    // Level 5
    { code: '5.0', level: 5, tone: 'natural' },
    { code: '5.4', level: 5, tone: 'copper' },
    { code: '5.5', level: 5, tone: 'mahogany' },
    { code: '5.52', level: 5, tone: 'mahogany', secondaryTone: 'matt' },
    { code: '5.6', level: 5, tone: 'red' },
    { code: '5.66', level: 5, tone: 'red', secondaryTone: 'red' },

    // Level 6
    { code: '6.0', level: 6, tone: 'natural' },
    { code: '6.4', level: 6, tone: 'copper' },
    { code: '6.45', level: 6, tone: 'copper', secondaryTone: 'mahogany' },
    { code: '6.5', level: 6, tone: 'mahogany' },
    { code: '6.6', level: 6, tone: 'red' },
    { code: '6.66', level: 6, tone: 'red', secondaryTone: 'red' },
    { code: '6.7', level: 6, tone: 'chocolate' },

    // Level 7
    { code: '7.0', level: 7, tone: 'natural' },
    { code: '7.3', level: 7, tone: 'gold' },
    { code: '7.34', level: 7, tone: 'gold', secondaryTone: 'copper' },
    { code: '7.4', level: 7, tone: 'copper' },
    { code: '7.43', level: 7, tone: 'copper', secondaryTone: 'gold' },
    { code: '7.5', level: 7, tone: 'mahogany' },
    { code: '7.6', level: 7, tone: 'red' },
    { code: '7.7', level: 7, tone: 'chocolate' },

    // Level 8
    { code: '8.0', level: 8, tone: 'natural' },
    { code: '8.3', level: 8, tone: 'gold' },
    { code: '8.34', level: 8, tone: 'gold', secondaryTone: 'copper' },
    { code: '8.4', level: 8, tone: 'copper' },
    { code: '8.43', level: 8, tone: 'copper', secondaryTone: 'gold' },
    { code: '8.5', level: 8, tone: 'mahogany' },
    { code: '8.6', level: 8, tone: 'red' },
    { code: '8.7', level: 8, tone: 'chocolate' },
    { code: '8.8', level: 8, tone: 'pearl' },

    // Level 9
    { code: '9.0', level: 9, tone: 'natural' },
    { code: '9.3', level: 9, tone: 'gold' },
    { code: '9.4', level: 9, tone: 'copper' },
    { code: '9.5', level: 9, tone: 'mahogany' },
    { code: '9.7', level: 9, tone: 'chocolate' },
    { code: '9.8', level: 9, tone: 'pearl' },

    // Level 10
    { code: '10.0', level: 10, tone: 'natural' },
    { code: '10.3', level: 10, tone: 'gold' },
    { code: '10.4', level: 10, tone: 'copper' },
    { code: '10.8', level: 10, tone: 'pearl' },
    { code: '10.81', level: 10, tone: 'pearl', secondaryTone: 'ash' },
];

export const LOREAL_DIA_RICHESSE_CHART: Shade[] = diaRichesseShades.map(shade => ({
    ...shade,
    line: 'dia-richesse',
    fixedMixingRatio: { colorParts: 1, developerParts: 1.5 },
    developerVolumeChoices: [6, 10],
}));
