import { getUnderlyingPigment, pickDeveloperVolume } from './levels';
import type { DeveloperVolume, Level, UnderlyingPigment } from './levels';
import { GENERIC_SHADE_CHART } from './shades';
import type { Shade, ToneFamily } from './shades';
import { getMixingRatio } from './formula';
import type { MixingRatio } from './shades';

// Going more than ~1 level darker than the current level risks losing the natural warm
// "underlying pigment" the target level would normally still carry (the same
// UnderlyingPigment progression getUnderlyingPigment models for lifting, in levels.ts) --
// depositing a dark, often ash/neutral-leaning formula directly onto hair missing that
// warmth turns muddy/uneven and fades fast. The fix ("pre-pigmentation"/"filling") is a
// short, deposit-only step before the target color: a warm-toned filler mixed 1:1 with
// water -- no oxidative developer, so zero lift, pure deposit -- processed briefly, not
// rinsed out, then the target formula goes on top while the cuticle is still relaxed.
// Severity scales with how many levels darker the target is from the current level
// (startLevel - targetLevel): under 2 levels, skip it; 2-3 levels, recommended but
// optional; 4-6 levels, required in the same visit; 7+ levels, required but should be
// split across two separate appointments (filler visit, then color visit 1-2 weeks
// later) to avoid combining a large pigment restoration with an immediate dark deposit
// in one sitting. The filler's tone family is chosen to match the target level's natural
// underlying warmth: red pigment levels (getUnderlyingPigment 'red'/'red-orange') need a
// 'red' filler; orange pigment levels ('orange'/'orange-yellow') need 'copper'; yellow
// pigment levels ('yellow-orange'/'yellow'/'pale-yellow'/'very-light-yellow') need 'gold'.
// The final color step's own developer/ratio needs no new logic -- darkening always
// resolves getMixingRatio to a 1:1 no-lift ratio and pickDeveloperVolume to the gentlest
// 10vol, since canReachTarget short-circuits true whenever the target is at or below the
// start level -- so both are reused directly instead of reimplemented here.

export type PrePigmentationNeed = 'none' | 'recommended' | 'required-same-session' | 'required-multi-visit';

export interface FillerMixingRatio {
  fillerParts: number;
  diluentParts: number;
}

export interface FillerGrams {
  fillerGrams: number;
  diluentGrams: number;
}

export interface PrePigmentationResult {
  need: PrePigmentationNeed;
  underlyingPigment: UnderlyingPigment | null;
  fillerTone: ToneFamily | null;
  exampleFillerShade: Shade | null;
  mixingRatio: FillerMixingRatio | null;
  grams: FillerGrams | null;
  fillerProcessingMinutes: number | null;
  multiVisitGapDays: { min: number; max: number } | null;
  finalStepMixingRatio: MixingRatio;
  finalStepDeveloperVolume: DeveloperVolume | null;
}

const RECOMMENDED_MIN_DIFF = 2;
const REQUIRED_MIN_DIFF = 4;
const MULTI_VISIT_MIN_DIFF = 7;

const FILLER_MIXING_RATIO: FillerMixingRatio = Object.freeze({ fillerParts: 1, diluentParts: 1 });

const FILLER_PROCESSING_MINUTES: Record<Exclude<PrePigmentationNeed, 'none'>, number> = {
  recommended: 10,
  'required-same-session': 15,
  'required-multi-visit': 15,
};

const MULTI_VISIT_MIN_GAP_DAYS = 7;
const MULTI_VISIT_MAX_GAP_DAYS = 14;

export function getPrePigmentationNeed(startLevel: Level, targetLevel: Level): PrePigmentationNeed {
  const diff = startLevel - targetLevel; // positive = going darker
  if (diff < RECOMMENDED_MIN_DIFF) return 'none';
  if (diff < REQUIRED_MIN_DIFF) return 'recommended';
  if (diff < MULTI_VISIT_MIN_DIFF) return 'required-same-session';
  return 'required-multi-visit';
}

export function getPrePigmentFillerTone(pigment: UnderlyingPigment): ToneFamily {
  switch (pigment) {
    case 'red':
    case 'red-orange':
      return 'red';
    case 'orange':
    case 'orange-yellow':
      return 'copper';
    case 'yellow-orange':
    case 'yellow':
    case 'pale-yellow':
    case 'very-light-yellow':
      return 'gold';
  }
}

// Worked example against the built-in Generic chart (GENERIC_SHADE_CHART, ./shades.ts):
// startLevel 9 -> targetLevel 5 needs a 'copper' filler (underlying pigment 'orange') and
// Generic has a 5.4 copper shade, so this resolves to that shade. startLevel 9 ->
// targetLevel 4 needs a 'red' filler (underlying pigment 'red-orange'), but Generic's
// level-4 entries are only natural/ash/gold/violet/chocolate (no red below level 5 in
// this chart) -- resolves to null, and callers must fall back to the natural (.0) base
// diluted, or a brand's dedicated filler product.
export function findExampleFillerShade(targetLevel: Level, fillerTone: ToneFamily): Shade | null {
  return GENERIC_SHADE_CHART.find(s => s.level === targetLevel && s.tone === fillerTone) ?? null;
}

export function calculateFillerGrams(totalGrams: number, ratio: FillerMixingRatio): FillerGrams {
  const totalParts = ratio.fillerParts + ratio.diluentParts;
  return {
    fillerGrams: totalGrams * ratio.fillerParts / totalParts,
    diluentGrams: totalGrams * ratio.diluentParts / totalParts,
  };
}

export function calculatePrePigmentation(startLevel: Level, targetLevel: Level, totalGrams: number): PrePigmentationResult {
  const need = getPrePigmentationNeed(startLevel, targetLevel);
  const underlyingPigment = need !== 'none' ? getUnderlyingPigment(targetLevel) : null;
  const fillerTone = underlyingPigment !== null ? getPrePigmentFillerTone(underlyingPigment) : null;
  const exampleFillerShade = fillerTone !== null ? findExampleFillerShade(targetLevel, fillerTone) : null;
  const mixingRatio = need !== 'none' ? FILLER_MIXING_RATIO : null;
  const grams = mixingRatio !== null ? calculateFillerGrams(totalGrams, mixingRatio) : null;
  const fillerProcessingMinutes = need !== 'none' ? FILLER_PROCESSING_MINUTES[need] : null;
  const multiVisitGapDays = need === 'required-multi-visit'
    ? { min: MULTI_VISIT_MIN_GAP_DAYS, max: MULTI_VISIT_MAX_GAP_DAYS }
    : null;

  return {
    need,
    underlyingPigment,
    fillerTone,
    exampleFillerShade,
    mixingRatio,
    grams,
    fillerProcessingMinutes,
    multiVisitGapDays,
    finalStepMixingRatio: getMixingRatio(startLevel, targetLevel),
    finalStepDeveloperVolume: pickDeveloperVolume(startLevel, targetLevel),
  };
}
