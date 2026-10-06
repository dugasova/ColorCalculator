// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import { AnalyticsView } from "./AnalyticsView";
import { subscribeToFormulaHistory } from "../../history";
import type { FormulaHistoryEntry } from "../../history";
import { makeColorStep } from "../../testFixtures";

vi.mock("../../history", async () => {
  const actual = await vi.importActual<typeof import("../../history")>("../../history");
  return {
    ...actual,
    subscribeToFormulaHistory: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const colorStep = makeColorStep();

function makeEntry(overrides: Partial<FormulaHistoryEntry> & { id: string; clientName: string }): FormulaHistoryEntry {
  return {
    clientId: null,
    note: "",
    appliedBy: "stylist@salon.test",
    appliedAt: { toDate: () => new Date("2024-03-01") } as unknown as FormulaHistoryEntry["appliedAt"],
    steps: [colorStep],
    markupMultiplier: 4,
    productCost: null,
    servicePrice: null,
    patchTestDate: "",
    allergyNotes: "",
    patchTestOverride: true,
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    ...overrides,
  };
}

function mockHistory(entries: FormulaHistoryEntry[]) {
  vi.mocked(subscribeToFormulaHistory).mockImplementation((_scope, onChange) => {
    onChange(entries);
    return () => {};
  });
}

function renderAnalyticsView(overrides: Partial<{ isAdmin: boolean }> = {}) {
  return render(<AnalyticsView isAdmin={overrides.isAdmin ?? false} currentUserEmail="stylist@salon.test" />);
}

// Mirrors ColorStepCard.interaction.test.tsx's own chooseOption helper: open the trigger
// by its label, then click the matching option by the `data-value` the component stamps
// on each <li role="option">.
function choosePeriod(value: string) {
  fireEvent.click(screen.getByLabelText("Period"));
  const option = document.querySelector(`[role="option"][data-value="${value}"]`);
  if (option === null) throw new Error(`No period option with value "${value}"`);
  fireEvent.click(option);
}

function totalVisitsValue(): string | null {
  return screen.getByText("Total visits").previousElementSibling?.textContent ?? null;
}

describe("AnalyticsView per-stylist section", () => {
  it("shows a 'By stylist' card per stylist for an admin", () => {
    mockHistory([
      makeEntry({ id: "1", clientName: "Anna", appliedBy: "a@salon.test" }),
      makeEntry({ id: "2", clientName: "Clara", appliedBy: "b@salon.test" }),
    ]);

    renderAnalyticsView({ isAdmin: true });

    expect(screen.getByText("By stylist")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "a@salon.test" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "b@salon.test" })).toBeInTheDocument();
  });

  it("hides the 'By stylist' section for a non-admin", () => {
    mockHistory([
      makeEntry({ id: "1", clientName: "Anna", appliedBy: "a@salon.test" }),
      makeEntry({ id: "2", clientName: "Clara", appliedBy: "b@salon.test" }),
    ]);

    renderAnalyticsView({ isAdmin: false });

    expect(screen.queryByText("By stylist")).not.toBeInTheDocument();
  });
});

describe("AnalyticsView period filter", () => {
  it("filters salon KPIs to the selected period", () => {
    const today = new Date();
    mockHistory([
      makeEntry({ id: "1", clientName: "Old", appliedAt: { toDate: () => new Date("2024-03-01") } as unknown as FormulaHistoryEntry["appliedAt"] }),
      makeEntry({ id: "2", clientName: "Recent", appliedAt: { toDate: () => today } as unknown as FormulaHistoryEntry["appliedAt"] }),
    ]);

    renderAnalyticsView({ isAdmin: true });
    expect(totalVisitsValue()).toBe("2");

    choosePeriod("last30Days");
    expect(totalVisitsValue()).toBe("1");
  });

  it("shows the empty-period message when every entry falls outside the selected period", () => {
    mockHistory([
      makeEntry({ id: "1", clientName: "Old", appliedAt: { toDate: () => new Date("2024-03-01") } as unknown as FormulaHistoryEntry["appliedAt"] }),
    ]);

    renderAnalyticsView({ isAdmin: true });
    choosePeriod("thisMonth");

    expect(screen.getByText("No visits in this period.")).toBeInTheDocument();
  });
});
