// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "../../i18n";
import FormulaCalculator from "./FormulaCalculator";

afterEach(cleanup);

// See FormulaCalculator.gramsInput.test.tsx for why the custom Select is driven by clicks.
function chooseOption(labelText: string, value: string) {
  fireEvent.click(screen.getByLabelText(labelText));
  const option = document.querySelector(`[role="option"][data-value="${value}"]`);
  if (option === null) throw new Error(`No option with value "${value}" in the "${labelText}" dropdown`);
  fireEvent.click(option);
}

// The Porosity field feeds the formula itself (engine/formula.ts's applyPorosity), not
// just the saved hair description. Defaults: start level 10 -> Generic 1.0, no lift, so
// the developer is already the gentlest and only the low-porosity time change shows.
describe("FormulaCalculator porosity", () => {
  it("extends the recommended time and explains it for low porosity", () => {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);
    expect(screen.getByText("Recommended: 30 min")).toBeInTheDocument();

    chooseOption("Porosity", "low");

    expect(screen.getByText("Recommended: 35 min")).toBeInTheDocument();
    expect((screen.getByLabelText("Processing time, min") as HTMLInputElement).value).toBe("35");
    expect(screen.getByText(/Low porosity: recommended processing time extended by 5 min/)).toBeInTheDocument();
  });

  it("shows no porosity note when there is nothing to adjust", () => {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);

    chooseOption("Porosity", "high");

    expect(screen.queryByText(/High porosity: developer lowered/)).not.toBeInTheDocument();
    expect(screen.getByText("Recommended: 30 min")).toBeInTheDocument();
  });
});
