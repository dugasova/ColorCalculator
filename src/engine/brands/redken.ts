import type { LiftTable } from '../levels';
import type { Shade } from '../shades';

// Transcribed from Redken Professional's Shades EQ Gloss shade chart
// (redkenpro.com, cross-checked against blendsor.com's chart converter and current
// reseller listings). Unlike Wella/L'Oréal/Igora's digit-based tone codes, Shades EQ
// codes are level + one or more UPPERCASE reflect letters, e.g. "06ABn" = level 6,
// "ABn" reflect -- plus an occasional trailing lowercase letter that's part of a named
// family rather than a generic depth modifier (see below). Colorists also commonly
// refer to shades by their marketing name (e.g. "Brown Smoke") as much as by code, so
// every shade here sets `name` -- the first brand in this catalog to use that field.
//
// Letter -> `ToneFamily` reading (first letter is the dominant/primary reflect, a
// second letter modifies it -- mirrors how `secondaryTone` already works for every
// other brand): N natural, A ash, G gold, C copper, R red, V violet, M matt (Redken
// calls it "Matte"), P pearl, T "Titanium" (a cool metallic ash -- no dedicated
// `ToneFamily`, approximated to `slate-grey`, the same family Wella's own cendré
// approximation already landed on for a cool blue-grey reflect), standalone B ("Blue",
// e.g. 01B Onyx / 09B Sterling) also approximated to `slate-grey`. `ToneFamily` has no
// dedicated `beige`/`brown` entry, so a second-letter B approximates to `gold` when the
// family name says "Beige" (NB "Natural Beige", GB "Gold Beige") or `chocolate` when it
// says "Brown" (RB "Red Brown", CB "Copper Brown") -- same beige/brown-to-gold/chocolate
// split already used for Igora's own "4 beige" digit. A repeated letter (AA, GG, CC, RR)
// means an intensified version of that family, encoded as tone === secondaryTone,
// mirroring Wella/Igora's own repeated-digit convention. "Ro" (VRo "Violet Rose") reads
// as a rose-violet blend -- violet primary, red secondary.
//
// The "ABn" family (e.g. "06ABn Brown Smoke") is Redken's own named exception: per
// Redken's "Cool Coverage" shade announcement, the trailing lowercase "n" isn't a
// generic depth suffix usable on any code -- it specifically distinguishes "ABn" (Ash
// Brown -- a blue/pearl-leaning reflect marketed for up to 100% gray coverage) from the
// separate "AB" family (Ash Blue -- a straight blue reflect for correcting orange).
// Encoded here as tone: 'ash', secondaryTone: 'chocolate' (matching the family's own
// "Ash Brown" name), distinct from AB's tone: 'ash', secondaryTone: 'slate-grey'.
//
// Mixing: Shades EQ is always 1:1 with Shades EQ Processing Solution (see
// `redkenMixingRatio` in brands.ts) -- there is no per-shade override, unlike Wella/
// Igora's level-12/10 Highlift exceptions, since Shades EQ never lifts. Processing
// Solution is a fixed ~2% peroxide acidic activator, not a graded oxidative developer --
// there's no real "choose your volume" the way Color Touch/Vibrance offer. It's
// represented here as a single-entry `developerVolumeChoices: [6]` (6vol being the
// closest existing `DeveloperVolume` to ~2%) purely so this line still routes through
// the engine's existing demi-permanent machinery (20-minute processing time, no-lift
// warning if a colorist tries to select it while lifting) -- the UI's volume picker
// will show exactly one option, which is honest to the real product (there IS only one
// strength) rather than implying a false choice.
//
// Deliberately excluded: the "010-" (level 10) sub-range (name/code pairs disagree
// across sources -- lower confidence than levels 1-9); Shades EQ Gloss Pastels (a
// separate fashion-tone sub-line applied only to pre-lightened hair, not part of the
// normal level+tone grid); Shades EQ Bonder Gloss (same codes/ratio/time as standard
// Shades EQ, just reformulated with bonding technology -- nothing for the catalog to
// represent differently); and "000 Crystal Clear" (a pigment-free dilution/shine base
// with no depth `level` of its own, same reasoning Igora's own 0-series concentrates
// and Clear were left out of brands/igora.ts).
const shadesEqShades: Shade[] = [
    // Level 1-2
    { code: '01B', level: 1, tone: 'slate-grey', name: 'Onyx' },
    { code: '02M', level: 2, tone: 'matt', name: 'Midnight Ash' },
    { code: '02ABn', level: 2, tone: 'ash', secondaryTone: 'chocolate', name: 'Cool Ebony' },

    // Level 3
    { code: '03N', level: 3, tone: 'natural', name: 'Espresso' },
    { code: '03NB', level: 3, tone: 'natural', secondaryTone: 'gold', name: 'Mocha Java' },
    { code: '03NW', level: 3, tone: 'natural', secondaryTone: 'copper', name: 'Cocoa Bean' },
    { code: '03A', level: 3, tone: 'ash', name: 'Terra Cotta' },
    { code: '03G', level: 3, tone: 'gold', name: 'Cinnamon' },
    { code: '03R', level: 3, tone: 'red', name: 'Roxy Red' },
    { code: '03RB', level: 3, tone: 'red', secondaryTone: 'chocolate', name: 'Mahogany' },
    { code: '03RV', level: 3, tone: 'red', secondaryTone: 'violet', name: 'Merlot' },
    { code: '03V', level: 3, tone: 'violet', name: 'Orchid' },

    // Level 4
    { code: '04N', level: 4, tone: 'natural', name: 'Chicory' },
    { code: '04NA', level: 4, tone: 'natural', secondaryTone: 'ash', name: 'Storm Cloud' },
    { code: '04NB', level: 4, tone: 'natural', secondaryTone: 'gold', name: 'Maple' },
    { code: '04CB', level: 4, tone: 'copper', secondaryTone: 'chocolate', name: 'Clove' },
    { code: '04M', level: 4, tone: 'matt', name: 'Smoked Cedar' },
    { code: '04RV', level: 4, tone: 'red', secondaryTone: 'violet', name: 'Cabernet' },
    { code: '04VRo', level: 4, tone: 'violet', secondaryTone: 'red', name: 'Violet Rose' },
    { code: '04WG', level: 4, tone: 'gold', secondaryTone: 'copper', name: 'Sun Tea' },
    { code: '04ABn', level: 4, tone: 'ash', secondaryTone: 'chocolate', name: 'Dark Roast' },

    // Level 5
    { code: '05N', level: 5, tone: 'natural', name: 'Walnut' },
    { code: '05NA', level: 5, tone: 'natural', secondaryTone: 'ash', name: 'Smoke' },
    { code: '05NW', level: 5, tone: 'natural', secondaryTone: 'copper', name: 'Macchiato' },
    { code: '05G', level: 5, tone: 'gold', name: 'Caramel' },
    { code: '05C', level: 5, tone: 'copper', name: 'Chili' },
    { code: '05CC', level: 5, tone: 'copper', secondaryTone: 'copper', name: 'Electric Shock' },
    { code: '05RB', level: 5, tone: 'red', secondaryTone: 'chocolate', name: 'Manzanita' },
    { code: '05RV', level: 5, tone: 'red', secondaryTone: 'violet', name: 'Sangria' },
    { code: '05V', level: 5, tone: 'violet', name: 'Cosmic Violet' },
    { code: '05CB', level: 5, tone: 'copper', secondaryTone: 'chocolate' },

    // Level 6
    { code: '06N', level: 6, tone: 'natural', name: 'Moroccan Sand' },
    { code: '06NA', level: 6, tone: 'natural', secondaryTone: 'ash', name: 'Granite' },
    { code: '06NB', level: 6, tone: 'natural', secondaryTone: 'gold', name: 'Brandy' },
    { code: '06G', level: 6, tone: 'gold', name: 'St. Tropez' },
    { code: '06GB', level: 6, tone: 'gold', secondaryTone: 'natural', name: 'Toffee' },
    { code: '06GG', level: 6, tone: 'gold', secondaryTone: 'gold', name: 'Midas Touch' },
    { code: '06GI', level: 6, tone: 'gold', secondaryTone: 'pearl', name: 'Tenerife' },
    { code: '06GN', level: 6, tone: 'gold', secondaryTone: 'natural', name: 'Moss' },
    { code: '06T', level: 6, tone: 'slate-grey', name: 'Iron' },
    { code: '06ABn', level: 6, tone: 'ash', secondaryTone: 'chocolate', name: 'Brown Smoke' },
    { code: '06VB', level: 6, tone: 'violet', secondaryTone: 'slate-grey', name: 'Violet Lagoon' },
    { code: '06VRo', level: 6, tone: 'violet', secondaryTone: 'red', name: 'Mauve Rose' },
    { code: '06WG', level: 6, tone: 'gold', secondaryTone: 'copper', name: 'Mango' },
    { code: '06AA', level: 6, tone: 'ash', secondaryTone: 'ash', name: 'Bonfire' },
    { code: '06CB', level: 6, tone: 'copper', secondaryTone: 'chocolate', name: 'Amber Glaze' },
    { code: '06CR', level: 6, tone: 'copper', secondaryTone: 'red', name: 'Sunset' },
    { code: '06R', level: 6, tone: 'red', name: 'Rocket Fire' },
    { code: '06RB', level: 6, tone: 'red', secondaryTone: 'chocolate', name: 'Cherry Cola' },
    { code: '06RR', level: 6, tone: 'red', secondaryTone: 'red', name: 'Blaze' },

    // Level 7
    { code: '07N', level: 7, tone: 'natural', name: 'Mirage' },
    { code: '07NA', level: 7, tone: 'natural', secondaryTone: 'ash', name: 'Pewter' },
    { code: '07NB', level: 7, tone: 'natural', secondaryTone: 'gold', name: 'Chestnut' },
    { code: '07NW', level: 7, tone: 'natural', secondaryTone: 'copper', name: 'Milk Tea' },
    { code: '07NCh', level: 7, tone: 'natural', secondaryTone: 'chocolate', name: 'Fondue' },
    { code: '07T', level: 7, tone: 'slate-grey', name: 'Steel' },
    { code: '07P', level: 7, tone: 'pearl', name: 'Mother of Pearl' },
    { code: '07VB', level: 7, tone: 'violet', secondaryTone: 'slate-grey', name: 'Violet Star' },
    { code: '07V', level: 7, tone: 'violet', name: 'Crushed Amethyst' },
    { code: '07AG', level: 7, tone: 'ash', secondaryTone: 'gold', name: 'Smokey Beige' },
    { code: '07G', level: 7, tone: 'gold', name: 'Saffron' },
    { code: '07GB', level: 7, tone: 'gold', secondaryTone: 'natural', name: 'Butterscotch' },
    { code: '07CB', level: 7, tone: 'copper', secondaryTone: 'chocolate', name: 'Spicestone' },
    { code: '07CC', level: 7, tone: 'copper', secondaryTone: 'copper', name: 'Urban Fever' },
    { code: '07C', level: 7, tone: 'copper', name: 'Curry' },
    { code: '07M', level: 7, tone: 'matt', name: 'Driftwood' },
    { code: '07RR', level: 7, tone: 'red', secondaryTone: 'red', name: 'Flame' },

    // Level 8
    { code: '08N', level: 8, tone: 'natural', name: 'Mojave' },
    { code: '08NA', level: 8, tone: 'natural', secondaryTone: 'ash', name: 'Volcanic' },
    { code: '08NP', level: 8, tone: 'natural', secondaryTone: 'pearl', name: 'Opal Shimmer' },
    { code: '08NV', level: 8, tone: 'natural', secondaryTone: 'violet', name: 'Lavender Jewel' },
    { code: '08T', level: 8, tone: 'slate-grey', name: 'Silver' },
    { code: '08VB', level: 8, tone: 'violet', secondaryTone: 'slate-grey', name: 'Violet Frost' },
    { code: '08V', level: 8, tone: 'violet', name: 'Iridescent Quartz' },
    { code: '08VG', level: 8, tone: 'violet', secondaryTone: 'gold', name: 'Gilded Taupe' },
    { code: '08VRo', level: 8, tone: 'violet', secondaryTone: 'red', name: 'Rose Quartz' },
    { code: '08GG', level: 8, tone: 'gold', secondaryTone: 'gold', name: 'Gold Dip' },
    { code: '08GI', level: 8, tone: 'gold', secondaryTone: 'pearl', name: 'St. Barths' },
    { code: '08GN', level: 8, tone: 'gold', secondaryTone: 'natural', name: 'Ivy' },
    { code: '08WG', level: 8, tone: 'gold', secondaryTone: 'copper', name: 'Golden Apricot' },
    { code: '08C', level: 8, tone: 'copper', name: 'Cayenne' },
    { code: '08CR', level: 8, tone: 'copper', secondaryTone: 'red', name: 'Sunrise' },

    // Level 9
    { code: '09N', level: 9, tone: 'natural', name: 'Café au Lait' },
    { code: '09NA', level: 9, tone: 'natural', secondaryTone: 'ash', name: 'Mist' },
    { code: '09NB', level: 9, tone: 'natural', secondaryTone: 'gold', name: 'Irish Crème' },
    { code: '09T', level: 9, tone: 'slate-grey', name: 'Chrome' },
    { code: '09B', level: 9, tone: 'slate-grey', name: 'Sterling' },
    { code: '09P', level: 9, tone: 'pearl', name: 'Opal Glow' },
    { code: '09G', level: 9, tone: 'gold', name: 'Vanilla Crème' },
    { code: '09GB', level: 9, tone: 'gold', secondaryTone: 'natural', name: 'Buttercream' },
    { code: '09VG', level: 9, tone: 'violet', secondaryTone: 'gold', name: 'Iridescence' },
    { code: '09AA', level: 9, tone: 'ash', secondaryTone: 'ash', name: 'Papaya' },
    { code: '09V', level: 9, tone: 'violet', name: 'Platinum Ice' },
    { code: '09VRo', level: 9, tone: 'violet', secondaryTone: 'red', name: 'Rosé' },
];

