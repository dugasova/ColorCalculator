import type { Level } from "./levels";
import type { MixingRatio, Shade } from "./shades";
import { GENERIC_SHADE_CHART } from "./brands/generic";
import { WELLA_SHADE_CHART, WELLA_COLOR_TOUCH_CHART } from "./brands/wella";
import { LOREAL_MAJIREL_CHART, LOREAL_INOA_CHART, LOREAL_DIA_LIGHT_CHART, LOREAL_DIA_RICHESSE_CHART } from "./brands/loreal";
import { IGORA_ROYAL_CHART, IGORA_VIBRANCE_CHART } from "./brands/igora";
import { REDKEN_SHADES_EQ_CHART, REDKEN_CHROMATICS_CHART } from "./brands/redken";
import { getMixingRatio } from "./formula";

// A plain string, not a closed union: built-in ids ('generic' | 'wella' | 'loreal' | 'igora')
// plus whatever id an admin assigns a custom dye line (see `CustomBrandRecord`, ./paletteOverrides).
export type BrandId = string;

export interface Brand {
  id: BrandId;
  name: string;
  shades: Shade[];
  mixingRatio: (startLevel: Level, targetLevel: Level) => MixingRatio;
  // Rough estimated product cost per gram of mixed color, in whatever currency the
  // salon uses — a starting point for the service-pricing calculator, not a real
  // supplier price. Fully editable in the results panel.
  pricePerGram: number;
}

// Koleston Perfect mixes 1:1 with developer across the whole range. The "12"
// (Special Blonde) series is the one exception, mixing 1:2 — that override
// lives on the shade itself (see `fixedMixingRatio` in WELLA_SHADE_CHART),
// not here, since it applies to a subset of shades rather than the whole brand.
function wellaMixingRatio(): MixingRatio {
  return { colorParts: 1, developerParts: 1 };
}

// Igora Royal mixes 1:1 with developer standard (including the "10-" Ultra Blonde
// Highlifts series). The "12-" Special Blonde Highlifts series is the one exception,
// mixing 1:2 — like Koleston Perfect above, that override lives on the shade itself
// (see `fixedMixingRatio` in IGORA_ROYAL_CHART), not here.
function igoraMixingRatio(): MixingRatio {
  return { colorParts: 1, developerParts: 1 };
}

// Shades EQ Gloss mixes 1:1 with Shades EQ Processing Solution across the whole line,
// no exceptions — unlike Wella/Igora above, there's no Highlift-style sub-range that
// mixes differently, since Shades EQ never lifts (see brands/redken.ts).
function redkenMixingRatio(): MixingRatio {
  return { colorParts: 1, developerParts: 1 };
}

// The built-in brand catalog. Runtime admin edits (custom brands, added/discontinued
// shades) merge on top of this into the calculator-facing catalog -- see
// `buildBrandCatalog` in ./paletteOverrides.
export const BRANDS: Record<BrandId, Brand> = {
  generic: { id: "generic", name: "Generic", shades: GENERIC_SHADE_CHART, mixingRatio: getMixingRatio, pricePerGram: 0.10 },
  wella: { id: "wella", name: "Wella", shades: [...WELLA_SHADE_CHART, ...WELLA_COLOR_TOUCH_CHART], mixingRatio: wellaMixingRatio, pricePerGram: 0.18 },
  loreal: { id: "loreal", name: "L'Oréal", shades: [...LOREAL_MAJIREL_CHART, ...LOREAL_INOA_CHART, ...LOREAL_DIA_LIGHT_CHART, ...LOREAL_DIA_RICHESSE_CHART], mixingRatio: getMixingRatio, pricePerGram: 0.20 },
  igora: { id: "igora", name: "Igora", shades: [...IGORA_ROYAL_CHART, ...IGORA_VIBRANCE_CHART], mixingRatio: igoraMixingRatio, pricePerGram: 0.20 },
  redken: { id: "redken", name: "Redken", shades: [...REDKEN_SHADES_EQ_CHART, ...REDKEN_CHROMATICS_CHART], mixingRatio: redkenMixingRatio, pricePerGram: 0.20 },
};
