// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import "../../i18n";
import { BleachCalculator } from "./BleachCalculator";

afterEach(cleanup);

describe("BleachCalculator target level", () => {
  it("stops at 10: special-blonde levels 11-12 are never a target after powder", () => {
    render(<BleachCalculator />);
    const trigger = document.getElementById("targetLevel");
    if (trigger === null) throw new Error("no target level field");
    fireEvent.click(trigger);
    const levels = within(screen.getByRole("listbox"))
      .getAllByRole("option")
      .map(option => option.textContent);
    expect(levels).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  });
});
