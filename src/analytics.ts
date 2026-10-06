import type { ColorHistoryStep, FormulaHistoryEntry } from "./history";
import { getClientGroupKey, normalizeClientKey } from "./revisit";
import { stepTotalGrams } from "./sessionCost";

export interface ShadePopularity {
  brandName: string;
  line: string | null;
  shadeCode: string;
  count: number;
}

export interface SalonAnalytics {
  totalVisits: number;
  uniqueClients: number;
  returningClients: number;    // named clients with >=2 saved visits
  retentionRate: number;       // returningClients / uniqueClients; 0 when uniqueClients === 0
  popularShades: ShadePopularity[]; // sorted desc by count, ties broken by shadeCode asc
  averageColorGrams: number | null; // avg colorGrams (dye only, excludes developer) across entries with a computed formula; null if none
  averageActualColorGrams: number | null; // avg recorded real dye grams; null when nothing has been recorded
  actualVsComputedRatio: number | null;   // sum(actual) / sum(computed) over steps that have both; 1 means the engine matches reality
  averageProductCost: number | null; // avg stored productCost across entries with a non-null value; null if none
}

// Keyed by brand + line + shade code: the same code can exist across different brands/
// lines (e.g. a generic chart's '7.1' vs a brand-specific one), so brand+line disambiguates.
// Only color steps have a shade; bleach steps (lift-only, no dye) don't contribute here.
function countShadePopularity(entries: FormulaHistoryEntry[]): ShadePopularity[] {
  const shadeCounts = new Map<string, ShadePopularity>();
  for (const entry of entries) {
    for (const step of entry.steps) {
      if (step.kind !== "color") continue;
      const key = `${step.brandName}|${step.line ?? ""}|${step.targetShade.code}`;
      const existing = shadeCounts.get(key);
      if (existing !== undefined) {
        existing.count += 1;
      } else {
        shadeCounts.set(key, { brandName: step.brandName, line: step.line, shadeCode: step.targetShade.code, count: 1 });
      }
    }
  }
  return Array.from(shadeCounts.values())
    .sort((a, b) => b.count - a.count || a.shadeCode.localeCompare(b.shadeCode));
}

// Visit count per client identity (see getClientGroupKey), skipping entries with an empty
// clientName -- they can't be attributed to a client.
function countVisitsByClient(entries: FormulaHistoryEntry[]): Map<string, number> {
  const visitsByClient = new Map<string, number>();
  for (const entry of entries) {
    if (normalizeClientKey(entry.clientName) === "") continue;
    const key = getClientGroupKey(entry);
    visitsByClient.set(key, (visitsByClient.get(key) ?? 0) + 1);
  }
  return visitsByClient;
}

export function computeSalonAnalytics(entries: FormulaHistoryEntry[]): SalonAnalytics {
  const totalVisits = entries.length;

  const popularShades = countShadePopularity(entries);

  // `.filter(typeof … === 'number')` (not `!== null`) is required: Firestore documents
  // saved before the pricing/grams fields existed on this schema simply lack the field,
  // so `step.result.grams` / `entry.productCost` is `undefined` at runtime even though the
  // TS type only declares `null` as the empty case. `undefined !== null` is `true`, so a
  // laxer check would let `undefined` leak into the reduce below and turn the whole average
  // into `NaN`.
  const colorGramsValues = entries
    .flatMap(e => e.steps)
    .filter((step): step is ColorHistoryStep => step.kind === "color")
    .map(step => step.result.grams?.colorGrams)
    .filter((g): g is number => typeof g === "number");
  const averageColorGrams = colorGramsValues.length > 0
    ? colorGramsValues.reduce((sum, g) => sum + g, 0) / colorGramsValues.length
    : null;

  const actualPairs = entries
    .flatMap(e => e.steps)
    .filter((step): step is ColorHistoryStep => step.kind === "color")
    .map(step => ({ actual: step.actualColorGrams, computed: step.result.grams?.colorGrams }))
    .filter((pair): pair is { actual: number; computed: number } =>
      typeof pair.actual === "number" && typeof pair.computed === "number");
  const averageActualColorGrams = actualPairs.length > 0
    ? actualPairs.reduce((sum, p) => sum + p.actual, 0) / actualPairs.length
    : null;
  const computedTotal = actualPairs.reduce((sum, p) => sum + p.computed, 0);
  const actualVsComputedRatio = computedTotal > 0
    ? actualPairs.reduce((sum, p) => sum + p.actual, 0) / computedTotal
    : null;

  const productCostValues = entries
    .map(e => e.productCost)
    .filter((c): c is number => typeof c === "number");
  const averageProductCost = productCostValues.length > 0
    ? productCostValues.reduce((sum, c) => sum + c, 0) / productCostValues.length
    : null;

  // Retention: % of clients (grouped by real clientId when the entry has one, else a
  // normalized-name fallback -- see getClientGroupKey) who have 2 or more saved visits.
  // Entries with an empty clientName can't be attributed to a client and are excluded
  // from both the numerator and denominator.
  const visitsByClient = countVisitsByClient(entries);
  const uniqueClients = visitsByClient.size;
  let returningClients = 0;
  for (const count of visitsByClient.values()) {
    if (count >= 2) returningClients += 1;
  }
  const retentionRate = uniqueClients > 0 ? returningClients / uniqueClients : 0;

  return {
    totalVisits, uniqueClients, returningClients, retentionRate, popularShades,
    averageColorGrams, averageActualColorGrams, actualVsComputedRatio, averageProductCost,
  };
}

