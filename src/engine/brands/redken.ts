import type { LiftTable } from "../levels";
import type { Shade } from "../shades";

// Shades EQ Gloss follows Redken's European chart (UK distributor Salon Services' A5
// booklet, checked 2026-11-23; 63 shades, levels 1–10), the range sold in Ukraine. It
// replaced a US transcription (redkenpro.com) with 37 shades the European chart lacks,
// such as 03V, 07V, 08V and the 02 / 03 fashion shades. Unlike Wella/L'Oréal/Igora's digit-based tone codes, Shades EQ
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
// strength) rather than implying a false choice. `developerPercentOverride: 2` below
// corrects the *displayed* percentage to match -- 6vol's generic table value (1.9%,
// DEVELOPER_VOLUME_PERCENT in levels.ts) is Wella/Igora/L'Oréal's genuine 6vol product
// label, not this one.
//
// Deliberately excluded: Shades EQ Gloss Pastels (a
// separate fashion-tone sub-line applied only to pre-lightened hair, not part of the
// normal level+tone grid); Shades EQ Bonder Gloss (same codes/ratio/time as standard
// Shades EQ, just reformulated with bonding technology -- nothing for the catalog to
// represent differently); and "000 Crystal Clear" (a pigment-free dilution/shine base
// with no depth `level` of its own, same reasoning Igora's own 0-series concentrates
// and Clear were left out of brands/igora.ts).
const shadesEqShades: Shade[] = [
  // Level 1-2
  { code: "01B", level: 1, tone: "slate-grey", name: "Onyx" },

  // Level 3
  { code: "03N", level: 3, tone: "natural", name: "Espresso" },

  // Level 4
  { code: "04NA", level: 4, tone: "natural", secondaryTone: "ash", name: "Storm Cloud" },
  { code: "04NB", level: 4, tone: "natural", secondaryTone: "gold", name: "Maple" },
  { code: "04M", level: 4, tone: "matt", name: "Smoked Cedar" },
  { code: "04RV", level: 4, tone: "red", secondaryTone: "violet", name: "Cabernet" },
  { code: "04WG", level: 4, tone: "gold", secondaryTone: "copper", name: "Sun Tea" },
  { code: "04ABn", level: 4, tone: "ash", secondaryTone: "chocolate", name: "Dark Roast" },

  // Level 5
  { code: "05N", level: 5, tone: "natural", name: "Walnut" },
  { code: "05G", level: 5, tone: "gold", name: "Caramel" },
  { code: "05C", level: 5, tone: "copper", name: "Chili" },
  { code: "05V", level: 5, tone: "violet", name: "Cosmic Violet" },
  { code: "05CB", level: 5, tone: "copper", secondaryTone: "chocolate" },

  // Level 6
  { code: "06N", level: 6, tone: "natural", name: "Moroccan Sand" },
  { code: "06NB", level: 6, tone: "natural", secondaryTone: "gold", name: "Brandy" },
  { code: "06G", level: 6, tone: "gold", name: "St. Tropez" },
  { code: "06GB", level: 6, tone: "gold", secondaryTone: "natural", name: "Toffee" },
  { code: "06T", level: 6, tone: "slate-grey", name: "Iron" },
  { code: "06ABn", level: 6, tone: "ash", secondaryTone: "chocolate", name: "Brown Smoke" },
  { code: "06VB", level: 6, tone: "violet", secondaryTone: "slate-grey", name: "Violet Lagoon" },
  { code: "06VRo", level: 6, tone: "violet", secondaryTone: "red", name: "Mauve Rose" },
  { code: "06WG", level: 6, tone: "gold", secondaryTone: "copper", name: "Mango" },
  { code: "06AA", level: 6, tone: "ash", secondaryTone: "ash", name: "Bonfire" },
  { code: "06CB", level: 6, tone: "copper", secondaryTone: "chocolate", name: "Amber Glaze" },
  { code: "06RR", level: 6, tone: "red", secondaryTone: "red", name: "Blaze" },

  // Level 7
  { code: "07N", level: 7, tone: "natural", name: "Mirage" },
  { code: "07NA", level: 7, tone: "natural", secondaryTone: "ash", name: "Pewter" },
  { code: "07NB", level: 7, tone: "natural", secondaryTone: "gold", name: "Chestnut" },
  { code: "07T", level: 7, tone: "slate-grey", name: "Steel" },
  { code: "07P", level: 7, tone: "pearl", name: "Mother of Pearl" },
  { code: "07VB", level: 7, tone: "violet", secondaryTone: "slate-grey", name: "Violet Star" },
  { code: "07G", level: 7, tone: "gold", name: "Saffron" },
  { code: "07GB", level: 7, tone: "gold", secondaryTone: "natural", name: "Butterscotch" },
  { code: "07C", level: 7, tone: "copper", name: "Curry" },
  { code: "07M", level: 7, tone: "matt", name: "Driftwood" },
  { code: "07RR", level: 7, tone: "red", secondaryTone: "red", name: "Flame" },

  // Level 8
  { code: "08N", level: 8, tone: "natural", name: "Mojave" },
  { code: "08NA", level: 8, tone: "natural", secondaryTone: "ash", name: "Volcanic" },
  { code: "08T", level: 8, tone: "slate-grey", name: "Silver" },
  { code: "08VB", level: 8, tone: "violet", secondaryTone: "slate-grey", name: "Violet Frost" },
  { code: "08VG", level: 8, tone: "violet", secondaryTone: "gold", name: "Gilded Taupe" },
  { code: "08VRo", level: 8, tone: "violet", secondaryTone: "red", name: "Rose Quartz" },
  { code: "08GG", level: 8, tone: "gold", secondaryTone: "gold", name: "Gold Dip" },
  { code: "08WG", level: 8, tone: "gold", secondaryTone: "copper", name: "Golden Apricot" },
  { code: "08C", level: 8, tone: "copper", name: "Cayenne" },

  // Level 9
  { code: "09N", level: 9, tone: "natural", name: "Café au Lait" },
  { code: "09NA", level: 9, tone: "natural", secondaryTone: "ash", name: "Mist" },
  { code: "09NB", level: 9, tone: "natural", secondaryTone: "gold", name: "Irish Crème" },
  { code: "09T", level: 9, tone: "slate-grey", name: "Chrome" },
  { code: "09B", level: 9, tone: "slate-grey", name: "Sterling" },
  { code: "09P", level: 9, tone: "pearl", name: "Opal Glow" },
  { code: "09G", level: 9, tone: "gold", name: "Vanilla Crème" },
  { code: "09GB", level: 9, tone: "gold", secondaryTone: "natural", name: "Buttercream" },
  { code: "09VG", level: 9, tone: "violet", secondaryTone: "gold", name: "Iridescence" },
  { code: "09AA", level: 9, tone: "ash", secondaryTone: "ash", name: "Papaya" },
  { code: "09V", level: 9, tone: "violet", name: "Platinum Ice" },
  { code: "09VRo", level: 9, tone: "violet", secondaryTone: "red", name: "Rosé" },

  // Level 10 (the European chart; names given only where confirmed)
  { code: "010VV", level: 10, tone: "violet", secondaryTone: "violet", name: "Lavender Ice" },
  { code: "010VG", level: 10, tone: "violet", secondaryTone: "gold" },
  { code: "010T", level: 10, tone: "slate-grey" },
  { code: "010P", level: 10, tone: "pearl" },
  { code: "010GI", level: 10, tone: "gold", secondaryTone: "pearl" },
  { code: "010N", level: 10, tone: "natural" },
];

