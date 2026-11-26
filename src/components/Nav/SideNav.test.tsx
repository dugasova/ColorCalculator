// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import { SideNav } from "./SideNav";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("SideNav (desktop)", () => {
  it("lists every view, admin ones under their own heading", () => {
    const onViewChange = vi.fn();
    render(<SideNav view="bleach" onViewChange={onViewChange} onBrandClick={() => {}} isAdmin />);
    expect(screen.getAllByRole("tab")).toHaveLength(12);
    expect(screen.getByRole("tab", { name: "Bleach" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Administration")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    expect(onViewChange).toHaveBeenCalledWith("history");
  });

  it("shows no admin views to a stylist", () => {
    render(<SideNav view="calculator" onViewChange={() => {}} onBrandClick={() => {}} />);
    expect(screen.getAllByRole("tab")).toHaveLength(9);
    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
  });

  it("collapses to a rail and remembers it", () => {
    const { container, unmount } = render(
      <SideNav view="calculator" onViewChange={() => {}} onBrandClick={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Collapse menu" }));
    expect(container.querySelector(".side-nav--collapsed")).not.toBeNull();
    expect(screen.getByRole("tab", { name: "Calculator" })).toBeInTheDocument();
    unmount();

    const again = render(<SideNav view="calculator" onViewChange={() => {}} onBrandClick={() => {}} />);
    expect(again.container.querySelector(".side-nav--collapsed")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Expand menu" })).toBeInTheDocument();
  });
});
