import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '../../i18n';
import { PrePigmentationCalculator } from './PrePigmentationCalculator';

describe('PrePigmentationCalculator', () => {
  it('renders the default scenario (level 9 -> 5) with the required-same-session filler step', () => {
    const html = renderToStaticMarkup(<PrePigmentationCalculator />);

    expect(html).toContain('calculator__title-accent">Calculator<');
    expect(html).toContain('Required, same visit — fill first, then apply the target formula.');
    expect(html).toContain('>orange<');
    expect(html).toContain('>Copper<');
    expect(html).toContain('Generic 5.4 (Copper)');
    expect(html).toContain('15.0 g filler : 15.0 g water');
    expect(html).toContain('Processing time: 15 min');
    expect(html).toContain('10 vol');
    expect(html).toContain('Ratio: 1:1');
    expect(html).not.toContain('Let the filler process and settle');
    expect(html).toContain('id="prepigmentStartLevel"');
    expect(html).toContain('id="prepigmentTargetLevel"');
    expect(html).toContain('id="prepigmentTotalGrams"');
  });

  it('renders the target-color step and disclaimer alongside the filler stat labels', () => {
    const html = renderToStaticMarkup(<PrePigmentationCalculator />);
    expect(html).toContain('results__row-label">Step 2 — Target color');
    expect(html).toContain('stat__label">Missing underlying pigment');
    expect(html).toContain('stat__label">Recommended filler tone');
    expect(html).toContain('stat__label">Generic-line example');
    expect(html).toContain('stat__label">Filler mix');
    expect(html).toContain('Basic guidance — does not replace a complete color diagnosis and strand test.');
  });
});
