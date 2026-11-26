// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import { SectionSearch } from "./SectionSearch";
import type { AppView } from "./Nav";

afterEach(cleanup);

function Harness({ onViewChange, isAdmin = false }: { onViewChange: (view: AppView) => void; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  return <SectionSearch open={open} onOpenChange={setOpen} onViewChange={onViewChange} isAdmin={isAdmin} />;
}

describe("SectionSearch", () => {
  it("opens on Ctrl K, filters as you type and opens the section on Enter", () => {
    const onViewChange = vi.fn();
    render(<Harness onViewChange={onViewChange} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const input = screen.getByLabelText("Section");
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: "ble" } });
    expect(screen.getAllByRole("button", { name: /Bleach/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /History/ })).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onViewChange).toHaveBeenCalledWith("bleach");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("matches a group name, moves with the arrows and closes on Escape", () => {
    const onViewChange = vi.fn();
    render(<Harness onViewChange={onViewChange} />);
    fireEvent.keyDown(document, { key: "K", metaKey: true });
    const input = screen.getByLabelText("Section");

    fireEvent.change(input, { target: { value: "clients" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onViewChange).toHaveBeenCalledWith("favorites");

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.keyDown(screen.getByLabelText("Section"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers admin sections to an admin only, and says when nothing matches", () => {
    render(<Harness onViewChange={() => {}} />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.change(screen.getByLabelText("Section"), { target: { value: "orders" } });
    expect(screen.getByText("Nothing found")).toBeInTheDocument();
  });
});
