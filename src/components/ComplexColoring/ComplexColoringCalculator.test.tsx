// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "../../i18n";
import ComplexColoringCalculator from "./ComplexColoringCalculator";

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
});
