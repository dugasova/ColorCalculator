// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "../../i18n";
import { Select, type SelectOption } from "./Select";

afterEach(cleanup);

const CODES = ["6/0", "7/1", "7/71", "7/73", "10/1"];
const options: SelectOption[] = CODES.map(code => ({ value: code, label: code, searchText: code }));

function optionValues(): string[] {
  return screen.queryAllByRole("option").map(el => el.getAttribute("data-value") ?? "");
}

describe("Select searchable mode", () => {
  it("opens with a focused search field listing every option", () => {
    render(<Select id="s" value="6/0" onChange={vi.fn()} searchable options={options} />);
    fireEvent.click(screen.getByRole("combobox"));
    const textbox = screen.getByRole("textbox", { name: "Search by code" });
    expect(document.activeElement).toBe(textbox);
    expect(optionValues()).toEqual(CODES);
  });

  it("filters to codes starting with the typed prefix, treating . , - as the same separator as /", () => {
    render(<Select id="s" value="6/0" onChange={vi.fn()} searchable options={options} />);
    fireEvent.click(screen.getByRole("combobox"));
    const textbox = screen.getByRole("textbox", { name: "Search by code" });

    fireEvent.change(textbox, { target: { value: "7" } });
    expect(optionValues()).toEqual(["7/1", "7/71", "7/73"]);

    fireEvent.change(textbox, { target: { value: "7.7" } });
    expect(optionValues()).toEqual(["7/71", "7/73"]);

    fireEvent.change(textbox, { target: { value: "7,7" } });
    expect(optionValues()).toEqual(["7/71", "7/73"]);
  });

  it("matches only as a prefix, not a substring", () => {
    render(<Select id="s" value="6/0" onChange={vi.fn()} searchable options={options} />);
    fireEvent.click(screen.getByRole("combobox"));
    const textbox = screen.getByRole("textbox", { name: "Search by code" });

    fireEvent.change(textbox, { target: { value: "1" } });
    expect(optionValues()).toEqual(["10/1"]);
  });

  it("shows a no-matches message and ignores Enter when nothing matches", () => {
    const onChange = vi.fn();
    render(<Select id="s" value="6/0" onChange={onChange} searchable options={options} />);
    fireEvent.click(screen.getByRole("combobox"));
    const textbox = screen.getByRole("textbox", { name: "Search by code" });

    fireEvent.change(textbox, { target: { value: "9" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No matches")).toBeDefined();

    fireEvent.keyDown(textbox, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("commits the active filtered option via ArrowDown + Enter and returns focus to the trigger", () => {
    const onChange = vi.fn();
    render(<Select id="s" value="6/0" onChange={onChange} searchable options={options} />);
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);
    const textbox = screen.getByRole("textbox", { name: "Search by code" });

    fireEvent.change(textbox, { target: { value: "7/7" } });
    fireEvent.keyDown(textbox, { key: "ArrowDown" });
    fireEvent.keyDown(textbox, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("7/73");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("has no search field when not searchable", () => {
    render(<Select id="s" value="6/0" onChange={vi.fn()} options={options} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
