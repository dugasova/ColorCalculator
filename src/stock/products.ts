import type { BrandId } from "../engine/brands";
import { ALL_DEVELOPER_VOLUMES, type DeveloperVolume } from "../engine/levels";

// Default tube size: most lines in this catalog ship a shade in a 60 g tube, so "below
// one full tube left" is the point at which a colorist needs to reorder before the next
// full-head service. A handful of lines ship smaller tubes -- see
// SHADE_TUBE_SIZE_OVERRIDES_GRAMS/getShadeTubeSizeGrams below for those.
export const LOW_STOCK_THRESHOLD_GRAMS = 60;

// Real per-tube size differs by product: L'Oréal's Majirel and Dia Light ship in 50 g
// tubes; every other built-in line ships in the standard 60 g tube (INOA and Dia Color
// included -- only these two are smaller). Keyed by "<brandId>::<line>"; a custom
// admin-added line (or a built-in line with no entry here) falls back to the 60 g
// default. Developer isn't tube-packaged at all (it's tracked per volume, not per line),
// so this only applies to shade stock -- getStockStatus's `thresholdGrams` defaults to
// the flat 60 g for developer rows too (a bottle is opened and drawn down gradually, so
// "below one service's worth left" is still the right low-stock trigger, unlike the
// restock amount below).
const SHADE_TUBE_SIZE_OVERRIDES_GRAMS: Record<string, number> = {
  "loreal::majirel": 50,
  "loreal::dia-light": 50,
  // unverified -- confirm first: assumed 90 ml (3 oz), SoColor's commonly cited US tube
  // size, not independently confirmed against a real tube.
  "matrix::socolor": 90,
  "matrix::super-sync": 90,
};

export function getShadeTubeSizeGrams(brandId: BrandId, line: string | null): number {
  return SHADE_TUBE_SIZE_OVERRIDES_GRAMS[`${brandId}::${line ?? ""}`] ?? LOW_STOCK_THRESHOLD_GRAMS;
}

// Developer ships in a 1000 g/ml bottle, not a 60 g tube -- BrandStockList's "+1" restock
// action needs to add a full bottle for developer rows while still flagging low stock at
// the same 60 g "one service left" threshold as shades (see LOW_STOCK_THRESHOLD_GRAMS's
// comment above).
export const DEVELOPER_BOTTLE_SIZE_GRAMS = 1000;

// Lines whose developer is a chemically distinct product from the rest of their brand's
// other lines, not a shared bottle -- INOA's own Oxydant Crème (oil-delivery system)
// isn't interchangeable with Majirel/Dia Light/Dia Color's regular Oxydant Crème, and
// Chromatics' Oil-in-Cream Developer isn't the same product as Shades EQ's Processing
// Solution (itself not even a real graded developer -- see redken.ts). The value is the
// exact set of volumes that real product actually ships in -- both INOA Developer and
// Chromatics Oil-in-Cream Developer are sold only in 10/20/30 vol, unlike the full
// 6/10/13/20/30/40 vol range ALL_DEVELOPER_VOLUMES offers for a brand's shared bucket.
// Every other line in this catalog still shares one developer-per-volume stock bucket
// with the rest of its brand, same as before this distinction existed -- keyed
// "<brandId>::<line>", same shape as SHADE_TUBE_SIZE_OVERRIDES_GRAMS above.
const SEPARATE_DEVELOPER_LINES: Record<string, DeveloperVolume[]> = {
  "loreal::inoa": [10, 20, 30],
  "redken::chromatics": [10, 20, 30],
};

// The scoped-developer lines that exist within one brand (see SEPARATE_DEVELOPER_LINES
// above) -- BrandStockList and buildReorderList both use this to render/derive one extra
// developer row per scoped line, on top of the brand's own shared bucket. Empty for every
// brand with no chemically-distinct-developer line.
export function getBrandScopedDeveloperLines(brandId: BrandId): string[] {
  return Object.keys(SEPARATE_DEVELOPER_LINES)
    .filter(key => key.startsWith(`${brandId}::`))
    .map(key => key.slice(brandId.length + 2))
    .sort();
}

// The real volumes a scoped line's developer ships in (see SEPARATE_DEVELOPER_LINES
// above) -- callers only pass a `line` already returned by getBrandScopedDeveloperLines,
// so this is always found.
export function getScopedDeveloperVolumes(brandId: BrandId, line: string): DeveloperVolume[] {
  return SEPARATE_DEVELOPER_LINES[`${brandId}::${line}`] ?? ALL_DEVELOPER_VOLUMES;
}

// The line a given (brandId, line) pair's developer is actually tracked under: itself, if
// it needs its own bucket (see SEPARATE_DEVELOPER_LINES above), else `null` -- the
// brand-wide shared bucket every other line already used before this distinction existed.
export function developerStockLine(brandId: BrandId, line: string | null): string | null {
  return line !== null && SEPARATE_DEVELOPER_LINES[`${brandId}::${line}`] !== undefined ? line : null;
}

// Deterministic doc ids (same rationale as palette.ts's `disableOverrideId`): a re-edit
// of the same product updates one document instead of accumulating duplicates, and a
// stale listener update can't briefly show two conflicting remaining-gram values. Every
// part is URI-encoded because Firestore document ids can't contain "/" and several Wella
// codes do (e.g. "5/41"). The "shade::"/"dev::" prefix keeps the two kinds from ever
// colliding within the one collection.
export function shadeStockId(brandId: BrandId, line: string | null, code: string): string {
  return `shade::${encodeURIComponent(brandId)}::${encodeURIComponent(line ?? "")}::${encodeURIComponent(code)}`;
}

// `line` picks the developer's stock bucket, not its display: only a scoped line (see
// SEPARATE_DEVELOPER_LINES above) actually changes the resulting id -- every other line
// resolves to the same brand-wide bucket as passing `null`, so an existing developer
// stock document stays valid without any migration when this line-scoping ships.
export function developerStockId(brandId: BrandId, line: string | null, volume: DeveloperVolume): string {
  const stockLine = developerStockLine(brandId, line);
  return stockLine !== null
    ? `dev::${encodeURIComponent(brandId)}::${volume}::${encodeURIComponent(stockLine)}`
    : `dev::${encodeURIComponent(brandId)}::${volume}`;
}
