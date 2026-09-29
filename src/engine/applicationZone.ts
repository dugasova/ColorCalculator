export type ApplicationZone = "full-head" | "root-touch-up";

// Root touch-up (new-growth only) uses noticeably less product than a full-head
// application. These are just sensible starting points for the weight field —
// still fully editable afterward, same as every other default in this calculator.
export const APPLICATION_ZONE_DEFAULT_GRAMS: Record<ApplicationZone, number> = {
  "full-head": 80,
  "root-touch-up": 40,
};

// How a colorist enters the amount to mix: "total" is the combined color + developer
// weight (the historical default, split by the resolved ratio -- see
// calculateFormulaGrams); "color" is the dye weight alone (e.g. "40 g of color per root
// touch-up"), with developer derived from it instead (see
// calculateFormulaGramsFromColorGrams). Lets a colorist who needs more dye than the
// default just enter the amount they're actually using, in whichever unit they think in.
export type GramsInputMode = "total" | "color";

// Dye-only counterpart to APPLICATION_ZONE_DEFAULT_GRAMS above, for "color" input mode --
// also just a sensible, fully editable starting point.
export const APPLICATION_ZONE_DEFAULT_COLOR_GRAMS: Record<ApplicationZone, number> = {
  "full-head": 60,
  "root-touch-up": 40,
};

// Which unit each zone starts in: a root touch-up is measured as dye (40 g of color,
// developer derived from the ratio); a full head as a total mix weight.
export const APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE: Record<ApplicationZone, GramsInputMode> = {
  "full-head": "total",
  "root-touch-up": "color",
};
