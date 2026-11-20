// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import { HistoryEntryCard } from "./HistoryEntryCard";
import type { ActualGramsEditor } from "./useActualGramsEditor";
import { makeBleachStep, makeColorStep, makeEntry } from "../../testFixtures";

afterEach(cleanup);

const gramsEditor = {
  gramsDrafts: {},
  savingGramsKey: null,
  gramsError: null,
  handleActualGramsChange: vi.fn(),
  handleActualGramsBlur: vi.fn(),
} as unknown as ActualGramsEditor;

function renderCard(entry: ReturnType<typeof makeEntry>, onCompare = vi.fn(), isComparing = false) {
  render(
    <HistoryEntryCard
      entry={entry}
      gramsEditor={gramsEditor}
      onEdit={vi.fn()}
      onOpenPhoto={vi.fn()}
      onRepeat={vi.fn()}
      onCompare={onCompare}
      isComparing={isComparing}
    />,
  );
  return onCompare;
}

describe("HistoryEntryCard comparison", () => {
  it("offers Compare on a single-formula visit", () => {
    const onCompare = renderCard(makeEntry({ clientName: "Anna K." }));
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(onCompare).toHaveBeenCalledOnce();
  });

  it("leaves Compare out of a multi-step session, which can still be repeated", () => {
    renderCard(makeEntry({ clientName: "Anna K.", steps: [makeBleachStep(), makeColorStep()] }));
    expect(screen.getByRole("button", { name: "Repeat formula" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compare" })).toBeNull();
  });

  it("offers Compare with A while a comparison is on", () => {
    const onCompare = renderCard(makeEntry({ clientName: "Anna K." }), vi.fn(), true);
    fireEvent.click(screen.getByRole("button", { name: "Compare with A" }));
    expect(onCompare).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Compare" })).toBeNull();
  });
});
