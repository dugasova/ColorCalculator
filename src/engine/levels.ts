export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type UnderlyingPigment = 'red' |
  'red-orange' |
  'orange' |
  'orange-yellow' |
  'yellow-orange' |
  'yellow' |
  'pale-yellow' |
  'very-light-yellow';
export type DeveloperVolume = 6 | 10 | 13 | 20 | 30 | 40;

export function getUnderlyingPigment(level: Level): UnderlyingPigment {
  switch (level) {
    case 1: return 'red';
    case 2: return 'red';
    case 3: return 'red-orange';
    case 4: return 'red-orange';
    case 5: return 'orange';
    case 6: return 'orange-yellow';
    case 7: return 'yellow-orange';
    case 8: return 'yellow';
    case 9: return 'pale-yellow';
    case 10: return 'pale-yellow';
    case 11: return 'very-light-yellow';
    case 12: return 'very-light-yellow';
  }
}

export type LiftTable = (volume: DeveloperVolume) => number;

export function maxLiftForDeveloper(volume: DeveloperVolume): number {
  switch (volume) {
    case 6: return 0;
    case 10: return 0;
    case 13: return 0;
    case 20: return 1;
    case 30: return 2;
    case 40: return 3;
  }
}

export function canReachTarget(
  startLevel: Level,
  targetLevel: Level,
  volume: DeveloperVolume,
  liftTable: LiftTable = maxLiftForDeveloper
): boolean {
  if (targetLevel <= startLevel) return true;
  return targetLevel - startLevel <= liftTable(volume);
}

const ALL_VOLUMES: DeveloperVolume[] = [10, 20, 30, 40];

export function pickDeveloperVolume(
  startLevel: Level,
  targetLevel: Level,
  liftTable: LiftTable = maxLiftForDeveloper
): DeveloperVolume | null {
  for (const volume of ALL_VOLUMES) {
    if (canReachTarget(startLevel, targetLevel, volume, liftTable)) return volume;
  }
  return null;
}
