// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import { Nav } from "./Nav";

afterEach(cleanup);

// The tablet top bar: four primary tabs, every other view behind "More".
describe("Nav (tablet)", () => {
  it("shows the four primary tabs and marks the active one", () => {
    render(<Nav view="history" onViewChange={() => {}} />);
    const tabs = screen.getAllByRole("tab").map(tab => tab.textContent);
    expect(tabs).toEqual(["Calculator", "Complex color", "History", "Reference"]);
    expect(screen.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "true");
  });

  it("lists the other views under More, admin ones only for an admin", () => {
    const onViewChange = vi.fn();
    const { unmount } = render(<Nav view="calculator" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    for (const name of ["Correction", "Bleach", "Pre-pigment", "Favorites", "Analytics"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Orders" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bleach" }));
    expect(onViewChange).toHaveBeenCalledWith("bleach");
    unmount();

    render(<Nav view="calculator" onViewChange={() => {}} isAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByText("Administration")).toBeInTheDocument();
    for (const name of ["Palette", "Orders", "Team"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("names the active More view on the More button", () => {
    render(<Nav view="correction" onViewChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Correction" })).toHaveAttribute("aria-haspopup", "true");
  });
});
