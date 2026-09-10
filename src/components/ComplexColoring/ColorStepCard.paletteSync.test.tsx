// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import { ColorStepCard } from "./ColorStepCard";
import { PaletteReactContext, type PaletteState } from "../../palette";
import { BRANDS, type Brand, type BrandId } from "../../engine/brands";
import { GENERIC_SHADE_CHART } from "../../engine/brands/generic";
import { getMixingRatio } from "../../engine/formula";
import type { Shade } from "../../engine/shades";
import type { ColorHistoryStep } from "../../history";

// See ColorStepCard.interaction.test.tsx for why this project needs an explicit
// afterEach(cleanup): it doesn't set vitest's `test.globals: true`.
afterEach(cleanup);

// useShadeFormulaState's initial targetShadeCode state is GENERIC_SHADE_CHART[0].code (a
// static import, independent of whatever `brands` the live palette context provides) --
// reusing that exact shade as the fixture's first entry keeps the component's normal
// initial-mount selection intact, so each test's setup interaction (picking a *different*
// shade) starts from the real default instead of an already-broken one.
const shadeA = GENERIC_SHADE_CHART[0];
const shadeB: Shade = { code: "TEST-B", level: shadeA.level, tone: "ash" };
const shadeOtherLine: Shade = { code: "TEST-C", level: 6, tone: "gold", line: "other-line" };

function brandsWith(shades: Shade[]): Record<BrandId, Brand> {
  return { ...BRANDS, generic: { id: "generic", name: "Generic", shades, mixingRatio: getMixingRatio, pricePerGram: 0.1 } };
}

function paletteState(shades: Shade[]): PaletteState {
  return { brands: brandsWith(shades), customBrands: [], overrides: [] };
}

// The custom Select (see components/common/Select) has no native <select> "change" event
// to fire -- it opens on a click of its trigger button and commits a value on a click of
// the matching option, identified by the `data-value` the component stamps on each
// <li role="option">. Mirrors ColorStepCard.interaction.test.tsx's own helper.
function chooseOption(labelText: string, value: string) {
  fireEvent.click(screen.getByLabelText(labelText));
  const option = document.querySelector(`[role="option"][data-value="${value}"]`);
  if (option === null) throw new Error(`No option with value "${value}" in the "${labelText}" dropdown`);
  fireEvent.click(option);
}

function lastStep(onChange: ReturnType<typeof vi.fn>): ColorHistoryStep {
  return onChange.mock.calls[onChange.mock.calls.length - 1][0];
}

describe("ColorStepCard live palette sync", () => {
  it("falls back to a shade still in the pool instead of crashing when the selected one is discontinued out from under an open step", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PaletteReactContext.Provider value={paletteState([shadeA, shadeB])}>
        <ColorStepCard stepId="1" onChange={onChange} onRemove={() => {}} />
      </PaletteReactContext.Provider>
    );

    chooseOption("Shade", shadeB.code);
    expect(lastStep(onChange).targetShade.code).toBe(shadeB.code);

    // Simulate an admin discontinuing shadeB (PaletteAdmin's toggle) while this step is
    // still open -- the live onSnapshot-fed palette context updates out from under it.
    rerender(
      <PaletteReactContext.Provider value={paletteState([shadeA])}>
        <ColorStepCard stepId="1" onChange={onChange} onRemove={() => {}} />
      </PaletteReactContext.Provider>
    );

    expect(lastStep(onChange).targetShade.code).toBe(shadeA.code);
    // The shade picker must show the fallback it actually recalculated for, not go blank
    // (a stale selected value that no longer matches any option renders no label).
    expect(screen.getByLabelText("Shade")).toHaveTextContent(shadeA.code);
  });

  it("does not crash when every shade in the selected line is discontinued out from under an open step", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PaletteReactContext.Provider value={paletteState([shadeA, shadeOtherLine])}>
        <ColorStepCard stepId="1" onChange={onChange} onRemove={() => {}} />
      </PaletteReactContext.Provider>
    );
    expect(lastStep(onChange).targetShade.code).toBe(shadeA.code);

    // shadeA's line (the untagged default line) loses its only shade entirely -- only
    // shadeOtherLine (a different line) survives.
    rerender(
      <PaletteReactContext.Provider value={paletteState([shadeOtherLine])}>
        <ColorStepCard stepId="1" onChange={onChange} onRemove={() => {}} />
      </PaletteReactContext.Provider>
    );

    expect(lastStep(onChange).targetShade.code).toBe(shadeOtherLine.code);
  });
});