export const REDKEN_SHADES_EQ_CHART: Shade[] = shadesEqShades.map(shade => ({
    ...shade,
    line: 'shades-eq',
    developerVolumeChoices: [6],
}));

// Chromatics (Prismatic) -- Redken's ammonia-free PERMANENT oxidative color, in the
// same catalog as a second Redken line alongside the demi Shades EQ above but a
// fundamentally different chemistry (real lift, graded developer, longer processing --
// see LINE_PERMANENCE in shadeMatch.ts, which is why the two lines are kept separate
// under one brand rather than merged). Chromatics Ultra Rich (a richer-pigment,
// flatter-reflect formulation) and Chromatics Beyond Cover (pre-blended for 75%+ gray)
// share this exact same level+letter-code notation and codes -- they're the same
// catalog entries under a different formulation, not new shades, so they aren't
// modeled as separate entries here (same reasoning `formatBleach.ts`'s single chart
// covers every application style rather than branching per technique).
//
// Code format: LEVEL + two-letter reflect pair, no leading zero and no separator (e.g.
// "6RR", "10NA") -- distinct from Shades EQ's own zero-padded, longer-combo notation
// above ("06ABn"). Redken always writes the second letter lowercase in its own catalog
// styling (e.g. "6Rv", "8Aa") regardless of whether it's a distinct family or the same
// one repeated -- this is purely stylistic, not a meaningful signal, so it's not
// preserved in `code` here (written uppercase for consistency with every other line in
// this file). A repeated family (Aa, NN, RR) means intensified/doubled, not a blend --
// same convention as Shades EQ's own AA/GG/CC/RR and Igora's repeated-digit shades.
// Redken doesn't give Chromatics shades unique proper names the way Shades EQ does --
// instead each letter-family has a descriptive name (e.g. "Ash Gold") that functions as
// the shade's display name; that's what `name` holds here.
//
// Letter reading (Chromatics' own two-letter shorthand -- confirmed distinct from
// Shades EQ's letter conventions above despite sharing some individual letters): N
// natural, NN natural/natural (intensified), NW "Natural Warm" -> natural/copper, NA
// "Natural Ash" -> natural/ash, A/Ax "Ash" (the 'x' is a filler when there's no second
// letter, not a real reflect) -> ash, Ab "Ash Blue" -> ash/slate-grey (same blue
// approximation used for Igora's own AB and Shades EQ's VB/AB), Av "Ash Violet" ->
// ash/violet, Ag "Ash Green" -> ash/matt (green -> matt, same reading Igora's own
// digit-3 uses), Ago "Ash Gold" -> ash/gold, Aa "Ash/Ash" (intensified) -> ash/ash, Gi
// "Gold Iridescent" -> gold/pearl (iridescent -> pearl, same reading Shades EQ's own GI
// uses), WG "Warm Gold" -> gold/copper, CR "Copper Red" -> copper/red, RR "Red Red"
// (intensified) -> red/red, RV/Rv "Red Violet" -> red/violet, Br "Brown Red" ->
// chocolate/red (brown, no dedicated `ToneFamily`, approximates to chocolate -- same
// reading Shades EQ's own "Brown" second-letter codes use).
//
// Mixing: fixed 1:1 with Chromatics Oil-in-Cream Developer (`redkenMixingRatio` in
// brands.ts already covers this brand-wide -- no per-shade override needed, unlike
// Wella/Igora's Highlift exceptions). Chromatics' own Oil-in-Cream Developer line only
// goes up to 30 volume (10/20/30 -- there's no 40 volume product for this system,
// unlike the generic 10/20/30/40 the engine defaults to for every other permanent
// line), so every shade below sets `chromaticsLiftTable`, capping the engine's
// auto-picked developer at 30vol/2 levels of lift rather than fabricating a 40vol
// option Redken doesn't sell. No `developerVolumeChoices` here -- unlike the demi
// Shades EQ chart above, Chromatics genuinely lifts, so it goes through the same
// auto-picked-volume path as Wella Koleston Perfect/Igora Royal (30/45-minute
// permanent-color processing, not the demi 20-minute one) -- Redken's own official
// standard processing time for Chromatics is 35 minutes, in between those two, but the
// engine has no third processing-time tier and 35 is close enough to the existing
// 30-minute standard tier that introducing one would be a bigger change than this
// chart warrants on its own.
//
// Deliberately excluded: the "Clear" diluter shade (no depth `level` of its own, same
// reasoning Shades EQ's own Crystal Clear and Igora's 0-series concentrates were left
// out); levels 2 and below beyond the two confirmed naturals (Chromatics' working
// range is concentrated in levels 4-10, per Redken's own materials).
const chromaticsLiftTable: LiftTable = (volume) => {
    switch (volume) {
        case 10: return 0;
        case 20: return 1;
        case 30: return 2;
        default: return 0; // 6/13/40 -- not sold for this system, never reachable.
    }
};

