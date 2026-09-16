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
      { id: developerStockId("wella", 20), kind: "developer", brandId: "wella", volume: 20, remainingGrams: 500 },
    ];
    vi.mocked(useStock).mockReturnValue(stock);
    render(<BrandStockList brandId="wella" shades={[shade]} disabledKeys={new Set()} />);

    const developerRow = screen.getByText("20 vol").closest("li");
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
});
