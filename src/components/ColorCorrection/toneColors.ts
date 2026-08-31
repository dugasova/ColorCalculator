import type { UnwantedTone } from "../../engine/correction";

// Canonical wheel order, matching how COMPLEMENTARY_CORRECTORS pairs opposites: index i and
// i+3 are always complementary (red/green, orange/blue, yellow/violet). Shared between the
// tone-grid picker and NeutralizationWheel so both always agree on order and color.
export const TONES: UnwantedTone[] = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];

export const TONE_COLORS: Record<UnwantedTone, string> = {
  red: '#CC3333',
  orange: '#E8873B',
  yellow: '#E8D44D',
  green: '#4CAF50',
  blue: '#3B7DD8',
  violet: '#9B59B6',
};
