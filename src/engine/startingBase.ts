import { TONE_FAMILIES, type ToneFamily } from "./shades";

// A few compound/blended tone descriptions colorists actually use when describing a
// previously-colored base (e.g. old highlights that have grown warm/faded), which don't
// correspond to any single real product reflect -- so they're additions on top of
// ToneFamily here, not new ToneFamily members. Keeping them out of ToneFamily matters:
// that type also drives Shade.tone (a real product's own reflect, used throughout the
// formula engine's corrective-guidance logic) and every `switch (tone)` over it -- these
// five values only ever describe what a zone's *current* base looks like, never a real
// shade a colorist mixes.
export type StartingBaseTone = ToneFamily | "copper-gold" | "gold-copper" | "light-gold" | "light-copper" | "red-copper";

// Every StartingBaseTone value, in display order -- reused by StartingBaseField's tone
// picker. The gold/copper family is grouped as red, red-copper, copper, light-copper,
// copper-gold, gold-copper, gold, light-gold (colorist-requested order), interleaved
// into TONE_FAMILIES' own position for that family rather than appended at the end.
const GOLD_COPPER_FAMILY: StartingBaseTone[] = ["red", "red-copper", "copper", "light-copper", "copper-gold", "gold-copper", "gold", "light-gold"];
export const STARTING_BASE_TONES: StartingBaseTone[] = [
  ...TONE_FAMILIES.filter(tone => tone !== "gold" && tone !== "copper" && tone !== "red").flatMap(tone =>
    tone === "matt" ? [tone, ...GOLD_COPPER_FAMILY] : [tone]
  ),
];

// Purely descriptive record of what the colorist observed at a given zone before this
// step's service -- virgin/natural hair, or an already-colored base with its own
// reflect (e.g. a mid-lengths regrowth touch-up where the ends are still an old 8.34).
// Informational only: engine/formula.ts's own corrective-guidance math
// (deriveCorrectiveGuidance) derives `underlyingPigment` from the *achieved* level after
// lifting, not from what the colorist reports the current base looks like -- this field
// never feeds a calculation, only the saved record and formula text (see
// formatSession.ts) so a multi-zone session's history entry documents exactly what each
// zone started as, not just its numeric level.
export type StartingBase = { kind: "natural" } | { kind: "colored"; tone: StartingBaseTone };
