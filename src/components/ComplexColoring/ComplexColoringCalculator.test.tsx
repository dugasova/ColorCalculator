// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "../../i18n";
import ComplexColoringCalculator from "./ComplexColoringCalculator";
import { PaletteReactContext } from "../../palette";
import { BRANDS } from "../../engine/brands";
import { GENERIC_SHADE_CHART } from "../../engine/brands/generic";
import { shadeStockId, type StockRecord } from "../../stock";
import { DEFAULT_PRICING_SETTINGS } from "../../salonSettings";

// This project doesn't set vitest's `test.globals: true`, so @testing-library/react's
// automatic afterEach cleanup never registers -- see ColorStepCard.interaction.test.tsx
// for the same note.
afterEach(cleanup);

describe("ComplexColoringCalculator", () => {
  // Regression: useShadeFormulaState's `result`/`effectiveResult` used to be plain
  // (unmemoized) object literals rebuilt on every render. ColorStepCard's "report the
  // computed step up" effect depends on `effectiveResult`'s identity, so a brand-new
  // object every render fired that effect every render -- which calls this component's
  // setComputedSteps, which re-renders every ColorStepCard, which rebuilds another new
  // object, forever: "Maximum update depth exceeded" the instant a color step mounted.
  it("adds a color step without looping into 'Maximum update depth exceeded'", () => {
    render(<ComplexColoringCalculator appliedBy="Test Stylist" />);

    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: "+ Add color step" }));
    }).not.toThrow();

    // The step actually mounted and reported its computed formula up (a real symptom of
    // the loop was React aborting the render before this ever committed).
    expect(document.getElementById("brandId-step-0")).not.toBeNull();
  });

  it("adds a bleach step and a color step together without looping", () => {
    render(<ComplexColoringCalculator appliedBy="Test Stylist" />);

    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: "+ Add bleach step" }));
      fireEvent.click(screen.getByRole("button", { name: "+ Add color step" }));
    }).not.toThrow();

    expect(screen.getAllByRole("button", { name: "Remove step" })).toHaveLength(2);
  });

  // Regression: calculatePrePigmentation built a fresh object literal every render, fed
  // straight into ColorStepCard's own "report the computed step up" effect deps
  // unmemoized -- same "Maximum update depth exceeded" failure mode as the
  // effectiveResult regression above, triggered specifically by opting into the
  // pre-pigmentation checkbox (calculatePrePigmentation only runs once enabled).
  it("toggles pre-pigmentation on a color step without looping into 'Maximum update depth exceeded'", () => {
    render(<ComplexColoringCalculator appliedBy="Test Stylist" />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add color step" }));

    // Default startLevel (10) -> default target shade (Generic 1.0, level 1) already
    // warrants pre-pigmentation (see ColorStepCard.test.tsx), so the checkbox is present.
    expect(() => {
      fireEvent.click(screen.getByLabelText("Add pre-pigmentation step"));
    }).not.toThrow();

    expect((screen.getByLabelText("Add pre-pigmentation step") as HTMLInputElement).checked).toBe(true);
  });

  it("shows a stock shortage warning for the session once a step's shade is drawn from tracked, insufficient stock", () => {
    const genericShade = GENERIC_SHADE_CHART[0];
    const shortStock: StockRecord[] = [{
      id: shadeStockId("generic", genericShade.line ?? null, genericShade.code),
      kind: "shade",
      brandId: "generic",
      line: genericShade.line ?? null,
      code: genericShade.code,
      remainingGrams: 1,
    }];

    render(
      <PaletteReactContext.Provider value={{ brands: BRANDS, customBrands: [], overrides: [], stock: shortStock, pricingSettings: DEFAULT_PRICING_SETTINGS }}>
        <ComplexColoringCalculator appliedBy="Test Stylist" />
      </PaletteReactContext.Provider>
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Add color step" }));

    expect(screen.getByText(/Not enough/)).toBeTruthy();
  });

  it("shows no stock shortage warning when nothing is tracked", () => {
    render(
      <PaletteReactContext.Provider value={{ brands: BRANDS, customBrands: [], overrides: [], stock: [], pricingSettings: DEFAULT_PRICING_SETTINGS }}>
        <ComplexColoringCalculator appliedBy="Test Stylist" />
      </PaletteReactContext.Provider>
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Add color step" }));

    expect(screen.queryByText(/Not enough/)).toBeNull();
  });
});
