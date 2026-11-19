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

describe("FormulaCalculator comparison", () => {
  it("pins the current formula as A and shows the live one as B, flagging what differs", () => {
    render(<Harness />);
    chooseOption("Shade", "7.1");
    fireEvent.click(screen.getByRole("button", { name: "Compare with another formula" }));

    // Straight after pinning, A and B are the same formula: nothing differs.
    expect(screen.getByRole("heading", { name: "Formula comparison" })).toBeInTheDocument();
    expect(document.querySelectorAll(".comparison__row--differs")).toHaveLength(0);

    chooseOption("Shade", "7.0");
    expect(cells("shade")).toEqual(["Generic 7.1", "Generic 7.0"]);
    expect(row("shade").classList.contains("comparison__row--differs")).toBe(true);
    expect(row("ratio").classList.contains("comparison__row--differs")).toBe(false);
    // Hair that is the same for both is shown once, above the table.
    expect(document.querySelector(".comparison__shared")?.textContent).toContain("Starting level: 10");
    expect(document.querySelector('.comparison__table tr[data-row="startLevel"]')).toBeNull();
  });

  it("moves a differing start level into the table", () => {
    render(<Harness />);
    chooseOption("Shade", "7.1");
    fireEvent.click(screen.getByRole("button", { name: "Compare with another formula" }));
    chooseOption("Starting level", "6");

    expect(cells("startLevel")).toEqual(["10", "6"]);
    expect(row("startLevel").classList.contains("comparison__row--differs")).toBe(true);
    expect(document.querySelector(".comparison__shared")?.textContent).not.toContain("Starting level");
  });

  it("keeps A across leaving the screen, re-pins and ends the comparison", () => {
    render(<Harness />);
    chooseOption("Shade", "7.1");
    fireEvent.click(screen.getByRole("button", { name: "Compare with another formula" }));

    fireEvent.click(screen.getByRole("button", { name: "toggle screen" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle screen" }));
    // A survives; the fresh calculator's own default shade is B.
    expect(cells("shade")[0]).toBe("Generic 7.1");

    chooseOption("Shade", "7.0");
    fireEvent.click(screen.getByRole("button", { name: "Make the current formula A" }));
    expect(cells("shade")).toEqual(["Generic 7.0", "Generic 7.0"]);

    fireEvent.click(screen.getByRole("button", { name: "End comparison" }));
    expect(screen.queryByRole("heading", { name: "Formula comparison" })).toBeNull();
    expect(screen.getByRole("button", { name: "Compare with another formula" })).toBeInTheDocument();
  });
});
