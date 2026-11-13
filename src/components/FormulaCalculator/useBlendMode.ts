import { useState } from "react";
import { splitShadeBlend } from "../../engine/formula";
import { canBlendShades, suggestBlendComponents, type Shade } from "../../engine/shades";

export const DEFAULT_BLEND_PRIMARY_PERCENT = 70;
// How far a blend component's own level may sit from the target's for it to be offered
// as a stand-in (see canBlendShades) -- colorists routinely blend one level above and
// below a missing shade to approximate it, not just same-level reflects.
const BLEND_LEVEL_TOLERANCE = 1;

// Substitute-blend mode ("shade out of stock"): two shades the salon has stand in for
// the target and share its color weight. `blendColorGrams` is that weight -- the base
// color minus any gray-coverage natural base -- or null when there is no mix.
//
// Two dedicated fields hold the components (see BlendComponentField), fully independent
// of the target and additional shades -- the target stays the visual goal, never itself
// a candidate: blend mode exists precisely because the target is the one shade NOT on
// hand, so offering it back as a stand-in for itself would be offering the missing
// product. Each component defaults to the closest real single-reflect shade the moment
// blend mode is turned on (e.g. target 7/17 suggests 7/1 + 7/7), overridable via the two
// selects. Candidates span target.level +/- BLEND_LEVEL_TOLERANCE.
export function useBlendMode(targetShade: Shade, lineShades: Shade[], blendColorGrams: number | null) {
  const [blendModeEnabled, setBlendModeEnabled] = useState(false);
  const [blendShadeACode, setBlendShadeACode] = useState<string | null>(null);
  const [blendShadeBCode, setBlendShadeBCode] = useState<string | null>(null);
  const [blendPrimaryPercent, setBlendPrimaryPercent] = useState(DEFAULT_BLEND_PRIMARY_PERCENT);

  const blendCandidates = lineShades.filter(
    s => s.code !== targetShade.code && canBlendShades(targetShade, s, BLEND_LEVEL_TOLERANCE),
  );
  const blendSuggestion = suggestBlendComponents(targetShade, lineShades);
  const blendShadeACodeEffective = blendShadeACode ?? blendSuggestion.primary?.code ?? null;
  const blendShadeBCodeEffective = blendShadeBCode ?? blendSuggestion.secondary?.code ?? null;
  const blendShadeA =
    blendShadeACodeEffective !== null ? (blendCandidates.find(s => s.code === blendShadeACodeEffective) ?? null) : null;
  const blendShadeB =
    blendShadeBCodeEffective !== null ? (blendCandidates.find(s => s.code === blendShadeBCodeEffective) ?? null) : null;
  const blend =
    blendModeEnabled && blendShadeA !== null && blendShadeB !== null && blendColorGrams !== null
      ? {
          shadeA: blendShadeA,
          shadeAGrams: splitShadeBlend(blendColorGrams, blendPrimaryPercent).primaryGrams,
          shadeB: blendShadeB,
          shadeBGrams: splitShadeBlend(blendColorGrams, blendPrimaryPercent).secondaryGrams,
        }
      : null;

  // Drops the hand-picked pair and split, so a fresh default is suggested. Used when the
  // target changes: a blend picked for the previous target may no longer be a physically
  // valid pairing for the new one (different level/reflect).
  const resetBlendSelection = () => {
    setBlendShadeACode(null);
    setBlendShadeBCode(null);
    setBlendPrimaryPercent(DEFAULT_BLEND_PRIMARY_PERCENT);
  };

  // Used when the whole shade pool changes (new brand or line).
  const disableBlendMode = () => {
    setBlendModeEnabled(false);
    resetBlendSelection();
  };

  const handleBlendModeChange = (enabled: boolean) => {
    setBlendModeEnabled(enabled);
    if (!enabled) resetBlendSelection();
  };

  return {
    blendModeEnabled,
    setBlendModeEnabled,
    setBlendShadeACode,
    setBlendShadeBCode,
    blendPrimaryPercent,
    setBlendPrimaryPercent,
    blendCandidates,
    blendShadeACodeEffective,
    blendShadeBCodeEffective,
    blendShadeA,
    blendShadeB,
    blend,
    resetBlendSelection,
    disableBlendMode,
    handleBlendModeChange,
  };
}
