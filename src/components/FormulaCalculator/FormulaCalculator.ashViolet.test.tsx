// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "../../i18n";
import FormulaCalculator from "./FormulaCalculator";
import { chooseOption } from "../../testDom";

afterEach(cleanup);

// Matrix Super Sync's ash shade on a light blonde is mixed with its violet one (see
// engine/ashVioletMix.ts). Start level 10 (the default) toning with 10A: 1:2 by default.
describe("FormulaCalculator ash + violet mix", () => {
  it("splits the dye between 10A and 10V and lets the colorist pick the other ratio", () => {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);
    chooseOption("Brand", "matrix");
    chooseOption("Line", "super-sync");
    chooseOption("Shade", "10A");

    // 80 g full head at 1:1: 40 g of dye, 1:2 -> 13.3 g 10A + 26.7 g 10V
    expect(screen.getAllByText(/10A- 13\.3 g 10V- 26\.7 g developer 40\.0 g/).length).toBeGreaterThan(0);

    chooseOption("10A + 10V ratio", "1:3");
    expect(screen.getAllByText(/10A- 10\.0 g 10V- 30\.0 g developer 40\.0 g/).length).toBeGreaterThan(0);
  });

  it("shows no ratio field for another shade", () => {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);
    chooseOption("Brand", "matrix");
    chooseOption("Line", "super-sync");
    chooseOption("Shade", "10P");
    expect(screen.queryByLabelText(/ratio$/)).not.toBeInTheDocument();
  });
});
