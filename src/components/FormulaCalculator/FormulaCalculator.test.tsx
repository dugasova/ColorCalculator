import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '../../i18n';
import { calculateFullFormula, applyAdditionalShade, splitShadeBlend } from '../../engine/formula';
import { calculatePrePigmentation } from '../../engine/prePigmentation';
import type { Shade } from '../../engine/shades';
import type { RepeatFormulaRequest } from '../../history';
import FormulaCalculator from './FormulaCalculator';
import { FormulaResults } from './FormulaResults';

describe('FormulaCalculator', () => {
  it('renders the additional shade selector but hides its grams input until a shade is chosen', () => {
    const html = renderToStaticMarkup(<FormulaCalculator appliedBy="stylist@example.com" />);

    expect(html).toContain('id="additionalShadeCode"');
    expect(html).not.toContain('id="additionalShadeGrams"');
  });

  it('renders the substitute-blend toggle but hides the two component fields until it is enabled', () => {
    const html = renderToStaticMarkup(<FormulaCalculator appliedBy="stylist@example.com" />);

    expect(html).toContain('id="substituteBlend"');
    expect(html).not.toContain('id="blendShadeA"');
    expect(html).not.toContain('id="blendShadeB"');
  });

  it('renders a collapsed cross-brand match trigger, with the results list absent until expanded', () => {
    const html = renderToStaticMarkup(<FormulaCalculator appliedBy="stylist@example.com" />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('cross-brand-match-list');
    expect(html).not.toContain('cross-brand-match-empty');
  });

  it('hides the pre-pigmentation checkbox when the level drop is under 2 (no lift/no drop)', () => {
    const repeatRequest: RepeatFormulaRequest = {
      brandId: 'generic', line: null, targetShadeCode: '8.1', startLevel: 8, grayPercent: 0, totalGrams: 60,
      manualDeveloperVolume: undefined, additionalShadeCode: null, additionalShadeGrams: 0,
      blendShadeACode: null, blendShadeBCode: null, blendPrimaryPercent: 70,
      processingMinutes: 30, applicationZone: 'full-head', pricePerGram: 0.18, markupMultiplier: 4,
      servicePrice: undefined, prePigmentationEnabled: false,
    };
    const html = renderToStaticMarkup(<FormulaCalculator appliedBy="stylist@example.com" repeatRequest={repeatRequest} />);

    expect(html).not.toContain('id="prePigmentationEnabled"');
  });

  it('shows the pre-pigmentation checkbox, unchecked, when the level drop is 2 or more and the repeated entry never opted in', () => {
    const repeatRequest: RepeatFormulaRequest = {
      brandId: 'generic', line: null, targetShadeCode: '5.4', startLevel: 9, grayPercent: 0, totalGrams: 30,
      manualDeveloperVolume: undefined, additionalShadeCode: null, additionalShadeGrams: 0,
      blendShadeACode: null, blendShadeBCode: null, blendPrimaryPercent: 70,
      processingMinutes: 30, applicationZone: 'full-head', pricePerGram: 0.18, markupMultiplier: 4,
      servicePrice: undefined, prePigmentationEnabled: false,
    };
    const html = renderToStaticMarkup(<FormulaCalculator appliedBy="stylist@example.com" repeatRequest={repeatRequest} />);

    expect(html).toContain('id="prePigmentationEnabled"');
    expect(html).toContain('Required, same visit');
    expect(html).not.toContain('Step 1');
  });

  it('restores an opted-in filler step when repeating an entry that had it checked', () => {
    const repeatRequest: RepeatFormulaRequest = {
      brandId: 'generic', line: null, targetShadeCode: '5.4', startLevel: 9, grayPercent: 0, totalGrams: 30,
      manualDeveloperVolume: undefined, additionalShadeCode: null, additionalShadeGrams: 0,
      blendShadeACode: null, blendShadeBCode: null, blendPrimaryPercent: 70,
      processingMinutes: 30, applicationZone: 'full-head', pricePerGram: 0.18, markupMultiplier: 4,
      servicePrice: undefined, prePigmentationEnabled: true,
    };
    const html = renderToStaticMarkup(<FormulaCalculator appliedBy="stylist@example.com" repeatRequest={repeatRequest} />);

    expect(html).toContain('Step 1');
    expect(html).toContain('Generic 5.4 (Copper)');
  });
});

describe('FormulaResults pre-pigmentation step', () => {
  const targetShade: Shade = { code: '5.4', level: 5, tone: 'copper' };
  // 4-level drop (9 -> 5): 1:1 no-lift ratio, 30g total -> 15g color : 15g developer.
  const baseResult = calculateFullFormula(9, targetShade, 0, 30);
  const prePigmentationResult = calculatePrePigmentation(9, 5, 30);

  const noOps = {
    onProcessingMinutesChange: () => {},
    onPricePerGramChange: () => {},
    onMarkupMultiplierChange: () => {},
    onServicePriceChange: () => {},
    onNeutralizationAppliedChange: () => {},
  };

  it('renders the filler step ahead of a "Step 2" heading once opted in, with the Generic-line example', () => {
    const html = renderToStaticMarkup(
      <FormulaResults
        brandName="Generic"
        line={null}
        targetShade={targetShade}
        startLevel={9}
        grayPercent={0}
        applicationZone="full-head"
        result={baseResult}
        additionalShade={null}
        additionalShadeGrams={0}
        blend={null}
        prePigmentationResult={prePigmentationResult}
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

    expect(html).toContain('Step 1');
    expect(html).toContain('Filler');
    expect(html).toContain('Generic 5.4 (Copper)');
    expect(html).toContain('15.0 g filler');
    expect(html).toContain('Step 2');
    expect(html).toContain('Target color');
  });

  it('omits the filler step entirely when prePigmentationResult is null', () => {
    const html = renderToStaticMarkup(
      <FormulaResults
        brandName="Generic"
        line={null}
        targetShade={targetShade}
        startLevel={9}
        grayPercent={0}
        applicationZone="full-head"
        result={baseResult}
        additionalShade={null}
        additionalShadeGrams={0}
        blend={null}
        prePigmentationResult={null}
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

    expect(html).not.toContain('Step 1');
    expect(html).not.toContain('Step 2');
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
        blend={null}
        prePigmentationResult={null}
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
        blend={null}
        prePigmentationResult={null}
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

describe('FormulaResults substitute blend', () => {
  // The visual goal, 8/17 (ash/chocolate double reflect) -- not necessarily a physical
  // product on the shelf, so it must never show up in the Mix breakdown below.
  const targetShade: Shade = { code: '8/17', level: 8, tone: 'ash', secondaryTone: 'chocolate' };
  const shadeA: Shade = { code: '8/1', level: 8, tone: 'ash' };
  const shadeB: Shade = { code: '8/7', level: 8, tone: 'chocolate' };
  // No lift (level 8 -> 8): 1:1 ratio, 60g total -> 30g color : 30g developer.
  const baseResult = calculateFullFormula(8, targetShade, 0, 60);

  const noOps = {
    onProcessingMinutesChange: () => {},
    onPricePerGramChange: () => {},
    onMarkupMultiplierChange: () => {},
    onServicePriceChange: () => {},
    onNeutralizationAppliedChange: () => {},
  };

  it('lists only the two real components in the Mix line, splitting the single total, never the target shade', () => {
    const split = baseResult.grams !== null ? splitShadeBlend(baseResult.grams.colorGrams, 70) : null;
    const blend = split !== null
      ? { shadeA, shadeAGrams: split.primaryGrams, shadeB, shadeBGrams: split.secondaryGrams }
      : null;

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
        blend={blend}
        prePigmentationResult={null}
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

    // 70/30 split of the 30g color total: 21g shadeA, 9g shadeB; developer stays 30g --
    // unlike additive blending, the total is never grown.
    expect(html).toContain('8/1-21.0 g 8/7-9.0 g developer 30.0 g');
    // The target (8/17) is the visual goal, not a real product; it must not appear in Mix.
    expect(html).not.toContain('8/17-');
  });
});
