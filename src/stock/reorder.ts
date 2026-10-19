import type { Brand, BrandId } from "../engine/brands";
import { ALL_DEVELOPER_VOLUMES } from "../engine/levels";
import type { ReorderItem, StockRecord, StockStatus } from "./types";
import {
  DEVELOPER_BOTTLE_SIZE_GRAMS, LOW_STOCK_THRESHOLD_GRAMS, developerStockId, getBrandScopedDeveloperLines,
  getScopedDeveloperVolumes, getShadeTubeSizeGrams, shadeStockId,
} from "./products";

export function getStockStatus(remainingGrams: number, thresholdGrams: number = LOW_STOCK_THRESHOLD_GRAMS): StockStatus {
  if (remainingGrams <= 0) return "out";
  if (remainingGrams <= thresholdGrams) return "low";
  return "ok";
}

export function stockById(records: StockRecord[]): Map<string, StockRecord> {
  return new Map(records.map(record => [record.id, record]));
}

// Fewest packs (tubes/bottles) that lift a product strictly above its low-stock
// threshold -- the same boundary getStockStatus uses (remaining <= threshold is "low").
// Callers only pass low/out products (remaining <= threshold), so the result is always >= 1.
export function suggestReorderPacks(remainingGrams: number, thresholdGrams: number, packGrams: number): number {
  return Math.floor((thresholdGrams - remainingGrams) / packGrams) + 1;
}

// The SalonScale-style order list (OrderListView): every tracked product across every
// brand whose stock has dropped to "low" or "out", with a suggested pack quantity to
// order -- mirrors BrandStockList's own row derivation (same thresholds/pack sizes) so
// the two views never disagree about what counts as low or how big a tube/bottle is.
// Iterates the live catalog (not the raw records) deliberately: `usePalette()`'s brands
// already exclude discontinued shades and removed brands, so a stale stock doc left
// behind for one of those is never surfaced here.
export function buildReorderList(brands: Record<BrandId, Brand>, records: StockRecord[]): ReorderItem[] {
  const byId = stockById(records);
  const brandIds = Object.keys(brands).sort((a, b) => brands[a].name.localeCompare(brands[b].name));
  const items: ReorderItem[] = [];

  for (const brandId of brandIds) {
    const shades = brands[brandId].shades.slice().sort((a, b) => a.level - b.level || a.code.localeCompare(b.code));
    for (const shade of shades) {
      const id = shadeStockId(brandId, shade.line ?? null, shade.code);
      const record = byId.get(id);
      if (record === undefined) continue;
      const packGrams = getShadeTubeSizeGrams(brandId, shade.line ?? null);
      const status = getStockStatus(record.remainingGrams, packGrams);
      if (status === "ok") continue;
      items.push({
        id, brandId, remainingGrams: record.remainingGrams, status, packGrams,
        suggestedPacks: suggestReorderPacks(record.remainingGrams, packGrams, packGrams),
        kind: "shade", line: shade.line ?? null, code: shade.code, unit: "tube",
      });
    }
    for (const line of [null, ...getBrandScopedDeveloperLines(brandId)]) {
      const volumes = line === null ? ALL_DEVELOPER_VOLUMES : getScopedDeveloperVolumes(brandId, line);
      for (const volume of volumes) {
        const id = developerStockId(brandId, line, volume);
        const record = byId.get(id);
        if (record === undefined) continue;
        const status = getStockStatus(record.remainingGrams, LOW_STOCK_THRESHOLD_GRAMS);
        if (status === "ok") continue;
        items.push({
          id, brandId, remainingGrams: record.remainingGrams, status, packGrams: DEVELOPER_BOTTLE_SIZE_GRAMS,
          suggestedPacks: suggestReorderPacks(record.remainingGrams, LOW_STOCK_THRESHOLD_GRAMS, DEVELOPER_BOTTLE_SIZE_GRAMS),
          kind: "developer", line, volume, unit: "bottle",
        });
      }
    }
  }

  return items;
}
