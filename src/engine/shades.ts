import { z } from "zod";
import type { DeveloperVolume, Level, LiftTable } from "./levels";

export type ToneFamily = "natural" | "ash" | "cendré" | "matt" | "gold" | "copper" | "red" | "violet" | "chocolate" | "pearl" | "slate-grey" | "mahogany" | "beige";

export interface MixingRatio {
  colorParts: number;
  developerParts: number;
}

export interface Shade {
  code: string;
  level: Level;
  tone: ToneFamily;
  line?: string
  secondaryTone?: ToneFamily;
  // The manufacturer's marketing name for this shade (e.g. "Brown Smoke"), distinct from
  // `code` (e.g. "06ABn"). Optional -- most brands in this catalog (Wella, L'Oréal, Igora)
  // are identified by colorists primarily by code, so their charts don't set it. Redken
  // Shades EQ is the first line where the name is load-bearing: colorists commonly refer
  // to shades by name as much as by code (see brands/redken.ts).
  name?: string;
  fixedMixingRatio?: MixingRatio
  minStartLevel?: Level
  developerLiftTable?: LiftTable
  developerVolumeChoices?: DeveloperVolume[]
  // Overrides the engine's default 3% (10 vol) "gentlest" developer pick for same-depth-
  // or-darker work with no significant gray to cover -- e.g. Wella Koleston Perfect's own
  // "4% Welloxon Perfect... 30-40 min without heat" alternative (see brands/wella.ts). No
  // effect once gray coverage reaches GRAY_LIGHT_THRESHOLD (the dedicated
  // GRAY_COVERAGE_MIN_DEVELOPER_VOLUME floor wins instead) or once any lift is needed (the
  // level-diff ladder already calls for 20+ vol by then).
  noLiftDeveloperVolume?: DeveloperVolume
  // Overrides getRecommendedProcessingMinutes' gray-percent-based default (30/45 min) with
  // a fixed value -- for shades whose manufacturer instructions call for a specific
  // processing window regardless of gray coverage, e.g. Wella Koleston Perfect Special
  // Blonde's "50-60 min without heat" (see brands/wella.ts), independent of this shade's
  // developerLiftTable/fixedMixingRatio overrides above.
  fixedProcessingMinutes?: number
  // Marks this shade as a deliberate maximum-lift tool rather than a fixed target tone --
  // e.g. Wella Koleston Perfect Special Blonde, routinely selected purely to lift as many
  // levels as a single process safely allows (no bleach needed), accepting whatever level
  // that turns out to be rather than requiring this shade's own nominal level exactly.
  // When set, calculateFullFormula (../formula.ts) falls back to this shade's own
  // developerLiftTable's strongest developer and reports the level actually reached
  // (FullFormula.achievedLevel) instead of refusing to compute a formula when the nominal
  // target exceeds what any developer can lift to in one process. Requires
  // developerLiftTable to be set too -- meaningless without a lift ceiling to fall back
  // within.
  acceptsPartialLift?: boolean
}

const mixingRatioSchema = z.object({
  colorParts: z.number(),
  developerParts: z.number(),
});

const levelSchema = z.number().int().min(1).max(12) as unknown as z.ZodType<Level>;
const developerVolumeSchema = z.union([
  z.literal(6), z.literal(10), z.literal(13), z.literal(20), z.literal(30), z.literal(40),
]) satisfies z.ZodType<DeveloperVolume>;
const toneFamilySchema = z.enum([
  "natural", "ash", "cendré", "matt", "gold", "copper", "red", "violet", "chocolate", "pearl", "slate-grey", "mahogany",
]) satisfies z.ZodType<ToneFamily>;

// Validates a Shade document read from Firestore (admin-added via PaletteAdminView -- see
// palette.ts's subscribeToPaletteOverrides). Deliberately excludes `developerLiftTable`: it's
// a function, Firestore can't store functions, so it's never legitimately present on a
// Firestore-sourced shade -- only hardcoded built-in shades (e.g. Wella's Special Blonde,
// see brands/wella.ts) set it in code.
export const shadeSchema: z.ZodType<Shade> = z.object({
  code: z.string(),
  level: levelSchema,
  tone: toneFamilySchema,
  line: z.string().optional(),
  secondaryTone: toneFamilySchema.optional(),
  name: z.string().optional(),
  fixedMixingRatio: mixingRatioSchema.optional(),
  minStartLevel: levelSchema.optional(),
  developerVolumeChoices: z.array(developerVolumeSchema).optional(),
  noLiftDeveloperVolume: developerVolumeSchema.optional(),
  fixedProcessingMinutes: z.number().optional(),
  acceptsPartialLift: z.boolean().optional(),
});

