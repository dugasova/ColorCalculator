// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CollapsibleSection } from "./CollapsibleSection";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// A stateful child so collapsing/expanding around it exercises the "must not unmount"
// contract: an uncontrolled state update while hidden would be lost if the panel
// unmounted its children instead of merely hiding them.
function StatefulInput() {
  const [value, setValue] = useState("");
  return <input aria-label="stateful" value={value} onChange={e => setValue(e.target.value)} />;
}

describe("CollapsibleSection", () => {
  it("starts collapsed when defaultOpen is false, and expands on click", () => {
    render(
      <CollapsibleSection id="x" title="Title" defaultOpen={false}>
        <input aria-label="child" />
      </CollapsibleSection>
    );

    const toggle = screen.getByRole("button", { name: "Title" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById("x-panel");
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("hidden");
    // Child is still in the DOM even while hidden.
    expect(screen.getByLabelText("child")).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("hidden");
    expect(localStorage.getItem("formulist.collapsible.x")).toBe("open");
  });

  it("a stored 'closed' value wins over defaultOpen={true}", () => {
    localStorage.setItem("formulist.collapsible.y", "closed");
    render(
      <CollapsibleSection id="y" title="Title" defaultOpen={true}>
        <input aria-label="child" />
      </CollapsibleSection>
    );

    expect(screen.getByRole("button", { name: "Title" })).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("y-panel")).toHaveAttribute("hidden");
  });

  it("preserves an uncontrolled child's state across collapse/expand", () => {
    render(
      <CollapsibleSection id="z" title="Title" defaultOpen={true}>
        <StatefulInput />
      </CollapsibleSection>
    );

    const input = screen.getByLabelText("stateful") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hello" } });
    expect(input.value).toBe("hello");

    const toggle = screen.getByRole("button", { name: "Title" });
    fireEvent.click(toggle); // collapse
    expect(document.getElementById("z-panel")).toHaveAttribute("hidden");
    fireEvent.click(toggle); // expand

    expect((screen.getByLabelText("stateful") as HTMLInputElement).value).toBe("hello");
  });

  it("forceOpen keeps the panel visible and the toggle disabled even over a stored 'closed' value", () => {
    localStorage.setItem("formulist.collapsible.w", "closed");
    render(
      <CollapsibleSection id="w" title="Title" defaultOpen={false} forceOpen={true}>
        <input aria-label="child" />
      </CollapsibleSection>
    );

    const toggle = screen.getByRole("button", { name: "Title" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toBeDisabled();
    expect(document.getElementById("w-panel")).not.toHaveAttribute("hidden");
  });
});
