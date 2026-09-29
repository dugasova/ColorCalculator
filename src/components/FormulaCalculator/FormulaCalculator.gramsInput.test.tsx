// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "../../i18n";
import FormulaCalculator from "./FormulaCalculator";

afterEach(cleanup);

// The custom Select (see components/common/Select) has no native <select> "change" event
// to fire -- it opens on a click of its trigger button and commits a value on a click of
// the matching option, identified by the `data-value` the component stamps on each
// <li role="option">. This mirrors how a colorist actually operates it.
function chooseOption(labelText: string, value: string) {
  fireEvent.click(screen.getByLabelText(labelText));
  const option = document.querySelector(`[role="option"][data-value="${value}"]`);
  if (option === null) throw new Error(`No option with value "${value}" in the "${labelText}" dropdown`);
  fireEvent.click(option);
}

// Regression/feature: choosing "Root touch-up" should switch the amount field to a
// dye-only entry (40 g of color, developer derived from the ratio) instead of the
// full-head default of a combined total-weight entry -- see
// APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE. The mode select itself stays available so a
// colorist can still override it and type any amount either way.
describe("FormulaCalculator grams input mode by application zone", () => {
  it("switches to a 40 g dye-only entry for root touch-up, deriving developer from it", () => {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);

    chooseOption("Application", "root-touch-up");

    expect((screen.getByLabelText("Color, g") as HTMLInputElement).value).toBe("40");
    expect(screen.getByText(/developer 40\.0 g/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Color, g"), { target: { value: "55" } });
    expect(screen.getByText(/developer 55\.0 g/)).toBeInTheDocument();
  });

  it("switches back to an 80 g total-weight entry for full head", () => {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);

    chooseOption("Application", "root-touch-up");
    chooseOption("Application", "full-head");

    expect((screen.getByLabelText("Total weight, g") as HTMLInputElement).value).toBe("80");
    expect(screen.getByText(/developer 40\.0 g/)).toBeInTheDocument();
  });
});
