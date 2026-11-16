export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// Every valid depth level, ascending -- the level picker in every field/form that offers
// a plain "choose a level 1-12" dropdown (StartLevelField, AddShadeForm, and each
// standalone calculator's own level select) shares this instead of retyping the same
// literal array.
export const ALL_LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Warm pigment, from the darkest levels to the lightest. "red-orange" is red with some
// orange, "orange-red" the reverse; likewise "orange-yellow" and "yellow-orange".
export type UnderlyingPigment =
  | "red"
  | "red-orange"
  | "orange-red"
  | "orange"
  | "orange-yellow"
  | "yellow-orange"
  | "yellow"
  | "pale-yellow"
  | "very-light-yellow";
export type DeveloperVolume = 6 | 10 | 13 | 20 | 30 | 40;

// The warm background at a level: what lifting to that level reveals, and what hair
// colored down to that level has to be given back. The colorist's working table,
// confirmed 2026-11-16; neutralization (neutralize.ts) and pre-pigmentation
// (prePigmentation.ts) both read it.
export function getUnderlyingPigment(level: Level): UnderlyingPigment {
  if (level <= 3) return "red";
  switch (level) {
    case 4:
      return "red-orange";
    case 5:
      return "orange-red";
    case 6:
      return "orange";
    case 7:
      return "orange-yellow";
    case 8:
      return "yellow-orange";
    case 9:
      return "yellow";
    case 10:
      return "pale-yellow";
    default:
      return "very-light-yellow";
  }
}

export type LiftTable = (volume: DeveloperVolume) => number;

export function maxLiftForDeveloper(volume: DeveloperVolume): number {
  switch (volume) {
    case 6:
      return 0;
    case 10:
      return 0;
    case 13:
      return 0;
    case 20:
      return 1;
    case 30:
      return 2;
    case 40:
      return 3;
  }
}

export function canReachTarget(
  startLevel: Level,
  targetLevel: Level,
  volume: DeveloperVolume,
  liftTable: LiftTable = maxLiftForDeveloper,
): boolean {
  if (targetLevel <= startLevel) return true;
  return targetLevel - startLevel <= liftTable(volume);
}

// Every volume the DeveloperVolume union allows, ascending -- for UI that needs one row
// per developer a salon can stock (PaletteAdmin's stock list). Deliberately separate from
// the lift-ladder list above, which encodes cream-color lift capability, not inventory.
export const ALL_DEVELOPER_VOLUMES: DeveloperVolume[] = [6, 10, 13, 20, 30, 40];

// The actual peroxide strength printed on each developer's bottle, keyed by the nominal
// "vol" marketing number — not a flat `vol * 0.3`, which undershoots 13 vol (Wella
// Welloxon's 13 vol bottle is 4%, not 3.9%; see src/engine/wella.ts).
export const DEVELOPER_VOLUME_PERCENT: Record<DeveloperVolume, number> = { 6: 1.9, 10: 3, 13: 4, 20: 6, 30: 9, 40: 12 };
const ALL_VOLUMES: DeveloperVolume[] = [10, 20, 30, 40];

export function pickDeveloperVolume(
  startLevel: Level,
  targetLevel: Level,
  liftTable: LiftTable = maxLiftForDeveloper,
): DeveloperVolume | null {
  for (const volume of ALL_VOLUMES) {
    if (canReachTarget(startLevel, targetLevel, volume, liftTable)) return volume;
  }
  return null;
}

// The strongest developer actually capable of lifting under the given table - the
// best-effort fallback calculateFullFormula (formula.ts) reaches for when a shade accepts
// partial lift (Shade.acceptsPartialLift, shades.ts - e.g. Wella Special Blonde) and its
// nominal target exceeds what any single developer can reach in one process.
export function pickMaxLiftVolume(liftTable: LiftTable = maxLiftForDeveloper): DeveloperVolume {
  return ALL_VOLUMES.reduce((best, volume) => (liftTable(volume) > liftTable(best) ? volume : best), ALL_VOLUMES[0]);
}