export const REDKEN_SHADES_EQ_CHART: Shade[] = shadesEqShades.map(shade => ({
  ...shade,
  line: "shades-eq",
  developerVolumeChoices: [6],
  developerPercentOverride: 2,
}));

// Color Gels Oils -- Redken's ammonia-free permanent line that replaced Chromatics
// (colorist, 2026-11-18). The range follows the European market (user, 2026-11-25): no
// official European chart is public, so it is the set two EU retailers' shade lists
// agree on (cosmall.eu, pluricosmetica.com), plus 4N and 10NN, which one of them and
// Redken's US 2026 card both list, plus 2ABn, 6BR, 8P, 9NW and 10NW, which the colorist
// confirmed (2026-11-25; she has no 2NA), plus 5GCh and 7GCh (Gold Chocolate) from
// L'Oréal Partner Shop UK's list, the official European source (2026-11-25). That list
// lacks 4AB, 5NA and 7NCh; kept until the colorist says. Against the US card it adds the
// AB (ash blue), CR, WG, GI, GCh and more GB shades. Mixes 1:1 with Redken Pro-Oxide Cream Developer on every level
// (`redkenMixingRatio` in brands.ts), 10/20/30/40 vol. Lifts on a natural base up to 1
// level at 10 vol, 2 at 20, 3 at 30 and up to 4 at 40 (3+, as far as 4 on fine light
// bases). Processing follows the developer, not gray coverage, always without heat: 20
// min at 10 vol, 30 at 20, 40 at 30, 45 at 40. Every shade carries a balanced brown-beige
// base and covers gray in 30 min at 20 vol; on gray the manufacturer advises lifting no
// more than 2 levels. Letter reading (colorist's names): N natural, NN intense natural,
// NA natural ash, NCh natural chocolate, NW natural warm -> natural/gold (W "warm golden
// brown"), AV ash violet, ABn ash brown (same as Shades EQ's), P pearl, G gold, IG
// intense gold, GB gold brown, GI gold iridescent -> gold/pearl, CC intense copper, RR
// intense red, BR brown red, BC brown copper, RV red violet, MO mocha -> chocolate (6MO,
// 8MO), AB ash blue -> ash (Redken's Lacquers card names the AB family "Ash Blue"), CR
// copper red, WG warm gold -> gold/gold, GCh gold chocolate -> gold/chocolate. Shades
// without a confirmed marketing name have no `name`. Clear (the ammonia-free
// diluent) is left out: it has no level of its own. The line has no mixtones: its
// pigmented shades are already balanced against the lightening background and for 100%
// gray, so it takes no corrector (`selfNeutralizing`, colorist 2026-11-19).
const colorGelsOilsLiftTable: LiftTable = volume => {
  switch (volume) {
    case 10:
      return 1;
    case 20:
      return 2;
    case 30:
      return 3;
    case 40:
      return 4;
    default:
      return 0; // 6/13 vol -- not sold for this line.
  }
};

