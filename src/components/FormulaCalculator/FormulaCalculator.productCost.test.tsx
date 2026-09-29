// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "../../i18n";
import FormulaCalculator from "./FormulaCalculator";

afterEach(cleanup);

function productCostText(): string | null {
  return screen.getByText("Product cost").nextElementSibling?.textContent ?? null;
}

// Regression: Product cost/Service price used to price the developer at the same
// per-gram rate as the dye itself (colorGrams + developerGrams) -- a salon buys and
// prices developer completely separately from the dye tube (see sessionCost.ts's
// stepTotalGrams), so that overstated the real product cost. Pre-pigmentation filler was
// the opposite bug: its dye-equivalent grams were never priced at all, even though it's
// a real product weighed out just like the main formula's dye.
describe("FormulaCalculator product cost", () => {
  it("prices only the dye grams, not the developer", () => {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);

    // Default state: Generic brand (0.10/g), full-head 80g total, start level 10 ->
    // Generic "1.0" (level 1, no lift) -> 1:1 ratio -> 40g dye / 40g developer.
    // Dye-only cost: 40 * 0.10 = 4.00 (would be 8.00 if developer were still priced in).
    expect(productCostText()).toBe("4.00");
  });

  it("adds the pre-pigmentation filler's dye-equivalent grams once opted in, ignoring its diluent", () => {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);

    fireEvent.click(screen.getByLabelText("Add pre-pigmentation step"));

    // Filler mixes 1:1 with diluent from the same 80g total -> 40g filler / 40g diluent.
    // New cost: (40g dye + 40g filler) * 0.10 = 8.00 (diluent, like developer, excluded).
    expect(productCostText()).toBe("8.00");
  });
});
