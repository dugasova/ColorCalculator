import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import "../../i18n";
import { calculateFullFormula } from "../../engine/formula";
import type { Shade } from "../../engine/shades";
import { LiftOutcome, PorosityNotices, ToneWarnings } from "./FormulaNotices";

const ash8: Shade = { code: "8.1", level: 8, tone: "ash" };
const gold8: Shade = { code: "8.3", level: 8, tone: "gold" };
const depositOnly: Shade = { code: "8/73", level: 8, tone: "chocolate", developerVolumeChoices: [6, 13] };

const formula = (targetShade: Shade, overrides: Partial<Parameters<typeof calculateFullFormula>[0]> = {}) =>
  calculateFullFormula({ startLevel: 6, targetShade, grayPercent: 0, totalGrams: 60, ...overrides });

describe("LiftOutcome", () => {
  it("renders nothing when the target is reached", () => {
    expect(renderToStaticMarkup(<LiftOutcome result={formula(ash8)} targetShade={ash8} />)).toBe("");
  });

  it("warns that a deposit-only shade can't lift and shows the level actually reached", () => {
    const result = formula(depositOnly, { manualDeveloperVolume: 6 });
    const html = renderToStaticMarkup(<LiftOutcome result={result} targetShade={depositOnly} />);
    expect(html).toContain("can&#x27;t lift level");
    expect(html).toContain("Achievable level");
    expect(html).not.toContain("Not achievable");
  });

  it("falls back to the generic not-achievable message when no developer can reach the target", () => {
    const target: Shade = { code: "9.1", level: 9, tone: "ash" };
    const result = formula(target, { startLevel: 2 });
    const html = renderToStaticMarkup(<LiftOutcome result={result} targetShade={target} />);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("can&#x27;t lift level");
  });
});

describe("PorosityNotices", () => {
  it("renders nothing for normal porosity", () => {
    const html = renderToStaticMarkup(<PorosityNotices result={formula(ash8)} targetShade={ash8} porosity="normal" />);
    expect(html).toBe("");
  });

  it("explains the lowered developer and reminds about porous ends for high porosity", () => {
    const result = formula(ash8, { porosity: "high" });
    const html = renderToStaticMarkup(<PorosityNotices result={result} targetShade={ash8} porosity="high" />);
    expect(html).toContain("High porosity: developer lowered from 9% (30 vol) to 6% (20 vol)");
    expect(html).toContain("reduce processing time on the ends");
  });

  it("explains the extended time for low porosity, without the porous-ends reminder", () => {
    const result = formula(ash8, { porosity: "low" });
    const html = renderToStaticMarkup(<PorosityNotices result={result} targetShade={ash8} porosity="low" />);
    expect(html).toContain("Low porosity: recommended processing time extended by 5 min");
    expect(html).not.toContain("reduce processing time on the ends");
  });
});

describe("ToneWarnings", () => {
  it("renders nothing when the tone neutralizes and the shade has no start-level requirement", () => {
    const violet8: Shade = { code: "8.2", level: 8, tone: "violet" };
    expect(renderToStaticMarkup(<ToneWarnings result={formula(violet8)} neutralizationApplied={false} />)).toBe("");
  });

  it("warns about a tone that won't neutralize, until the corrector is applied", () => {
    const result = formula(gold8);
    expect(renderToStaticMarkup(<ToneWarnings result={result} neutralizationApplied={false} />)).toContain(
      "won&#x27;t neutralize",
    );
    expect(renderToStaticMarkup(<ToneWarnings result={result} neutralizationApplied={true} />)).toBe("");
  });

  it("keeps the eligibility warning regardless of neutralization", () => {
    const needsLightBase: Shade = { code: "12/0", level: 8, tone: "violet", minStartLevel: 7 };
    const html = renderToStaticMarkup(<ToneWarnings result={formula(needsLightBase)} neutralizationApplied={true} />);
    expect(html).toContain("requires a starting level of 7 or higher");
  });
});
