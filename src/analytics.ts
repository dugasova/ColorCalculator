import type { ColorHistoryStep, FormulaHistoryEntry } from "./history";

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
  averageProductCost: number | null; // avg stored productCost across entries with a non-null value; null if none
}

export function computeSalonAnalytics(entries: FormulaHistoryEntry[]): SalonAnalytics {
  const totalVisits = entries.length;

  // Keyed by brand + line + shade code: the same code can exist across different brands/
  // lines (e.g. a generic chart's '7.1' vs a brand-specific one), so brand+line disambiguates.
  // Only color steps have a shade; bleach steps (lift-only, no dye) don't contribute here.
  const shadeCounts = new Map<string, ShadePopularity>();
  for (const entry of entries) {
    for (const step of entry.steps) {
      if (step.kind !== 'color') continue;
      const key = `${step.brandName}|${step.line ?? ''}|${step.targetShade.code}`;
      const existing = shadeCounts.get(key);
      if (existing !== undefined) {
        existing.count += 1;
      } else {
        shadeCounts.set(key, { brandName: step.brandName, line: step.line, shadeCode: step.targetShade.code, count: 1 });
      }
    }
  }
  const popularShades = Array.from(shadeCounts.values())
    .sort((a, b) => b.count - a.count || a.shadeCode.localeCompare(b.shadeCode));

  // `.filter(typeof … === 'number')` (not `!== null`) is required: Firestore documents
  // saved before the pricing/grams fields existed on this schema simply lack the field,
  // so `step.result.grams` / `entry.productCost` is `undefined` at runtime even though the
  // TS type only declares `null` as the empty case. `undefined !== null` is `true`, so a
  // laxer check would let `undefined` leak into the reduce below and turn the whole average
  // into `NaN`.
  const colorGramsValues = entries
    .flatMap(e => e.steps)
    .filter((step): step is ColorHistoryStep => step.kind === 'color')
    .map(step => step.result.grams?.colorGrams)
    .filter((g): g is number => typeof g === 'number');
  const averageColorGrams = colorGramsValues.length > 0
    ? colorGramsValues.reduce((sum, g) => sum + g, 0) / colorGramsValues.length
    : null;

  const productCostValues = entries
    .map(e => e.productCost)
    .filter((c): c is number => typeof c === 'number');
  const averageProductCost = productCostValues.length > 0
    ? productCostValues.reduce((sum, c) => sum + c, 0) / productCostValues.length
    : null;

  // Retention: % of named clients (normalized trim+lowercase, same grouping as revisit.ts)
  // who have 2 or more saved visits. Entries with an empty clientName can't be attributed
  // to a client and are excluded from both the numerator and denominator.
  const visitsByClient = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.clientName.trim().toLowerCase();
    if (key === '') continue;
    visitsByClient.set(key, (visitsByClient.get(key) ?? 0) + 1);
  }
  const uniqueClients = visitsByClient.size;
  let returningClients = 0;
  for (const count of visitsByClient.values()) {
    if (count >= 2) returningClients += 1;
  }
  const retentionRate = uniqueClients > 0 ? returningClients / uniqueClients : 0;

  return { totalVisits, uniqueClients, returningClients, retentionRate, popularShades, averageColorGrams, averageProductCost };
}
