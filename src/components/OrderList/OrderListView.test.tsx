// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import { OrderListView } from "./OrderListView";
import { usePalette, useStock } from "../../palette";
import { developerStockId, shadeStockId } from "../../stock";
import type { StockRecord } from "../../stock";
import { BRANDS } from "../../engine/brands";
import type { Brand } from "../../engine/brands";

vi.mock("../../palette", () => ({
  usePalette: vi.fn(),
  useStock: vi.fn(),
}));

afterEach(cleanup);

const wellaWithOneShade: Brand = {
  ...BRANDS.wella,
  shades: [{ code: "7/1", level: 7, tone: "ash", line: "koleston-perfect" }],
};

describe("OrderListView", () => {
  it("copies only the products left at a non-zero quantity", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    vi.mocked(usePalette).mockReturnValue({ wella: wellaWithOneShade });
    const stock: StockRecord[] = [
      { id: shadeStockId("wella", "koleston-perfect", "7/1"), kind: "shade", brandId: "wella", line: "koleston-perfect", code: "7/1", remainingGrams: 30 },
      { id: developerStockId("wella", null, 20), kind: "developer", brandId: "wella", line: null, volume: 20, remainingGrams: 0 },
    ];
    vi.mocked(useStock).mockReturnValue(stock);

    render(<OrderListView />);

    const shadeInput = screen.getByLabelText("Quantity of 7/1 · Koleston Perfect to order") as HTMLInputElement;
    const developerInput = screen.getByLabelText("Quantity of 6% (20 vol) to order") as HTMLInputElement;
    expect(shadeInput.value).toBe("1");
    expect(developerInput.value).toBe("1");

    fireEvent.change(developerInput, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Copy list" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain("Wella\n7/1 · Koleston Perfect — 1 × tube 60 g");
    expect(text).not.toContain("20 vol");
  });

  it("disables Copy list once every quantity is zeroed out", () => {
    vi.mocked(usePalette).mockReturnValue({ wella: wellaWithOneShade });
    const stock: StockRecord[] = [
      { id: shadeStockId("wella", "koleston-perfect", "7/1"), kind: "shade", brandId: "wella", line: "koleston-perfect", code: "7/1", remainingGrams: 30 },
    ];
    vi.mocked(useStock).mockReturnValue(stock);

    render(<OrderListView />);

    const shadeInput = screen.getByLabelText("Quantity of 7/1 · Koleston Perfect to order");
    fireEvent.change(shadeInput, { target: { value: "0" } });

    expect(screen.getByRole("button", { name: "Copy list" })).toBeDisabled();
  });

  it("shows the empty state and no Copy list button when nothing is low or out", () => {
    vi.mocked(usePalette).mockReturnValue({ wella: wellaWithOneShade });
    vi.mocked(useStock).mockReturnValue([]);

    render(<OrderListView />);

    expect(screen.getByText("Nothing to order — every tracked product is above its low-stock level.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy list" })).not.toBeInTheDocument();
  });

  it("shows only the selected brand's items at a time, not every brand combined", () => {
    const lorealWithOneShade: Brand = {
      ...BRANDS.loreal,
      shades: [{ code: "7.1", level: 7, tone: "ash", line: "majirel" }],
    };
    vi.mocked(usePalette).mockReturnValue({ wella: wellaWithOneShade, loreal: lorealWithOneShade });
    const stock: StockRecord[] = [
      { id: shadeStockId("wella", "koleston-perfect", "7/1"), kind: "shade", brandId: "wella", line: "koleston-perfect", code: "7/1", remainingGrams: 30 },
      { id: shadeStockId("loreal", "majirel", "7.1"), kind: "shade", brandId: "loreal", line: "majirel", code: "7.1", remainingGrams: 0 },
    ];
    vi.mocked(useStock).mockReturnValue(stock);

    render(<OrderListView />);

    // L'Oréal sorts before Wella, so it's the default-selected brand.
    expect(screen.getByRole("heading", { name: "L'Oréal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity of 7.1 · Majirel to order")).toBeInTheDocument();
    expect(screen.queryByLabelText("Quantity of 7/1 · Koleston Perfect to order")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Wella" }));

    expect(screen.getByRole("heading", { name: "Wella" })).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity of 7/1 · Koleston Perfect to order")).toBeInTheDocument();
    expect(screen.queryByLabelText("Quantity of 7.1 · Majirel to order")).not.toBeInTheDocument();
  });
});