const colorGelsOilsShades: Shade[] = [
  // Level 1
  { code: "1NN", level: 1, tone: "natural", secondaryTone: "natural", name: "French Roast" },

  // Level 2
  { code: "2ABn", level: 2, tone: "ash", secondaryTone: "chocolate", name: "Cool Ebony" },

  // Level 3
  { code: "3NN", level: 3, tone: "natural", secondaryTone: "natural", name: "Black Coffee" },

  // Level 4
  { code: "4ABn", level: 4, tone: "ash", secondaryTone: "chocolate", name: "Dark Roast" },
  { code: "4NA", level: 4, tone: "natural", secondaryTone: "ash", name: "Storm Cloud" },
  { code: "4NCh", level: 4, tone: "natural", secondaryTone: "chocolate", name: "Dark Chocolate" },
  { code: "4NN", level: 4, tone: "natural", secondaryTone: "natural", name: "Coffee Ground" },
  { code: "4N", level: 4, tone: "natural", name: "Chicory" },
  { code: "4NW", level: 4, tone: "natural", secondaryTone: "gold", name: "Maple" },
  { code: "4BC", level: 4, tone: "chocolate", secondaryTone: "copper", name: "Allspice" },
  { code: "4AB", level: 4, tone: "ash" },

  // Level 5
  { code: "5NA", level: 5, tone: "natural", secondaryTone: "ash", name: "Smoke" },
  { code: "5NN", level: 5, tone: "natural", secondaryTone: "natural", name: "Café Mocha" },
  { code: "5N", level: 5, tone: "natural", name: "Walnut" },
  { code: "5BR", level: 5, tone: "chocolate", secondaryTone: "red", name: "Brownstone" },
  { code: "5CC", level: 5, tone: "copper", secondaryTone: "copper", name: "Electric Shock" },
  { code: "5RV", level: 5, tone: "red", secondaryTone: "violet", name: "Sangria" },
  { code: "5NW", level: 5, tone: "natural", secondaryTone: "gold" },
  { code: "5GB", level: 5, tone: "gold", secondaryTone: "chocolate" },
  { code: "5GCh", level: 5, tone: "gold", secondaryTone: "chocolate" },

  // Level 6
  { code: "6ABn", level: 6, tone: "ash", secondaryTone: "chocolate", name: "Brown Smoke" },
  { code: "6NA", level: 6, tone: "natural", secondaryTone: "ash", name: "Granite" },
  { code: "6NCh", level: 6, tone: "natural", secondaryTone: "chocolate", name: "Ganache" },
  { code: "6NN", level: 6, tone: "natural", secondaryTone: "natural", name: "Chocolate Mousse" },
  { code: "6N", level: 6, tone: "natural", name: "Moroccan Sand" },
  { code: "6NW", level: 6, tone: "natural", secondaryTone: "gold", name: "Brandy" },
  { code: "6BC", level: 6, tone: "chocolate", secondaryTone: "copper", name: "Sumac" },
  { code: "6MO", level: 6, tone: "chocolate", name: "Iced Coffee" },
  { code: "6IG", level: 6, tone: "gold", secondaryTone: "gold", name: "Vintage Gold" },
  { code: "6GI", level: 6, tone: "gold", secondaryTone: "pearl", name: "Tenerife" },
  { code: "6G", level: 6, tone: "gold", name: "St Tropez" },
  { code: "6RR", level: 6, tone: "red", secondaryTone: "red", name: "Blaze" },
  { code: "6AB", level: 6, tone: "ash" },
  { code: "6GB", level: 6, tone: "gold", secondaryTone: "chocolate" },
  { code: "6WG", level: 6, tone: "gold", secondaryTone: "gold" },
  { code: "6CR", level: 6, tone: "copper", secondaryTone: "red" },
  { code: "6BR", level: 6, tone: "chocolate", secondaryTone: "red", name: "Rusted Ruby" },

  // Level 7
  { code: "7NA", level: 7, tone: "natural", secondaryTone: "ash", name: "Pewter" },
  { code: "7NCh", level: 7, tone: "natural", secondaryTone: "chocolate", name: "Fondue" },
  { code: "7NN", level: 7, tone: "natural", secondaryTone: "natural", name: "Cocoa Powder" },
  { code: "7N", level: 7, tone: "natural", name: "Mirage" },
  { code: "7NW", level: 7, tone: "natural", secondaryTone: "gold", name: "Milk Tea" },
  { code: "7GB", level: 7, tone: "gold", secondaryTone: "chocolate", name: "Butterscotch" },
  { code: "7GCh", level: 7, tone: "gold", secondaryTone: "chocolate" },
  { code: "7CC", level: 7, tone: "copper", secondaryTone: "copper", name: "Urban Fever" },

  // Level 8
  { code: "8NA", level: 8, tone: "natural", secondaryTone: "ash", name: "Volcanic" },
  { code: "8NCh", level: 8, tone: "natural", secondaryTone: "chocolate", name: "Chocolate Soufflé" },
  { code: "8NN", level: 8, tone: "natural", secondaryTone: "natural", name: "Crème Brûlée" },
  { code: "8N", level: 8, tone: "natural", name: "Mojave" },
  { code: "8NW", level: 8, tone: "natural", secondaryTone: "gold", name: "Safari" },
  { code: "8MO", level: 8, tone: "chocolate", name: "Frosted Latte" },
  { code: "8IG", level: 8, tone: "gold", secondaryTone: "gold", name: "Gold Faithful" },
  { code: "8G", level: 8, tone: "gold", name: "Almond Sugar" },
  { code: "8AB", level: 8, tone: "ash" },
  { code: "8AV", level: 8, tone: "ash", secondaryTone: "violet" },
  { code: "8GI", level: 8, tone: "gold", secondaryTone: "pearl" },
  { code: "8WG", level: 8, tone: "gold", secondaryTone: "gold" },
  { code: "8CR", level: 8, tone: "copper", secondaryTone: "red" },
  { code: "8P", level: 8, tone: "pearl", name: "Misty Pearl" },

  // Level 9
  { code: "9NA", level: 9, tone: "natural", secondaryTone: "ash", name: "Mist" },
  { code: "9NCh", level: 9, tone: "natural", secondaryTone: "chocolate", name: "Chocolate Milk" },
  { code: "9NN", level: 9, tone: "natural", secondaryTone: "natural", name: "Cortado" },
  { code: "9N", level: 9, tone: "natural", name: "Café au Lait" },
  { code: "9GB", level: 9, tone: "gold", secondaryTone: "chocolate" },
  { code: "9BC", level: 9, tone: "chocolate", secondaryTone: "copper" },
  { code: "9NW", level: 9, tone: "natural", secondaryTone: "gold", name: "Cream Soda" },

  // Level 10
  { code: "10AV", level: 10, tone: "ash", secondaryTone: "violet", name: "Winter Morning" },
  { code: "10P", level: 10, tone: "pearl", name: "Ivory Pearl" },
  { code: "10NA", level: 10, tone: "natural", secondaryTone: "ash", name: "Marble" },
  { code: "10NN", level: 10, tone: "natural", secondaryTone: "natural", name: "Affogato" },
  { code: "10G", level: 10, tone: "gold", name: "Sheer Gold" },
  { code: "10IG", level: 10, tone: "gold", secondaryTone: "gold" },
  { code: "10NW", level: 10, tone: "natural", secondaryTone: "gold" },
];

export const REDKEN_COLOR_GELS_OILS_CHART: Shade[] = colorGelsOilsShades.map(shade => ({
  ...shade,
  line: "color-gels-oils",
  developerLiftTable: colorGelsOilsLiftTable,
  processingMinutesByVolume: { 10: 20, 20: 30, 30: 40, 40: 45 },
  maxGrayLift: 2,
  selfNeutralizing: true,
}));
