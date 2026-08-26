import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '../../i18n';
import { calculateFullFormula, applyAdditionalShade } from '../../engine/formula';
import type { Shade } from '../../engine/shades';
import FormulaCalculator from './FormulaCalculator';
import { FormulaResults } from './FormulaResults';

describe('FormulaCalculator', () => {
  it('renders the additional shade selector but hides its grams input until a shade is chosen', () => {
    const html = renderToStaticMarkup(<FormulaCalculator appliedBy="stylist@example.com" />);

    expect(html).toContain('id="additionalShadeCode"');
    expect(html).not.toContain('id="additionalShadeGrams"');
  });
});

describe('FormulaResults additional shade blending', () => {
  const targetShade: Shade = { code: '8.1', level: 8, tone: 'ash' };
  const additionalShade: Shade = { code: '8.3', level: 8, tone: 'gold' };
  // No lift (level 8 -> 8): 1:1 ratio, 60g total -> 30g color : 30g developer.
  const baseResult = calculateFullFormula(8, targetShade, 0, 60);

  const noOps = {
    onProcessingMinutesChange: () => {},
    onPricePerGramChange: () => {},
    onMarkupMultiplierChange: () => {},
    onServicePriceChange: () => {},
    onNeutralizationAppliedChange: () => {},
  };

  it('recalculates developer proportionally when the colorist blends in an additional shade', () => {
    const grams = baseResult.grams !== null
      ? applyAdditionalShade(baseResult.grams, baseResult.mixingRatio, 10)
      : null;
    const effectiveResult = { ...baseResult, grams };

    const html = renderToStaticMarkup(
      <FormulaResults
        brandName="Generic"
        line={null}
        targetShade={targetShade}
        startLevel={8}
        grayPercent={0}
        applicationZone="full-head"
        result={effectiveResult}
        additionalShade={additionalShade}
        additionalShadeGrams={10}
        neutralizationApplied={false}
        appliedBy="stylist@example.com"
        processingMinutes={baseResult.recommendedProcessingMinutes}
        pricePerGram={0.18}
        markupMultiplier={4}
        productCost={null}
        recommendedServicePrice={null}
        servicePrice={null}
        {...noOps}
      />
    );

    // Primary shade keeps its 30g share; +10g of the additional shade pulls developer
    // along with it at the 1:1 ratio: 30:30 -> 8.1-30.0g / 8.3-10.0g / developer 40.0g.
    expect(html).toContain('8.1-30.0 g 8.3-10.0 g developer 40.0 g');
  });

  it('omits the second shade from the mix line when no grams were entered', () => {
    const html = renderToStaticMarkup(
      <FormulaResults
        brandName="Generic"
        line={null}
        targetShade={targetShade}
        startLevel={8}
        grayPercent={0}
        applicationZone="full-head"
        result={baseResult}
        additionalShade={null}
        additionalShadeGrams={0}
        neutralizationApplied={false}
        appliedBy="stylist@example.com"
        processingMinutes={baseResult.recommendedProcessingMinutes}
        pricePerGram={0.18}
        markupMultiplier={4}
        productCost={null}
        recommendedServicePrice={null}
        servicePrice={null}
        {...noOps}
      />
    );

    expect(html).toContain('8.1-30.0 g developer 30.0 g');
    expect(html).not.toContain('8.3');
  });
});
