import type { ColorHistoryStep, FormulaHistoryEntry, HistoryStep } from "./history";
import { GRAY_LIGHT_THRESHOLD, GRAY_MEDIUM_THRESHOLD, GRAY_HEAVY_THRESHOLD } from "./engine/formula";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Regrowth revisit interval by gray-coverage tier: heavier gray coverage means new
// growth becomes visibly mismatched sooner, so the recommended interval shortens as
// gray percent increases. Mirrors the tiers `getGrayCoverageStrategy` uses in formula.ts.
const REGROWTH_INTERVAL_DAYS_LIGHT = 42;    // < 30% gray: 6 weeks
const REGROWTH_INTERVAL_DAYS_MEDIUM = 35;   // 30-49%: 5 weeks
const REGROWTH_INTERVAL_DAYS_DOMINANT = 28; // 50-79%: 4 weeks
const REGROWTH_INTERVAL_DAYS_HEAVY = 21;    // >=80%: 3 weeks

export function getRegrowthIntervalDays(grayPercent: number): number {
  if (grayPercent < GRAY_LIGHT_THRESHOLD) return REGROWTH_INTERVAL_DAYS_LIGHT;
  if (grayPercent < GRAY_MEDIUM_THRESHOLD) return REGROWTH_INTERVAL_DAYS_MEDIUM;
  if (grayPercent < GRAY_HEAVY_THRESHOLD) return REGROWTH_INTERVAL_DAYS_DOMINANT;
  return REGROWTH_INTERVAL_DAYS_HEAVY;
}

// A revisit driver is one reason the client will need to come back, read off the last
// visit's actual service composition (see getRevisitDrivers). The earliest-due driver
// sets the recommended date; the rest describe services still further out.
export type RevisitDriverKind =
  | "multi-visit-filler"
  | "pigment-fade"
  | "regrowth"
  | "toner-refresh"
  | "partial-lightening";

export interface RevisitDriver {
  kind: RevisitDriverKind;
  intervalDays: number;
}

const TONER_REFRESH_INTERVAL_DAYS = 56;      // 8 weeks — gloss/toner on lifted lengths
const PARTIAL_LIGHTENING_INTERVAL_DAYS = 84; // 12 weeks — balayage/highlights grow out softly
const PIGMENT_FADE_INTERVAL_DAYS = 28;       // 4 weeks — filled/pre-pigmented deposit fades first
const MULTI_VISIT_FILLER_FALLBACK_DAYS = 14; // used only if a stored result predates multiVisitGapDays

// Fixed tie-break order for drivers sharing the same intervalDays, so getRevisitDrivers'
// output is deterministic.
const DRIVER_TIE_BREAK: RevisitDriverKind[] = [
  "multi-visit-filler", "pigment-fade", "regrowth", "toner-refresh", "partial-lightening",
];

// "roots", "full-head", and undefined (a plain FormulaCalculator save, or a step written
// before strandZone existed) all mean the new-growth area was serviced.
function touchesRootArea(step: HistoryStep): boolean {
  return step.strandZone !== "mid-lengths" && step.strandZone !== "ends";
}
function isLengthsOnly(step: HistoryStep): boolean {
  return step.strandZone === "mid-lengths" || step.strandZone === "ends";
}

export interface ClientRevisitPlan {
  clientKey: string;       // see getClientGroupKey -- real clientId, or a name-based fallback
  clientName: string;      // display name, from the most recent visit
  lastVisitAt: Date;
  intervalDays: number;    // rounded to the nearest whole day
  intervalBasis: "history" | "service";
  driver: RevisitDriverKind; // the earliest-due driver of the last visit
  drivers: RevisitDriver[];  // all of the last visit's drivers, ascending by intervalDays
  recommendedDate: Date;
}

// Client-identity normalization shared with analytics.ts (computeSalonAnalytics) and
// HistoryView -- two entries count as "the same client" iff their names match after
// trimming and lowercasing. Centralized so the three stay in lockstep; whitespace/casing
// is the only normalization applied deliberately -- a stricter rule (e.g. accent-folding)
// risks merging genuinely different clients who happen to share a base name.
export function normalizeClientKey(clientName: string): string {
  return clientName.trim().toLowerCase();
}

// The actual grouping key: an entry's real `clientId` (clients.ts) when it has one, since
// that's the one thing that can't collide between two different real people who happen to
// share a name -- normalizeClientKey alone would silently merge "their" history/revisit
// plan/retention count together. Falls back to the normalized name only for entries saved
// before clientId existed (or an explicitly unlinked "different person, same name" save) --
// `name:` prefixed so a legacy fallback key can never collide with a real Firestore id.
export function getClientGroupKey(entry: Pick<FormulaHistoryEntry, "clientId" | "clientName">): string {
  return entry.clientId ?? `name:${normalizeClientKey(entry.clientName)}`;
}

