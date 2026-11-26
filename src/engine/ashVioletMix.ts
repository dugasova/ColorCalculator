import { MATRIX_SUPER_SYNC_CHART } from "./brands/matrix";
import type { Level } from "./levels";
import type { Shade } from "./shades";

// Matrix Super Sync: a pure ash shade (8A, 10A, 11A) on a light blonde is mixed with the
// violet shade of the same level rather than dosed a corrector by the Rule of 10 — the
// blue alone would turn the yellow background green (colorist, 2026-11-23; user's
// decision 2026-11-25 to apply it, first ratio by default). The dye splits between the
// two by the level's ratio, its total weight unchanged:
//  - 8 (dark yellow, an orange undertone left): A : V 2:1, or 1:1 (1:1 is the analogue of
//    a ready 8AV);
//  - 10 (pale yellow, no orange left): 1:2, or 1:3 — violet leads, A only for steel and
//    density;
//  - 11 (palest yellow): 1:3, or 1:4 — excess blue turns porous blonde greenish grey.
// SoColor has no V shade and uses its ready AV / P shades instead (see
// correctorProducts.ts); Super Sync has no 9A / 9V (on a 9 the colorist mixes 9NA + 10NV
// 1:1, offered as a Bleach toning hint only).
export interface AshVioletRatio {
  ashParts: number;
  violetParts: number;
}

export interface AshVioletMix {
  ashCode: string;
  violetCode: string;
  ratio: AshVioletRatio;
  // The colorist's two ratios for the level, the default first.
  choices: AshVioletRatio[];
}

const RATIOS_BY_LEVEL: Partial<Record<Level, AshVioletRatio[]>> = {
  8: [
    { ashParts: 2, violetParts: 1 },
    { ashParts: 1, violetParts: 1 },
  ],
  10: [
    { ashParts: 1, violetParts: 2 },
    { ashParts: 1, violetParts: 3 },
  ],
  11: [
    { ashParts: 1, violetParts: 3 },
    { ashParts: 1, violetParts: 4 },
  ],
};

export function sameAshVioletRatio(a: AshVioletRatio, b: AshVioletRatio): boolean {
  return a.ashParts === b.ashParts && a.violetParts === b.violetParts;
}

function hasSuperSyncShade(code: string): boolean {
  return MATRIX_SUPER_SYNC_CHART.some(shade => shade.code === code);
}

// The A + V mix for `shade`, or null when it takes none. `chosen` is the colorist's pick;
// one the level does not offer falls back to the default.
export function getAshVioletMix(
  shade: Pick<Shade, "code" | "level" | "tone" | "secondaryTone" | "line">,
  chosen?: AshVioletRatio | null,
): AshVioletMix | null {
  if (shade.line !== "super-sync" || shade.tone !== "ash" || shade.secondaryTone !== undefined) return null;
  const choices = RATIOS_BY_LEVEL[shade.level];
  if (choices === undefined) return null;
  const violetCode = `${shade.level}V`;
  if (!hasSuperSyncShade(violetCode)) return null;
  const ratio = (chosen != null ? choices.find(choice => sameAshVioletRatio(choice, chosen)) : undefined) ?? choices[0];
  return { ashCode: shade.code, violetCode, ratio, choices };
}

// Splits the ash shade's own grams between A and V, to 0.1 g, the two adding up to it.
export function splitAshViolet(grams: number, ratio: AshVioletRatio): { ashGrams: number; violetGrams: number } {
  const total = Math.round(grams * 10);
  const ash = Math.round((total * ratio.ashParts) / (ratio.ashParts + ratio.violetParts));
  return { ashGrams: ash / 10, violetGrams: (total - ash) / 10 };
}

export interface AshVioletToningHint {
  codes: [string, string];
  ratios: AshVioletRatio[];
}

// After powder, the Super Sync mix the colorist tones a lightened level with: A + V on
// 8, 10 and 11, and 9NA + 10NV 1:1 on a 9, where Super Sync has no 9A or 9V.
export function getAshVioletToningHint(line: string | null | undefined, level: Level): AshVioletToningHint | null {
  if (line !== "super-sync") return null;
  if (level === 9 && hasSuperSyncShade("9NA") && hasSuperSyncShade("10NV")) {
    return { codes: ["9NA", "10NV"], ratios: [{ ashParts: 1, violetParts: 1 }] };
  }
  const ash = MATRIX_SUPER_SYNC_CHART.find(
    shade => shade.level === level && shade.tone === "ash" && shade.secondaryTone === undefined,
  );
  if (ash === undefined) return null;
  const mix = getAshVioletMix(ash);
  return mix !== null ? { codes: [mix.ashCode, mix.violetCode], ratios: mix.choices } : null;
}
