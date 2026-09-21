export type StrandZone = "roots" | "mid-lengths" | "ends" | "full-head";

export const STRAND_ZONES: StrandZone[] = ["roots", "mid-lengths", "ends", "full-head"];

// i18n key segment for each zone -- `fields.strandZone.<segment>` (the field's Select
// option label) is reused verbatim by formatSession.ts's per-step recap line, so both the
// UI and the saved formula text always agree on the zone's display name.
export const STRAND_ZONE_I18N_KEY: Record<StrandZone, string> = {
  roots: "roots",
  "mid-lengths": "midLengths",
  ends: "ends",
  "full-head": "fullHead",
};
