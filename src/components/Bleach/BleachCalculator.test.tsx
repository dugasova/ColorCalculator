import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import "../../i18n";
import { calculateBleachFormula } from "../../engine/bleach";
import { BRANDS } from "../../engine/brands";
import { BleachCalculator, BleachResults } from "./BleachCalculator";

const noPricing = {
  pricePerGram: 0.1,
  onPricePerGramChange: () => {},
  markupMultiplier: 4,
  onMarkupMultiplierChange: () => {},
  productCost: null,
  recommendedServicePrice: null,
};

describe("BleachCalculator", () => {
  it("renders the default scenario (level 6 -> 8) with computed developer, ratio, mix, and pricing", () => {
    const html = renderToStaticMarkup(<BleachCalculator />);

    expect(html).toContain('calculator__title-accent">Calculator<');
    expect(html).toContain('id="currentLevel"');
    expect(html).toContain('id="targetLevel"');
    expect(html).toContain('id="totalGrams"');
    expect(html).toContain("6 vol"); // 2-level lift -> 6vol now covers up to 3 levels
    expect(html).toContain("1 : 2"); // mixing ratio is now uniformly 1:2
    expect(html).toContain("g bleach powder");
    expect(html).toContain('id="bleachPricePerGram"');
    expect(html).toContain('id="bleachMarkupMultiplier"');
    expect(html).toContain("2.00"); // productCost: 20g powder (developer excluded) @ default 0.10/g
    expect(html).toContain("8.00"); // recommendedServicePrice: 2.00 * default 4x markup
    expect(html).not.toContain("choose a target level above your current level");
    expect(html).not.toContain("cannot be done in a single session");
  });

  it("shows the multi-step warning when the requested lift exceeds a single session (1 -> 10)", () => {
    const result = calculateBleachFormula(1, 10, 60);
    const html = renderToStaticMarkup(<BleachResults result={result} {...noPricing} />);

    expect(html).toContain("cannot be done in a single session");
    expect(html).toContain("1-2 weeks");
    expect(html).not.toContain("choose a target level above your current level");
    expect(html).not.toContain("g bleach powder"); // no grams — no single-session formula
  });

  it("shows the no-lift warning when the target level equals the current level", () => {
    const result = calculateBleachFormula(7, 7, 60);
    const html = renderToStaticMarkup(<BleachResults result={result} {...noPricing} />);

    expect(html).toContain("choose a target level above your current level");
    expect(html).not.toContain("cannot be done in a single session");
    expect(html).not.toContain("g bleach powder"); // no grams — no lift, no formula
  });

  it("offers a toner brand and line on the page", () => {
    const html = renderToStaticMarkup(<BleachCalculator />);
    expect(html).toContain('id="brandIdToner"');
    expect(html).toContain("Toner brand");
  });

  it("lists the toner line's shades that cancel the background", () => {
    const html = renderToStaticMarkup(
      <BleachResults
        result={calculateBleachFormula(6, 9, 60)}
        {...noPricing}
        toner={{ brand: BRANDS.igora, line: "vibrance" }}
      />,
    );
    expect(html).toContain("Toner shades");
    expect(html).toContain("9-1, 9-12");
  });

  it("names Matrix Super Sync's ash + violet toner mix", () => {
    const html = renderToStaticMarkup(
      <BleachResults
        result={calculateBleachFormula(6, 10, 60)}
        {...noPricing}
        toner={{ brand: BRANDS.matrix, line: "super-sync" }}
      />,
    );
    expect(html).toContain("Toner mix");
    expect(html).toContain("10A + 10V, 1:2 or 1:3");
  });

  it("says when the toner line has no shade for the background", () => {
    const html = renderToStaticMarkup(
      <BleachResults
        result={calculateBleachFormula(6, 8, 60)}
        {...noPricing}
        toner={{ brand: BRANDS.igora, line: "vibrance" }}
      />,
    );
    expect(html).toContain("this line has no level 8 shade");
  });

  it("shows no toner shades row without a toner", () => {
    const html = renderToStaticMarkup(<BleachResults result={calculateBleachFormula(6, 9, 60)} {...noPricing} />);
    expect(html).not.toContain("Toner shades");
  });
});
