import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '../../i18n';
import { calculateBleachFormula } from '../../engine/bleach';
import { BleachCalculator, BleachResults } from './BleachCalculator';

const noPricing = {
  pricePerGram: 0.1,
  onPricePerGramChange: () => {},
  markupMultiplier: 4,
  onMarkupMultiplierChange: () => {},
  productCost: null,
  recommendedServicePrice: null,
};

describe('BleachCalculator', () => {
  it('renders the default scenario (level 6 -> 8) with computed developer, ratio, mix, and pricing', () => {
    const html = renderToStaticMarkup(<BleachCalculator />);

    expect(html).toContain('calculator__title-accent">Calculator<');
    expect(html).toContain('id="currentLevel"');
    expect(html).toContain('id="targetLevel"');
    expect(html).toContain('id="totalGrams"');
    expect(html).toContain('6 vol'); // 2-level lift -> 6vol now covers up to 3 levels
    expect(html).toContain('1 : 2'); // mixing ratio is now uniformly 1:2
    expect(html).toContain('g bleach powder');
    expect(html).toContain('id="bleachPricePerGram"');
    expect(html).toContain('id="bleachMarkupMultiplier"');
    expect(html).toContain('6.00'); // productCost: 60g total @ default 0.10/g
    expect(html).toContain('24.00'); // recommendedServicePrice: 6.00 * default 4x markup
    expect(html).not.toContain('choose a target level above your current level');
    expect(html).not.toContain('cannot be done in a single session');
  });

  it('shows the multi-step warning when the requested lift exceeds a single session (1 -> 10)', () => {
    const result = calculateBleachFormula(1, 10, 60);
    const html = renderToStaticMarkup(<BleachResults result={result} {...noPricing} />);

    expect(html).toContain('cannot be done in a single session');
    expect(html).toContain('1-2 weeks');
    expect(html).not.toContain('choose a target level above your current level');
    expect(html).not.toContain('g bleach powder'); // no grams — no single-session formula
  });

  it('shows the no-lift warning when the target level equals the current level', () => {
    const result = calculateBleachFormula(7, 7, 60);
    const html = renderToStaticMarkup(<BleachResults result={result} {...noPricing} />);

    expect(html).toContain('choose a target level above your current level');
    expect(html).not.toContain('cannot be done in a single session');
    expect(html).not.toContain('g bleach powder'); // no grams — no lift, no formula
  });
});
