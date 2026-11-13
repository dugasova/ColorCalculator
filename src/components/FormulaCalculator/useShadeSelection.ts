import { useMemo, useState } from "react";
import type { Brand, BrandId } from "../../engine/brands";
import { GENERIC_SHADE_CHART } from "../../engine/brands/generic";
import { compareShadesForDisplay } from "../../engine/shades";

export interface ShadeSelectionSeed {
  brandId?: BrandId;
  line?: string | null;
  targetShadeCode?: string;
}

// Which brand, line and target shade are selected, and the shades the current line offers.
// Owns no reset rules of its own: what else must reset when the selection changes
// (additional shades, manual overrides, a caller's own state) is decided by the hook
// composing this one -- see useShadeFormulaState.
export function useShadeSelection(brands: Record<BrandId, Brand>, initial?: ShadeSelectionSeed) {
  const [brandId, setBrandId] = useState<BrandId>(initial?.brandId ?? "generic");
  const [line, setLine] = useState<string | null>(initial?.line ?? null);
  const [targetShadeCode, setTargetShadeCode] = useState(initial?.targetShadeCode ?? GENERIC_SHADE_CHART[0].code);

  const availableLines = Array.from(new Set(brands[brandId].shades.map(s => s.line ?? null)));
  // Memoized: `brands[brandId].shades` is a stable array reference from context (only a
  // real palette change gives it a new one), so this only recomputes when the brand/line
  // selection or the palette itself actually changes -- an unmemoized `.filter().sort()`
  // would return a brand-new array every render, which is exactly the kind of unstable
  // identity a caller's own memoized derivation (e.g. useColorStepReport's
  // prePigmentationResult, via useComputedFullFormula's own identical concern) can't
  // safely depend on.
  const lineShades = useMemo(
    () => brands[brandId].shades.filter(s => (s.line ?? null) === line).sort(compareShadesForDisplay),
    [brands, brandId, line],
  );

  // The live palette (usePalette(), fed by Firestore onSnapshot) can change out from
  // under an in-progress selection: an admin can discontinue the currently selected
  // shade -- or every shade in the currently selected line -- while a stylist has it
  // open elsewhere in the salon (see PaletteAdmin's discontinue toggle). `lineShades[0]`
  // alone isn't a safe fallback: once every shade in the current line is gone, it's
  // `undefined`, which used to crash render outright (this app renders no error
  // boundary) -- falls back through the brand's own first shade, then the universal
  // Generic chart, neither of which a real catalog is ever emptied of. Reconciles
  // targetShadeCode/line to match, right during render (same adjusting-state-on-a-
  // changed-value pattern as the repeat-request replay in useFormulaCalculatorState.ts)
  // -- otherwise the shade picker keeps showing the stale, no-longer-valid code
  // (rendering blank, since it matches nothing in `lineShades`) while the formula/
  // swatch/price silently keep recalculating for a shade the stylist never chose.
  const targetShade =
    lineShades.find(s => s.code === targetShadeCode) ??
    lineShades[0] ??
    brands[brandId].shades[0] ??
    GENERIC_SHADE_CHART[0];
  if (targetShade.code !== targetShadeCode) {
    setTargetShadeCode(targetShade.code);
  }
  if ((targetShade.line ?? null) !== line) {
    setLine(targetShade.line ?? null);
  }

  // Switches to a brand's (or one of the current brand's lines') first shade.
  const selectBrand = (newBrandId: BrandId) => {
    const firstShade = brands[newBrandId].shades[0];
    setBrandId(newBrandId);
    setLine(firstShade.line ?? null);
    setTargetShadeCode(firstShade.code);
  };
  const selectLine = (newLine: string | null) => {
    const firstShade = brands[brandId].shades.find(s => (s.line ?? null) === newLine)!;
    setLine(newLine);
    setTargetShadeCode(firstShade.code);
  };

  return {
    brandId,
    setBrandId,
    line,
    setLine,
    targetShadeCode,
    setTargetShadeCode,
    availableLines,
    lineShades,
    targetShade,
    selectBrand,
    selectLine,
  };
}