export const code = (level: Level, tone: ToneFamily) => `${level}.${toneId(tone)}`;
export const toneId = (tone: ToneFamily): number => {
  switch (tone) {
    case "natural": return 0;
    case "ash": return 1;
    case "matt": return 2;
    case "gold": return 3;
    case "copper": return 4;
    case "red": return 5;
    case "violet": return 6;
    case "chocolate": return 7;
    case "pearl": return 8;
    case "slate-grey": return 9;
    case "mahogany": return 10;
    case "cendré": return 11;
  }
};

// Shared dropdown label builder for every shade-picker field (ShadeField,
// AdditionalShadeField, BlendComponentField) -- was previously duplicated inline in all
// three, and silently couldn't show `name` since it didn't exist yet. Puts the code
// first (colorists searching by code expect it up front, and it's what the search box
// matches against) with the marketing name, if any, quoted right after it.
export function shadeLabel(shade: Shade): string {
  const namePart = shade.name !== undefined ? ` "${shade.name}"` : "";
  const tonePart = shade.secondaryTone !== undefined ? `${shade.tone}/${shade.secondaryTone}` : shade.tone;
  return `${shade.code}${namePart} ${tonePart}`;
}

// Two shades can stand in for each other in a blend (see `splitShadeBlend` in formula.ts)
// only if they share the level and mixing chemistry a formula was calculated for --
// otherwise the developer ratio/volume computed for one wouldn't hold for the blended
// total. Same level alone isn't enough: a handful of shades override their line's usual
// mixing ratio or developer choices for just that one shade (e.g. Wella's Special Blonde).
export function canBlendShades(a: Shade, b: Shade): boolean {
  return a.level === b.level
    && (a.line ?? null) === (b.line ?? null)
    && JSON.stringify(a.fixedMixingRatio ?? null) === JSON.stringify(b.fixedMixingRatio ?? null)
    && JSON.stringify(a.developerVolumeChoices ?? null) === JSON.stringify(b.developerVolumeChoices ?? null);
}

// Raw brand charts (see engine/brands/*) are transcribed grouped by tone family
// (natural, ash, gold, ...), which is the order a printed swatch book uses but reads as
// chaotic in a <select> -- e.g. Wella's chart lists 8/38 then 8/96, 8/97 before 8/34,
// 8/41. Sort by level, then by the reflect code with its level prefix stripped (so
// "6/91" and "4.15" both compare on "91"/"15"), giving every select a plain ascending
// numeric order regardless of how the source chart happened to be transcribed.
export function compareShadesForDisplay(a: Shade, b: Shade): number {
  if (a.level !== b.level) return a.level - b.level;
  const suffixA = a.code.replace(/^\d+[./]?/, "");
  const suffixB = b.code.replace(/^\d+[./]?/, "");
  return suffixA < suffixB ? -1 : suffixA > suffixB ? 1 : 0;
}

// Best-effort default pair for a substitute blend of `target` -- a shade whose tone
// matches just `target`'s primary reflect, and (only if `target` has one) a shade whose
// tone matches just its secondary reflect. E.g. target 7/17 (tone 'ash', secondaryTone
// 'chocolate') suggests 7/1 (pure 'ash') as the primary component and 7/7 (pure
// 'chocolate') as the secondary one. Either half is null if no matching pure-reflect
// shade exists in `candidates` -- the colorist then has to pick manually.
export function suggestBlendComponents(target: Shade, candidates: Shade[]): { primary: Shade | null; secondary: Shade | null } {
  const pureToneMatch = (tone: ToneFamily): Shade | null => candidates.find(s =>
    s.code !== target.code && s.tone === tone && s.secondaryTone === undefined && canBlendShades(target, s)
  ) ?? null;
  return {
    primary: pureToneMatch(target.tone),
    secondary: target.secondaryTone !== undefined ? pureToneMatch(target.secondaryTone) : null,
  };
}