const chromaticsShades: Shade[] = [
    // Level 1
    { code: '1N', level: 1, tone: 'natural', name: 'Natural' },
    { code: '1Ab', level: 1, tone: 'ash', secondaryTone: 'slate-grey', name: 'Ash Blue' },

    // Level 2
    { code: '2N', level: 2, tone: 'natural', name: 'Natural' },
    { code: '2NW', level: 2, tone: 'natural', secondaryTone: 'copper', name: 'Natural Warm' },

    // Level 3
    { code: '3N', level: 3, tone: 'natural', name: 'Natural' },
    { code: '3NN', level: 3, tone: 'natural', secondaryTone: 'natural', name: 'Natural/Natural' },
    { code: '3NW', level: 3, tone: 'natural', secondaryTone: 'copper', name: 'Natural Warm' },

    // Level 4
    { code: '4N', level: 4, tone: 'natural', name: 'Natural' },
    { code: '4NN', level: 4, tone: 'natural', secondaryTone: 'natural', name: 'Natural/Natural' },
    { code: '4Ax', level: 4, tone: 'ash', name: 'Ash' },
    { code: '4Ag', level: 4, tone: 'ash', secondaryTone: 'matt', name: 'Ash Green' },
    { code: '4NW', level: 4, tone: 'natural', secondaryTone: 'copper', name: 'Natural Warm' },
    { code: '4NA', level: 4, tone: 'natural', secondaryTone: 'ash', name: 'Natural Ash' },
    { code: '4RR', level: 4, tone: 'red', secondaryTone: 'red', name: 'Red Red' },
    { code: '4RV', level: 4, tone: 'red', secondaryTone: 'violet', name: 'Red Violet' },

    // Level 5
    { code: '5N', level: 5, tone: 'natural', name: 'Natural' },
    { code: '5NN', level: 5, tone: 'natural', secondaryTone: 'natural', name: 'Natural/Natural' },
    { code: '5Ax', level: 5, tone: 'ash', name: 'Ash' },
    { code: '5Ab', level: 5, tone: 'ash', secondaryTone: 'slate-grey', name: 'Ash Blue' },
    { code: '5Ago', level: 5, tone: 'ash', secondaryTone: 'gold', name: 'Ash Gold' },
    { code: '5NW', level: 5, tone: 'natural', secondaryTone: 'copper', name: 'Natural Warm' },
    { code: '5NA', level: 5, tone: 'natural', secondaryTone: 'ash', name: 'Natural Ash' },
    { code: '5Gi', level: 5, tone: 'gold', secondaryTone: 'pearl', name: 'Gold Iridescent' },
    { code: '5CR', level: 5, tone: 'copper', secondaryTone: 'red', name: 'Copper Red' },
    { code: '5RR', level: 5, tone: 'red', secondaryTone: 'red', name: 'Red Red' },
    { code: '5RV', level: 5, tone: 'red', secondaryTone: 'violet', name: 'Red Violet' },
    { code: '5Br', level: 5, tone: 'chocolate', secondaryTone: 'red', name: 'Brown Red' },

    // Level 6
    { code: '6N', level: 6, tone: 'natural', name: 'Natural' },
    { code: '6NN', level: 6, tone: 'natural', secondaryTone: 'natural', name: 'Natural/Natural' },
    { code: '6Ax', level: 6, tone: 'ash', name: 'Ash' },
    { code: '6Ab', level: 6, tone: 'ash', secondaryTone: 'slate-grey', name: 'Ash Blue' },
    { code: '6Ag', level: 6, tone: 'ash', secondaryTone: 'matt', name: 'Ash Green' },
    { code: '6Aa', level: 6, tone: 'ash', secondaryTone: 'ash', name: 'Ash/Ash' },
    { code: '6NA', level: 6, tone: 'natural', secondaryTone: 'ash', name: 'Natural Ash' },
    { code: '6Gi', level: 6, tone: 'gold', secondaryTone: 'pearl', name: 'Gold Iridescent' },
    { code: '6WG', level: 6, tone: 'gold', secondaryTone: 'copper', name: 'Warm Gold' },
    { code: '6CR', level: 6, tone: 'copper', secondaryTone: 'red', name: 'Copper Red' },
    { code: '6RR', level: 6, tone: 'red', secondaryTone: 'red', name: 'Red Red' },
    { code: '6Rv', level: 6, tone: 'red', secondaryTone: 'violet', name: 'Red Violet' },
    { code: '6Br', level: 6, tone: 'chocolate', secondaryTone: 'red', name: 'Brown Red' },

    // Level 7
    { code: '7N', level: 7, tone: 'natural', name: 'Natural' },
    { code: '7NN', level: 7, tone: 'natural', secondaryTone: 'natural', name: 'Natural/Natural' },
    { code: '7Ax', level: 7, tone: 'ash', name: 'Ash' },
    { code: '7Ab', level: 7, tone: 'ash', secondaryTone: 'slate-grey', name: 'Ash Blue' },
    { code: '7Ago', level: 7, tone: 'ash', secondaryTone: 'gold', name: 'Ash Gold' },
    { code: '7NW', level: 7, tone: 'natural', secondaryTone: 'copper', name: 'Natural Warm' },
    { code: '7NA', level: 7, tone: 'natural', secondaryTone: 'ash', name: 'Natural Ash' },
    { code: '7Gi', level: 7, tone: 'gold', secondaryTone: 'pearl', name: 'Gold Iridescent' },

    // Level 8
    { code: '8NN', level: 8, tone: 'natural', secondaryTone: 'natural', name: 'Natural/Natural' },
    { code: '8Ab', level: 8, tone: 'ash', secondaryTone: 'slate-grey', name: 'Ash Blue' },
    { code: '8Av', level: 8, tone: 'ash', secondaryTone: 'violet', name: 'Ash Violet' },
    { code: '8Ago', level: 8, tone: 'ash', secondaryTone: 'gold', name: 'Ash Gold' },
    { code: '8Aa', level: 8, tone: 'ash', secondaryTone: 'ash', name: 'Ash/Ash' },
    { code: '8NA', level: 8, tone: 'natural', secondaryTone: 'ash', name: 'Natural Ash' },
    { code: '8Gi', level: 8, tone: 'gold', secondaryTone: 'pearl', name: 'Gold Iridescent' },

    // Level 9
    { code: '9NN', level: 9, tone: 'natural', secondaryTone: 'natural', name: 'Natural/Natural' },
    { code: '9Ab', level: 9, tone: 'ash', secondaryTone: 'slate-grey', name: 'Ash Blue' },
    { code: '9Av', level: 9, tone: 'ash', secondaryTone: 'violet', name: 'Ash Violet' },
    { code: '9Ago', level: 9, tone: 'ash', secondaryTone: 'gold', name: 'Ash Gold' },
    { code: '9NW', level: 9, tone: 'natural', secondaryTone: 'copper', name: 'Natural Warm' },
    { code: '9NA', level: 9, tone: 'natural', secondaryTone: 'ash', name: 'Natural Ash' },
    { code: '9Gi', level: 9, tone: 'gold', secondaryTone: 'pearl', name: 'Gold Iridescent' },

    // Level 10
    { code: '10N', level: 10, tone: 'natural', name: 'Natural' },
    { code: '10NN', level: 10, tone: 'natural', secondaryTone: 'natural', name: 'Natural/Natural' },
    { code: '10Av', level: 10, tone: 'ash', secondaryTone: 'violet', name: 'Ash Violet' },
    { code: '10Ago', level: 10, tone: 'ash', secondaryTone: 'gold', name: 'Ash Gold' },
    { code: '10NW', level: 10, tone: 'natural', secondaryTone: 'copper', name: 'Natural Warm' },
    { code: '10NA', level: 10, tone: 'natural', secondaryTone: 'ash', name: 'Natural Ash' },
    { code: '10Gi', level: 10, tone: 'gold', secondaryTone: 'pearl', name: 'Gold Iridescent' },
];

export const REDKEN_CHROMATICS_CHART: Shade[] = chromaticsShades.map(shade => ({
    ...shade,
    line: 'chromatics',
    developerLiftTable: chromaticsLiftTable,
}));
