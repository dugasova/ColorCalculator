import type { Brand, BrandId } from './brands';
import type { Shade } from './shades';
import { shadeColorDistance } from './color';

export interface ShadeMatch {
  brandId: BrandId;
  brandName: string;
  shade: Shade;
  distance: number;
}

export type PermanenceCategory = 'permanent' | 'semi-permanent';

// Wella Koleston Perfect and L'Oréal Inoa/Majirel are permanent oxidative dyes; Wella
// Color Touch and L'Oréal Dia Light/Dia Richesse are semi-permanent (demi) dyes -- a
// fundamentally different chemistry (little to no ammonia, shorter processing, doesn't
// lift level) that a colorist can't just swap one for the other and expect the same
// service. findClosestShadeByBrand uses this to keep cross-brand matches within the same
// category. Lines this map doesn't know -- the brand-agnostic generic chart (no line at
// all) and any custom line an admin adds -- are deliberately left unclassified rather
// than guessed at.
const LINE_PERMANENCE: Record<string, PermanenceCategory> = {
  'koleston-perfect': 'permanent',
  inoa: 'permanent',
  majirel: 'permanent',
  'color-touch': 'semi-permanent',
  'dia-light': 'semi-permanent',
  'dia-richesse': 'semi-permanent',
};

export function getLinePermanence(line: string | undefined): PermanenceCategory | null {
  return line !== undefined ? LINE_PERMANENCE[line] ?? null : null;
}

// Perceptual "closest equivalent" lookup for when a colorist's usual brand/shade is out of
// stock: for every OTHER brand in the catalog, finds the single shade whose rendered color
// is perceptually closest to `target` (CIEDE2000 delta-E, see shadeColorDistance) -- across
// all of that brand's lines, since the goal is "what's the closest thing I can actually mix
// today", not a same-line lookup. Sorted so the best overall match comes first.
//
// Only compares shades whose line shares `target`'s permanence category (see
// LINE_PERMANENCE) -- a semi-permanent Color Touch shade is never offered as a substitute
// for a permanent Koleston Perfect formula, even if it renders as an identical color,
// because it's the wrong product for the job. If `target`'s own line has no known
// category (the generic chart, or a custom brand), there's nothing we can safely compare
// it against, so this returns no matches at all rather than guessing.
export function findClosestShadeByBrand(
  target: Shade,
  brands: Record<BrandId, Brand>,
  excludeBrandId: BrandId,
): ShadeMatch[] {
  const targetPermanence = getLinePermanence(target.line);
  if (targetPermanence === null) return [];

  const matches: ShadeMatch[] = [];
  for (const [brandId, brand] of Object.entries(brands)) {
    if (brandId === excludeBrandId || brand.shades.length === 0) continue;
    let best: Shade | null = null;
    let bestDistance = Infinity;
    for (const shade of brand.shades) {
      if (getLinePermanence(shade.line) !== targetPermanence) continue;
      const distance = shadeColorDistance(target, shade);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = shade;
      }
    }
    if (best !== null) {
      matches.push({ brandId, brandName: brand.name, shade: best, distance: bestDistance });
    }
  }
  matches.sort((a, b) => a.distance - b.distance);
  return matches;
}

export type ShadeMatchQuality = 'excellent' | 'good' | 'fair' | 'poor';

// CIEDE2000 delta-E is roughly perceptually uniform (see ciede2000 in color.ts): ~2 is
// only noticeable on close side-by-side inspection, ~5 is clearly noticeable but still a
// plausible stand-in, ~10 reads as a visibly different color at a glance. These thresholds
// turn that into a plain-language label a colorist can act on without knowing what
// delta-E means.
export function describeShadeMatchQuality(distance: number): ShadeMatchQuality {
  if (distance <= 2) return 'excellent';
  if (distance <= 5) return 'good';
  if (distance <= 10) return 'fair';
  return 'poor';
}
