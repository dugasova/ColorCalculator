// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import "../../i18n";
import FormulaCalculator from "./FormulaCalculator";

afterEach(cleanup);

function openCombobox(name: string) {
  fireEvent.click(screen.getByRole("combobox", { name }));
}

// Regression for widening BLEND_LEVEL_TOLERANCE (useFormulaCalculatorState): a stylist
// missing a shade to substitute-blend should see stand-ins one level above and below the
// target too -- colorists routinely blend adjacent levels to approximate a missing one --
// but never the target's own code: blend mode exists precisely because the target is the
// one shade out of stock, so it must never be offered back as a stand-in for itself.
describe("FormulaCalculator substitute-blend candidates", () => {
  function selectTargetAndEnableBlend() {
    render(<FormulaCalculator appliedBy="stylist@example.com" />);

    // Generic chart's "8.1" (level 8, ash) -- both 7.x and 9.x neighbors exist to blend against.
    openCombobox("Shade");
    fireEvent.click(screen.getByRole("option", { name: "8.1 ash" }));

    fireEvent.click(screen.getByLabelText("Shade out of stock — blend two shades to approximate it"));
  }

  it("offers components one level above and below the target, not just the same level", () => {
    selectTargetAndEnableBlend();

    openCombobox("Component 1");
    const codes = within(screen.getByRole("listbox")).getAllByRole("option")
      .map(option => option.getAttribute("data-value"));

    expect(codes).toContain("7.1"); // one level below
    expect(codes).toContain("9.1"); // one level above
    expect(codes).toContain("8.0"); // same level, different reflect
    expect(codes).not.toContain("6.1"); // two levels below -- too far to blend
    expect(codes).not.toContain("10.1"); // two levels above -- too far to blend
  });

  it("never offers the target's own code -- it's the one shade that's out of stock", () => {
    selectTargetAndEnableBlend();

    openCombobox("Component 1");
    const codes = within(screen.getByRole("listbox")).getAllByRole("option")
      .map(option => option.getAttribute("data-value"));

    expect(codes).not.toContain("8.1");
  });

  it("keeps the additional-shade selector visible after enabling substitute blend -- the two aren't mutually exclusive", () => {
    selectTargetAndEnableBlend();

    expect(document.getElementById("additionalShadeCode")).not.toBeNull();
  });
});
