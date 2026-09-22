// Technique cheat sheets -- short, practical reference notes for a coloring technique
// (as opposed to brandCheatSheets.ts's per-brand mixing quirks). One entry so far:
// working with resistant/vitreous ("glassy") gray hair. Doubles as the single source of
// truth for which `/guides/:guideId` routes resolve to a real page (see
// GuideCheatSheetPage) instead of falling through to its "not found" state.
export const TECHNIQUE_GUIDE_IDS = ["resistant-gray"] as const;
export type TechniqueGuideId = (typeof TECHNIQUE_GUIDE_IDS)[number];

export function hasTechniqueGuide(guideId: string): guideId is TechniqueGuideId {
  return (TECHNIQUE_GUIDE_IDS as readonly string[]).includes(guideId);
}
