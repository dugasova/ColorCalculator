// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "../../i18n";
import FormulaCalculator from "./FormulaCalculator";
import { chooseOption } from "../../testDom";

afterEach(cleanup);

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

  it("shows the same 40 g of dye as a total once root touch-up is switched to total weight", () => {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);

    chooseOption("Application", "root-touch-up");
    chooseOption("Amount entered as", "total");

    // 1:1 here: 40 g of dye + 40 g of developer.
    expect((screen.getByLabelText("Total weight, g") as HTMLInputElement).value).toBe("80");
    expect(screen.getByText(/developer 40\.0 g/)).toBeInTheDocument();
  });

  it("switches back to an 80 g total-weight entry for full head", () => {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);

    chooseOption("Application", "root-touch-up");
    chooseOption("Application", "full-head");

    expect((screen.getByLabelText("Total weight, g") as HTMLInputElement).value).toBe("80");
    expect(screen.getByText(/developer 40\.0 g/)).toBeInTheDocument();
  });
});
