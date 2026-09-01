import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '../../i18n';
import { ColorStepCard } from './ColorStepCard';

describe('ColorStepCard', () => {
  it('renders the default scenario (generic brand, first shade) with every present field suffixed by stepId', () => {
    const html = renderToStaticMarkup(<ColorStepCard stepId="1" onChange={() => {}} onRemove={() => {}} />);

    expect(html).toContain('id="brandId-1"');
    expect(html).toContain('id="startLevel-1"');
    expect(html).toContain('id="grayPercent-1"');
    expect(html).toContain('id="targetShadeCode-1"');
    expect(html).toContain('id="additionalShadeCode-1"');
    expect(html).toContain('id="applicationZone-1"');
    expect(html).toContain('id="totalGrams-1"');
    expect(html).toContain('id="stepProcessingMinutes-1"');
    expect(html).toContain('id="stepPricePerGram-1"');
  });

  it('hides fields whose prerequisite is not met yet', () => {
    const html = renderToStaticMarkup(<ColorStepCard stepId="1" onChange={() => {}} onRemove={() => {}} />);

    // The generic chart has one (untagged) line and the first shade has no developer
    // volume choices -- LineField and DeveloperVolumeField render nothing for it.
    expect(html).not.toContain('id="line-1"');
    expect(html).not.toContain('id="manualDeveloperVolume-1"');
    // No additional shade chosen yet -- its grams input has nothing to control.
    expect(html).not.toContain('id="additionalShadeGrams-1"');
  });

  it('defaults the price-per-gram field to 0.18, independent of any brand default', () => {
    const html = renderToStaticMarkup(<ColorStepCard stepId="1" onChange={() => {}} onRemove={() => {}} />);
    expect(html).toContain('id="stepPricePerGram-1" type="number" min="0" step="0.01" value="0.18"');
  });

  it('keeps every field id distinct across two steps rendered in the same session', () => {
    // Mirrors what ComplexColoringCalculator actually renders: several ColorStepCards'
    // markup on one page -- an unsuffixed id here would mean a <label htmlFor> could point
    // at the wrong step's control once there's more than one step.
    const htmlA = renderToStaticMarkup(<ColorStepCard stepId="a" onChange={() => {}} onRemove={() => {}} />);
    const htmlB = renderToStaticMarkup(<ColorStepCard stepId="b" onChange={() => {}} onRemove={() => {}} />);
    const combined = htmlA + htmlB;

    expect(htmlA).toContain('id="brandId-a"');
    expect(htmlB).toContain('id="brandId-b"');
    expect((combined.match(/id="brandId-a"/g) ?? []).length).toBe(1);
    expect((combined.match(/id="brandId-b"/g) ?? []).length).toBe(1);
  });

  it('renders the step title and remove button', () => {
    const html = renderToStaticMarkup(<ColorStepCard stepId="1" onChange={() => {}} onRemove={() => {}} />);
    expect(html).toContain('step-card__title');
    expect(html).toContain('step-card__remove');
  });

  it('shows the formula results but not the neutralization toggle when no corrective tone is needed', () => {
    const html = renderToStaticMarkup(<ColorStepCard stepId="1" onChange={() => {}} onRemove={() => {}} />);
    expect(html).toContain('results__row-label');
    expect(html).not.toContain('results__neutralization-toggle');
  });
});
