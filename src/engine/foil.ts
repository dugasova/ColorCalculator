// Which hair of a zone a step is applied to when the zone is worked in foils
// (highlights): one of the foiled sets of strands, or the hair left outside the foil.
// A step with no placement covers all hair of its zone.
//
// Two numbered sets, because one session can lift two sets differently (e.g. one to
// level 8, another to 10).
export type FoilGroup = "strands-1" | "strands-2" | "outside";

export const FOIL_GROUPS: FoilGroup[] = ["strands-1", "strands-2", "outside"];

// i18n key segment for each group -- `fields.foil.<segment>`.
export const FOIL_GROUP_I18N_KEY: Record<FoilGroup, string> = {
  "strands-1": "strands1",
  "strands-2": "strands2",
  outside: "outside",
};

export interface FoilPlacement {
  group: FoilGroup;
  // Roughly how much of the zone's hair this set of strands takes, as the colorist
  // estimates it. A note only: it never changes grams, developer or price. Null when not
  // entered, and always null for the hair outside the foil.
  percent: number | null;
}

export const FOIL_PERCENT_MIN = 1;
export const FOIL_PERCENT_MAX = 100;

export function isFoiledStrands(group: FoilGroup): boolean {
  return group !== "outside";
}

// A whole percentage within range, or null for anything that isn't a usable number.
export function normalizeFoilPercent(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.min(FOIL_PERCENT_MAX, Math.max(FOIL_PERCENT_MIN, Math.round(value)));
}
