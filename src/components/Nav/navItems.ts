import type { AppView } from "./Nav";

// Shared by Nav (desktop/tablet tab strip) and BottomNav (phone-width bottom bar +
// "More" popup) so both stay in sync with which views exist and in what order. Split
// out of Nav.tsx (which otherwise only exports components) so Fast Refresh keeps
// working there -- react-refresh/only-export-components.
export function navItems(isAdmin: boolean): AppView[] {
  const items: AppView[] = ["calculator", "complex", "correction", "bleach", "prepigment", "history", "favorites", "analytics", "reference"];
  if (isAdmin) {
    items.push("palette", "orders");
  }
  return items;
}

// The four views BottomNav gives their own tab -- the rest (plus, for an admin, Palette
// and Orders) live behind its "More" popup. Picked for how often a stylist reaches for
// them day-to-day; Correction/Bleach/Pre-pigment are comparatively occasional.
export const MOBILE_PRIMARY_VIEWS: AppView[] = ["calculator", "complex", "history", "reference"];
