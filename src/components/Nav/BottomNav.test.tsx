// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import { BottomNav } from "./BottomNav";

afterEach(() => {
  cleanup();
});

describe("BottomNav", () => {
  it("stylist: shows the four primary tabs, and More lists the rest without Palette/Orders", () => {
    const onViewChange = vi.fn();
    render(<BottomNav view="calculator" onViewChange={onViewChange} isAdmin={false} />);

    expect(screen.getByRole("button", { name: "Calculator" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complex color" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reference" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(screen.getByRole("button", { name: "Correction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bleach" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pre-pigment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Favorites" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Palette" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Orders" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));

    expect(onViewChange).toHaveBeenCalledWith("analytics");
    expect(screen.queryByRole("button", { name: "Favorites" })).not.toBeInTheDocument();
  });

  it("admin: More trigger shows the active sub-view's label, and its popup lists Palette and Orders", () => {
    const onViewChange = vi.fn();
    render(<BottomNav view="orders" onViewChange={onViewChange} isAdmin={true} />);

    const trigger = screen.getByRole("button", { name: "Orders" });
    expect(trigger).toHaveClass("bottom-nav__item--active");

    fireEvent.click(trigger);

    expect(screen.getByRole("button", { name: "Palette" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Orders" })).toHaveLength(2);
  });
});
