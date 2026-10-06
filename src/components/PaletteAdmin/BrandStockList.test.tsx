// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import "../../i18n";
import { BrandStockList } from "./BrandStockList";
import { developerStockId, shadeStockId, restockOneTube } from "../../stock";
import { useStock } from "../../palette";
import type { StockRecord } from "../../stock";
import type { Shade } from "../../engine/shades";

vi.mock("../../palette", () => ({
  useStock: vi.fn(),
}));

vi.mock("../../stock", async () => {
  const actual = await vi.importActual<typeof import("../../stock")>("../../stock");
  return {
    ...actual,
    restockOneTube: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(cleanup);

const shade: Shade = { code: "7.1", level: 7, tone: "ash" };

describe("BrandStockList restock button", () => {
  it("restocks a developer row by a full 1000 g bottle, not a 60 g tube", async () => {
    const stock: StockRecord[] = [
      { id: developerStockId("wella", null, 20), kind: "developer", brandId: "wella", line: null, volume: 20, remainingGrams: 500 },
    ];
    vi.mocked(useStock).mockReturnValue(stock);
    render(<BrandStockList brandId="wella" shades={[shade]} disabledKeys={new Set()} />);

    const developerRow = screen.getByText("6% (20 vol)").closest("li");
    if (developerRow === null) throw new Error("developer row not found");
    const developerButton = within(developerRow).getByRole("button", { name: "+1 bottle (1000 g)" });
    fireEvent.click(developerButton);
  });

  it("still restocks a shade row by its tube size, unaffected by the bottle fix", async () => {
    const stock: StockRecord[] = [
      { id: shadeStockId("wella", null, "7.1"), kind: "shade", brandId: "wella", line: null, code: "7.1", remainingGrams: 10 },
    ];
    vi.mocked(useStock).mockReturnValue(stock);

    render(<BrandStockList brandId="wella" shades={[shade]} disabledKeys={new Set()} />);

    const shadeButton = screen.getByRole("button", { name: "+1 tube (60 g)" });
    fireEvent.click(shadeButton);

    expect(restockOneTube).toHaveBeenCalledWith(shadeStockId("wella", null, "7.1"), 60);
  });

  it("shows a scoped line's own developer row (INOA), separate from the rest of the brand's shared bucket", async () => {
    const stock: StockRecord[] = [
      { id: developerStockId("loreal", null, 20), kind: "developer", brandId: "loreal", line: null, volume: 20, remainingGrams: 500 },
      { id: developerStockId("loreal", "inoa", 20), kind: "developer", brandId: "loreal", line: "inoa", volume: 20, remainingGrams: 10 },
    ];
    vi.mocked(useStock).mockReturnValue(stock);
    render(<BrandStockList brandId="loreal" shades={[shade]} disabledKeys={new Set()} />);

    const inoaRow = screen.getByText("6% (20 vol) · Inoa").closest("li");
    if (inoaRow === null) throw new Error("INOA developer row not found");
    expect((within(inoaRow).getByRole("spinbutton") as HTMLInputElement).value).toBe("10");

    fireEvent.click(within(inoaRow).getByRole("button", { name: "+1 bottle (1000 g)" }));
    expect(restockOneTube).toHaveBeenCalledWith(developerStockId("loreal", "inoa", 20), 1000);

    const sharedRow = screen.getByText("6% (20 vol)").closest("li");
    if (sharedRow === null) throw new Error("shared developer row not found");
    expect(sharedRow).not.toBe(inoaRow);

    // INOA Developer is only ever sold in 10/20/30 vol -- no 6/13/40 vol row should be
    // offered for it, unlike the brand's shared bucket which still shows all six.
    expect(screen.queryByText("12% (40 vol) · Inoa")).not.toBeInTheDocument();
    expect(screen.queryByText("1.9% (6 vol) · Inoa")).not.toBeInTheDocument();
    expect(screen.queryByText("4% (13 vol) · Inoa")).not.toBeInTheDocument();
    expect(screen.getByText("12% (40 vol)")).toBeInTheDocument();
  });
});
