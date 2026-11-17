import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import "../../i18n";
import { ColorCorrectionCalculator } from "./ColorCorrectionCalculator";

describe("ColorCorrectionCalculator", () => {
  it("renders the default scenario (level 6 -> 8, orange) with computed developer, technique, and corrector", () => {
    const html = renderToStaticMarkup(<ColorCorrectionCalculator />);

    expect(html).toContain('calculator__title-accent">Correction<');
    expect(html).toContain("6% (20 vol)"); // 2-level lift -> 20vol/6%
    expect(html).toContain("Lift + Tone");
    // generic brand: the corrector is named by its tone, its grams an input to change
    expect(html).toContain('aria-label="Amount of ash, g" value="2"');
    expect(html).toContain("color- 30.0 g ash- 2.0 g developer 48.0 g"); // generic 1:1.5 on 32 g
    expect(html).toContain("At level 8 the lightening background is usually yellow-orange.");
    expect(html).toContain("neutralizes Orange through chromatic opposition");
    expect(html).toContain("On dark bases"); // orange-specific tip
    expect(html).toContain("Always perform a strand test");
    expect(html).toContain("2 g of corrector per 30 g of base color"); // Rule of 10: 10 - target level 8 = 2g per 30g
    expect(html).toContain('id="baseGrams"');
    expect(html).not.toContain("Multi-step correction");
  });

  it("renders every tone option and the level selects", () => {
    const html = renderToStaticMarkup(<ColorCorrectionCalculator />);

    for (const tone of [
      "Red",
      "Red-orange",
      "Orange-red",
      "Orange",
      "Orange-yellow",
      "Yellow-orange",
      "Yellow",
      "Green",
      "Blue",
      "Violet",
    ]) {
      expect(html).toContain(`>${tone}<`);
    }
    expect(html).toContain('id="currentLevel"');
    expect(html).toContain('id="targetLevel"');
  });

  it("renders the neutralization wheel with a title and all 6 tone wedges", () => {
    const html = renderToStaticMarkup(<ColorCorrectionCalculator />);

    expect(html).toContain('class="neutralization-wheel"');
    expect(html).toContain("Neutralization wheel");
    // Scoped to the wheel's own <svg>...</svg> -- the page also renders a chevron <path>
    // per Select trigger button (see components/common/Select), which a page-wide count
    // would otherwise pick up.
    const svgStart = html.indexOf('class="neutralization-wheel__svg"');
    const svgMarkup = html.slice(svgStart, html.indexOf("</svg>", svgStart));
    expect((svgMarkup.match(/<path /g) || []).length).toBe(6);
  });
});