// Groups by client identity (see getClientGroupKey), skipping entries with no name (can't
// attribute) or no `appliedAt` (still pending server timestamp / malformed).
function groupByClient(entries: FormulaHistoryEntry[]): Map<string, FormulaHistoryEntry[]> {
  const groups = new Map<string, FormulaHistoryEntry[]>();
  for (const entry of entries) {
    if (normalizeClientKey(entry.clientName) === "" || entry.appliedAt === null) continue;
    const key = getClientGroupKey(entry);
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
  const lastColorStep = [...entry.steps].reverse().find(step => step.kind === "color");
  return lastColorStep?.grayPercent ?? 0;
}

// Walks entry.steps once and emits at most one driver per kind -- see the revisit-drivers
// table in the plan doc for exactly which step field triggers which kind. Sorted ascending
// by intervalDays (soonest-due first), ties broken by DRIVER_TIE_BREAK so output is
// deterministic. Empty is impossible for a real entry (any step is either lengths-only or
// root-touching), but entry.steps is a plain array -- fall back to a 0%-gray regrowth
// driver so drivers[0] is always safe for every caller.
export function getRevisitDrivers(entry: FormulaHistoryEntry): RevisitDriver[] {
  const drivers: RevisitDriver[] = [];

  const multiVisitStep = entry.steps.find(
    (step): step is ColorHistoryStep => step.kind === "color" && step.prePigmentation !== null && step.prePigmentation.need === "required-multi-visit",
  );
  if (multiVisitStep) {
    drivers.push({
      kind: "multi-visit-filler",
      intervalDays: multiVisitStep.prePigmentation!.multiVisitGapDays?.max ?? MULTI_VISIT_FILLER_FALLBACK_DAYS,
    });
  }

  const prePigmentedStep = entry.steps.find(
    (step): step is ColorHistoryStep => step.kind === "color" && step.prePigmentation !== null && step.prePigmentation.need !== "none",
  );
  if (prePigmentedStep) {
    drivers.push({ kind: "pigment-fade", intervalDays: PIGMENT_FADE_INTERVAL_DAYS });
  }

  if (entry.steps.some(touchesRootArea)) {
    drivers.push({ kind: "regrowth", intervalDays: getRegrowthIntervalDays(getEntryGrayPercent(entry)) });
  }

  if (entry.steps.some(step => step.kind === "color" && isLengthsOnly(step))) {
    drivers.push({ kind: "toner-refresh", intervalDays: TONER_REFRESH_INTERVAL_DAYS });
  }

  if (entry.steps.some(step => step.kind === "bleach" && isLengthsOnly(step))) {
    drivers.push({ kind: "partial-lightening", intervalDays: PARTIAL_LIGHTENING_INTERVAL_DAYS });
  }

  if (drivers.length === 0) {
    drivers.push({ kind: "regrowth", intervalDays: getRegrowthIntervalDays(0) });
  }

  return drivers.sort((a, b) => {
    if (a.intervalDays !== b.intervalDays) return a.intervalDays - b.intervalDays;
    return DRIVER_TIE_BREAK.indexOf(a.kind) - DRIVER_TIE_BREAK.indexOf(b.kind);
  });
}

// One string per distinct service composition, so planForClient can tell whether two
// visits were "the same kind of service" without re-deriving drivers per comparison.
// Alphabetical (not ascending-days) so the signature stays stable regardless of gray
// percent, which only affects the regrowth driver's intervalDays, not its presence.
function serviceSignature(entry: FormulaHistoryEntry): string {
  return getRevisitDrivers(entry).map(d => d.kind).sort().join("+");
}

function planForClient(clientEntries: FormulaHistoryEntry[]): ClientRevisitPlan {
  const visits = clientEntries
    .map(entry => ({ entry, date: entry.appliedAt!.toDate(), signature: serviceSignature(entry) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const last = visits[visits.length - 1];
  const drivers = getRevisitDrivers(last.entry);

  let intervalDays: number;
  let intervalBasis: ClientRevisitPlan["intervalBasis"];
  if (drivers[0].kind === "multi-visit-filler") {
    // The next visit is the scheduled second half of *this* service (the engine's own
    // 7-14 day window), so the client's usual rhythm is irrelevant and must not override it.
    intervalDays = drivers[0].intervalDays;
    intervalBasis = "service";
  } else {
    // Only genuine repeats of this exact service count toward the learned rhythm: filter
    // to past visits sharing the last visit's signature (in chronological order, ignoring
    // any different-service visits interspersed) and average the gaps between consecutive
    // occurrences of that filtered subsequence.
    const matchingDates = visits.filter(v => v.signature === last.signature).map(v => v.date);
    let totalDays = 0;
    let gapCount = 0;
    for (let i = 1; i < matchingDates.length; i++) {
      totalDays += (matchingDates[i].getTime() - matchingDates[i - 1].getTime()) / MS_PER_DAY;
      gapCount++;
    }
    if (gapCount >= 1) {
      intervalDays = totalDays / gapCount;
      intervalBasis = "history";
    } else {
      // The last visit is a service this client has never had before -- nothing to average.
      intervalDays = drivers[0].intervalDays;
      intervalBasis = "service";
    }
  }
  intervalDays = Math.round(intervalDays);

  return {
    clientKey: getClientGroupKey(last.entry),
    clientName: last.entry.clientName,
    lastVisitAt: last.date,
    intervalDays,
    intervalBasis,
    driver: drivers[0].kind,
    drivers,
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

export type RevisitStatus = "overdue" | "due-soon" | "upcoming";
const DUE_SOON_WINDOW_DAYS = 7;

export function getRevisitStatus(recommendedDate: Date, now: Date): RevisitStatus {
  const daysUntil = (recommendedDate.getTime() - now.getTime()) / MS_PER_DAY;
  if (daysUntil <= 0) return "overdue";
  if (daysUntil <= DUE_SOON_WINDOW_DAYS) return "due-soon";
  return "upcoming";
}