export type AnalyticsPeriod = "all" | "last30Days" | "thisMonth";
export const ANALYTICS_PERIODS: AnalyticsPeriod[] = ["all", "last30Days", "thisMonth"];

const LAST_30_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// "all" returns `entries` unchanged (same reference), so callers can tell at a glance
// that nothing was filtered out. The other two periods drop entries whose `appliedAt` is
// still a pending server timestamp (`null`) -- the same exclusion `groupByClient`
// (revisit.ts) applies -- since there's no date to compare against `start`.
export function filterEntriesByPeriod(entries: FormulaHistoryEntry[], period: AnalyticsPeriod, now: Date): FormulaHistoryEntry[] {
  if (period === "all") return entries;
  const start = period === "last30Days"
    ? new Date(now.getTime() - LAST_30_DAYS_MS)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  return entries.filter(entry => entry.appliedAt !== null && entry.appliedAt.toDate() >= start);
}

export interface StylistStats {
  stylist: string;                         // entry.appliedBy, exact string
  visits: number;
  uniqueClients: number;
  returningClients: number;
  retentionRate: number;                   // returningClients / uniqueClients; 0 when uniqueClients === 0
  dyeGrams: number;                        // sum of stepTotalGrams over color steps (dye + pre-pigmentation filler, actual-aware)
  bleachPowderGrams: number;               // sum of stepTotalGrams over bleach steps
  processingMinutes: number;               // sum of step.processingMinutes (numbers only)
  averageProcessingMinutes: number | null; // processingMinutes / visits; null when visits === 0
  revenue: number;                         // sum of numeric entry.servicePrice
  pricedVisits: number;                    // entries with numeric servicePrice
  productCost: number;                     // sum of numeric entry.productCost
  grossProfit: number | null;              // sum(servicePrice - productCost) over entries where BOTH are numbers; null if none
  averageTicket: number | null;            // revenue / pricedVisits; null when pricedVisits === 0
  topShade: ShadePopularity | null;        // countShadePopularity(stylistEntries)[0] ?? null
  lastVisitAt: Date | null;                // max appliedAt.toDate(); null when every entry has appliedAt === null
}

// Grouped by `entry.appliedBy` exactly as stored -- always the signed-in stylist's
// `user.email` (or the "unknown" fallback, see AuthenticatedApp), never a free-typed name
// -- so unlike client identity this needs no normalization/fallback key.
function groupByStylist(entries: FormulaHistoryEntry[]): Map<string, FormulaHistoryEntry[]> {
  const groups = new Map<string, FormulaHistoryEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.appliedBy) ?? [];
    list.push(entry);
    groups.set(entry.appliedBy, list);
  }
  return groups;
}

export function computeStylistStats(entries: FormulaHistoryEntry[]): StylistStats[] {
  const stats: StylistStats[] = [];
  for (const [stylist, stylistEntries] of groupByStylist(entries)) {
    const visits = stylistEntries.length;

    const visitsByClient = countVisitsByClient(stylistEntries);
    const uniqueClients = visitsByClient.size;
    let returningClients = 0;
    for (const count of visitsByClient.values()) {
      if (count >= 2) returningClients += 1;
    }
    const retentionRate = uniqueClients > 0 ? returningClients / uniqueClients : 0;

    let dyeGrams = 0;
    let bleachPowderGrams = 0;
    let processingMinutes = 0;
    for (const entry of stylistEntries) {
      for (const step of entry.steps) {
        if (step.kind === "color") dyeGrams += stepTotalGrams(step);
        else bleachPowderGrams += stepTotalGrams(step);
        if (typeof step.processingMinutes === "number") processingMinutes += step.processingMinutes;
      }
    }
    const averageProcessingMinutes = visits > 0 ? processingMinutes / visits : null;

    let revenue = 0;
    let pricedVisits = 0;
    let productCost = 0;
    let grossProfitSum = 0;
    let grossProfitCount = 0;
    for (const entry of stylistEntries) {
      if (typeof entry.servicePrice === "number") {
        revenue += entry.servicePrice;
        pricedVisits += 1;
      }
      if (typeof entry.productCost === "number") productCost += entry.productCost;
      if (typeof entry.servicePrice === "number" && typeof entry.productCost === "number") {
        grossProfitSum += entry.servicePrice - entry.productCost;
        grossProfitCount += 1;
      }
    }
    const grossProfit = grossProfitCount > 0 ? grossProfitSum : null;
    const averageTicket = pricedVisits > 0 ? revenue / pricedVisits : null;

    const topShade = countShadePopularity(stylistEntries)[0] ?? null;

    let lastVisitAt: Date | null = null;
    for (const entry of stylistEntries) {
      if (entry.appliedAt === null) continue;
      const appliedAt = entry.appliedAt.toDate();
      if (lastVisitAt === null || appliedAt > lastVisitAt) lastVisitAt = appliedAt;
    }

    stats.push({
      stylist, visits, uniqueClients, returningClients, retentionRate,
      dyeGrams, bleachPowderGrams, processingMinutes, averageProcessingMinutes,
      revenue, pricedVisits, productCost, grossProfit, averageTicket, topShade, lastVisitAt,
    });
  }

  return stats.sort((a, b) => b.revenue - a.revenue || b.visits - a.visits || a.stylist.localeCompare(b.stylist));
}
