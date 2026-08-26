import type { FormulaHistoryEntry } from "./history";
import { GRAY_LIGHT_THRESHOLD, GRAY_MEDIUM_THRESHOLD, GRAY_HEAVY_THRESHOLD } from "./engine/formula";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Default (no-history-yet) revisit interval by gray-coverage tier: heavier gray coverage
// means new growth becomes visibly mismatched sooner, so the recommended interval shortens
// as gray percent increases. Mirrors the tiers `getGrayCoverageStrategy` uses in formula.ts.
const DEFAULT_INTERVAL_DAYS_LIGHT = 42;    // < 30% gray: 6 weeks
const DEFAULT_INTERVAL_DAYS_MEDIUM = 35;   // 30-49%: 5 weeks
const DEFAULT_INTERVAL_DAYS_DOMINANT = 28; // 50-79%: 4 weeks
const DEFAULT_INTERVAL_DAYS_HEAVY = 21;    // >=80%: 3 weeks

export function getDefaultRevisitIntervalDays(grayPercent: number): number {
  if (grayPercent < GRAY_LIGHT_THRESHOLD) return DEFAULT_INTERVAL_DAYS_LIGHT;
  if (grayPercent < GRAY_MEDIUM_THRESHOLD) return DEFAULT_INTERVAL_DAYS_MEDIUM;
  if (grayPercent < GRAY_HEAVY_THRESHOLD) return DEFAULT_INTERVAL_DAYS_DOMINANT;
  return DEFAULT_INTERVAL_DAYS_HEAVY;
}

export interface ClientRevisitPlan {
  clientKey: string;       // normalized (trim + lowercase) grouping key
  clientName: string;      // display name, from the most recent visit
  lastVisitAt: Date;
  intervalDays: number;    // rounded to the nearest whole day
  intervalBasis: 'history' | 'default';
  recommendedDate: Date;
}

// Groups by normalized client name, skipping entries with no name (can't attribute) or no
// `appliedAt` (still pending server timestamp / malformed).
function groupByClient(entries: FormulaHistoryEntry[]): Map<string, FormulaHistoryEntry[]> {
  const groups = new Map<string, FormulaHistoryEntry[]>();
  for (const entry of entries) {
    const key = entry.clientName.trim().toLowerCase();
    if (key === '' || entry.appliedAt === null) continue;
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return groups;
}

// Bleach-only sessions have no gray-coverage step to read a percent from; falling back to
// 0% (the lightest tier, longest default interval) is the safe direction to be wrong in —
// it under-recommends a revisit rather than nagging a client who came in for a pure lift.
function getEntryGrayPercent(entry: FormulaHistoryEntry): number {
  const lastColorStep = [...entry.steps].reverse().find(step => step.kind === 'color');
  return lastColorStep?.grayPercent ?? 0;
}

function planForClient(clientEntries: FormulaHistoryEntry[]): ClientRevisitPlan {
  const visits = clientEntries
    .map(entry => ({ entry, date: entry.appliedAt!.toDate() }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const last = visits[visits.length - 1];

  let intervalDays: number;
  let intervalBasis: ClientRevisitPlan['intervalBasis'];
  if (visits.length >= 2) {
    let totalDays = 0;
    for (let i = 1; i < visits.length; i++) {
      totalDays += (visits[i].date.getTime() - visits[i - 1].date.getTime()) / MS_PER_DAY;
    }
    intervalDays = totalDays / (visits.length - 1);
    intervalBasis = 'history';
  } else {
    intervalDays = getDefaultRevisitIntervalDays(getEntryGrayPercent(last.entry));
    intervalBasis = 'default';
  }
  intervalDays = Math.round(intervalDays);

  return {
    clientKey: last.entry.clientName.trim().toLowerCase(),
    clientName: last.entry.clientName,
    lastVisitAt: last.date,
    intervalDays,
    intervalBasis,
    recommendedDate: new Date(last.date.getTime() + intervalDays * MS_PER_DAY),
  };
}

// Sorted ascending by recommended date (most overdue/soonest first). No cap — mirrors
// History's own unpaginated list.
export function planClientRevisits(entries: FormulaHistoryEntry[]): ClientRevisitPlan[] {
  return Array.from(groupByClient(entries).values())
    .map(planForClient)
    .sort((a, b) => a.recommendedDate.getTime() - b.recommendedDate.getTime());
}

export type RevisitStatus = 'overdue' | 'due-soon' | 'upcoming';
const DUE_SOON_WINDOW_DAYS = 7;

export function getRevisitStatus(recommendedDate: Date, now: Date): RevisitStatus {
  const daysUntil = (recommendedDate.getTime() - now.getTime()) / MS_PER_DAY;
  if (daysUntil <= 0) return 'overdue';
  if (daysUntil <= DUE_SOON_WINDOW_DAYS) return 'due-soon';
  return 'upcoming';
}
