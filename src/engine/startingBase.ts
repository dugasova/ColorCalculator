import type { ToneFamily } from "./shades";

// Purely descriptive record of what the colorist observed at a given zone before this
// step's service -- virgin/natural hair, or an already-colored base with its own
// reflect (e.g. a mid-lengths regrowth touch-up where the ends are still an old 8.34).
// Informational only: engine/formula.ts's own corrective-guidance math
// (deriveCorrectiveGuidance) derives `underlyingPigment` from the *achieved* level after
// lifting, not from what the colorist reports the current base looks like -- this field
// never feeds a calculation, only the saved record and formula text (see
// formatSession.ts) so a multi-zone session's history entry documents exactly what each
// zone started as, not just its numeric level.
export type StartingBase = { kind: "natural" } | { kind: "colored"; tone: ToneFamily };
