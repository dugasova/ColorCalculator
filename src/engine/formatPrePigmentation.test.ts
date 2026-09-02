import { describe, it, expect } from 'vitest';
import { formatPrePigmentationText } from './formatPrePigmentation';
import { calculatePrePigmentation } from './prePigmentation';

describe('formatPrePigmentationText', () => {
  it('formats a no-op scenario with only the target-color step', () => {
    const result = calculatePrePigmentation(6, 6, 30);

    const text = formatPrePigmentationText({ startLevel: 6, targetLevel: 6, result });

    expect(text).toBe(
      'Pre-pigmentation Calculator\n' +
      'Starting level: 6 → Target: 6\n' +
      'Pre-pigmentation: Not needed — apply the target formula directly.\n' +
      'Step 2 — Target color\n' +
      'Developer: 10 vol\n' +
      'Ratio: 1:1\n' +
      'Once filled, apply your target shade formula from the Formula calculator using this developer and ratio — the starting level for that formula stays 6, not the filled level.\n' +
      'Basic guidance — does not replace a complete color diagnosis and strand test.'
    );
  });

  it('formats a required-same-session scenario with a Generic filler example', () => {
    const result = calculatePrePigmentation(9, 5, 30);

    const text = formatPrePigmentationText({ startLevel: 9, targetLevel: 5, result });

    expect(text).toBe(
      'Pre-pigmentation Calculator\n' +
      'Starting level: 9 → Target: 5\n' +
      'Pre-pigmentation: Required, same visit — fill first, then apply the target formula.\n' +
      'Step 1 — Filler\n' +
      'Missing underlying pigment: orange\n' +
      'Recommended filler tone: Copper\n' +
      'Generic 5.4 (Copper)\n' +
      'Ratio: 1:1\n' +
      'Mix: 15.0 g filler : 15.0 g water\n' +
      'Processing time: 15 min\n' +
      'Step 2 — Target color\n' +
      'Developer: 10 vol\n' +
      'Ratio: 1:1\n' +
      'Once filled, apply your target shade formula from the Formula calculator using this developer and ratio — the starting level for that formula stays 9, not the filled level.\n' +
      'Basic guidance — does not replace a complete color diagnosis and strand test.'
    );
  });

  it('formats a required-multi-visit scenario with no Generic example and the multi-visit note', () => {
    const result = calculatePrePigmentation(10, 2, 60);

    const text = formatPrePigmentationText({ startLevel: 10, targetLevel: 2, result });

    expect(text).toBe(
      'Pre-pigmentation Calculator\n' +
      'Starting level: 10 → Target: 2\n' +
      'Pre-pigmentation: Required, over two visits — fill and process, then apply the target formula at a separate appointment.\n' +
      'Step 1 — Filler\n' +
      'Missing underlying pigment: red\n' +
      'Recommended filler tone: Red\n' +
      'No dedicated Red shade at level 2 in this catalog — use the natural (.0) base diluted, or a dedicated filler/corrector product.\n' +
      'Ratio: 1:1\n' +
      'Mix: 30.0 g filler : 30.0 g water\n' +
      'Processing time: 15 min\n' +
      'Let the filler process and settle 7-14 days before the final color visit — combining a large pigment restoration with an immediate dark deposit in one sitting risks an uneven, over-processed result.\n' +
      'Step 2 — Target color\n' +
      'Developer: 10 vol\n' +
      'Ratio: 1:1\n' +
      'Once filled, apply your target shade formula from the Formula calculator using this developer and ratio — the starting level for that formula stays 10, not the filled level.\n' +
      'Basic guidance — does not replace a complete color diagnosis and strand test.'
    );
  });
});
