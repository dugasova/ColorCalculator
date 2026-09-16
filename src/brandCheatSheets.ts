import type { BrandId } from "./engine/brands";

// The five built-in brands that have a hand-authored cheat sheet (see the `brandNotes.*`
// locale keys in src/locales/en.ts / uk.ts) -- a custom admin-added brand has no entry
// here and simply isn't linked from BrandsIndexPage or reachable by its own URL. Doubles
// as the single source of truth for which `/:brandId` routes actually resolve to a page
// (see BrandCheatSheetPage) instead of falling through to its "not found" state.
export const BRAND_CHEAT_SHEET_IDS: BrandId[] = ["loreal", "wella", "igora", "redken", "generic"];

export function hasBrandCheatSheet(brandId: string): brandId is BrandId {
  return (BRAND_CHEAT_SHEET_IDS as string[]).includes(brandId);
}
