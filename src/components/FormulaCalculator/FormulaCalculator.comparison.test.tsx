// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import FormulaCalculator from "./FormulaCalculator";
import type { ComparedFormula } from "./formulaComparison";
import { chooseOption } from "../../testDom";

afterEach(cleanup);

// Formula A lives above the calculator, as in AuthenticatedApp: hiding and showing the
// calculator again stands in for switching screens.
function Harness() {
  const [pinned, setPinned] = useState<ComparedFormula | null>(null);
  const [shown, setShown] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setShown(value => !value)}>
        toggle screen
      </button>
      {shown && (
        <FormulaCalculator appliedBy="stylist@example.com" pinnedFormula={pinned} onPinnedFormulaChange={setPinned} />
      )}
    </>
  );
}

function row(id: string): HTMLTableRowElement {
  const element = document.querySelector<HTMLTableRowElement>(`.comparison__table tr[data-row="${id}"]`);
  if (element === null) throw new Error(`No comparison row "${id}"`);
  return element;
}

function cells(id: string): string[] {
  return Array.from(row(id).querySelectorAll("td")).map(cell => cell.textContent ?? "");
}

function startComparison() {
  fireEvent.click(screen.getByRole("button", { name: "Compare with another formula" }));
}

// Opens the sheet from the bottom bar, every row shown (not only the differing ones).
function openSheet({ allRows = true } = {}) {
  fireEvent.click(screen.getByRole("button", { name: /^A: / }));
  if (allRows) fireEvent.click(screen.getByLabelText("Differences only"));
}

describe("FormulaCalculator comparison", () => {
  it("shows A and the difference count in the bottom bar", () => {
    render(<Harness />);
    chooseOption("Shade", "7.1");
    startComparison();

    const bar = screen.getByRole("button", { name: /^A: / });
    expect(bar.textContent).toContain("A: Generic 7.1");
    expect(bar.textContent).toContain("same");
    expect(screen.queryByRole("button", { name: "Compare with another formula" })).toBeNull();

    chooseOption("Shade", "7.0");
    expect(bar.textContent).toContain("differences: ");
  });

  it("shows only the differing rows by default, every row on request", () => {
    render(<Harness />);
    chooseOption("Shade", "7.1");
    startComparison();
    openSheet({ allRows: false });
    // Straight after pinning, A and B are the same formula: nothing to show.
    expect(screen.getByText(/^The formulas are the same/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    chooseOption("Shade", "7.0");
    openSheet({ allRows: false });
    expect(cells("shade")).toEqual(["Generic 7.1", "Generic 7.0"]);
    expect(document.querySelector('.comparison__table tr[data-row="ratio"]')).toBeNull();

    fireEvent.click(screen.getByLabelText("Differences only"));
    expect(row("shade").classList.contains("comparison__row--differs")).toBe(true);
    expect(row("ratio").classList.contains("comparison__row--differs")).toBe(false);
    // Hair that is the same for both is shown once, above the table.
    expect(document.querySelector(".comparison__shared")?.textContent).toContain("Starting level: 10");
    expect(document.querySelector('.comparison__table tr[data-row="startLevel"]')).toBeNull();
  });

  it("moves a differing start level into the table", () => {
    render(<Harness />);
    chooseOption("Shade", "7.1");
    startComparison();
    chooseOption("Starting level", "6");
    openSheet();

    expect(cells("startLevel")).toEqual(["10", "6"]);
    expect(row("startLevel").classList.contains("comparison__row--differs")).toBe(true);
    expect(document.querySelector(".comparison__shared")?.textContent).not.toContain("Starting level");
  });

  it("keeps A across leaving the screen, re-pins and ends the comparison", () => {
    render(<Harness />);
    chooseOption("Shade", "7.1");
    startComparison();

    fireEvent.click(screen.getByRole("button", { name: "toggle screen" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle screen" }));
    // A survives; the fresh calculator's own default shade is B.
    openSheet();
    expect(cells("shade")[0]).toBe("Generic 7.1");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    chooseOption("Shade", "7.0");
    // The sheet keeps showing every row: the choice stays between openings.
    openSheet({ allRows: false });
    expect(screen.getByLabelText("Differences only")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Make the current formula A" }));
    expect(cells("shade")).toEqual(["Generic 7.0", "Generic 7.0"]);

    fireEvent.click(screen.getByRole("button", { name: "End comparison" }));
    expect(screen.queryByRole("heading", { name: "Formula comparison" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^A: / })).toBeNull();
    expect(screen.getByRole("button", { name: "Compare with another formula" })).toBeInTheDocument();
  });
});
