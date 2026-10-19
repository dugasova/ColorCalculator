import { describe, it, expect } from "vitest";
import { buildReorderList, getStockStatus, suggestReorderPacks } from "./reorder";
import { developerStockId, shadeStockId } from "./products";
import type { StockRecord } from "./types";
import { BRANDS, type Brand } from "../engine/brands";

describe("getStockStatus", () => {
  it("reports out at or below zero, low up to the default threshold, and ok above it", () => {
    expect(getStockStatus(0)).toBe("out");
    expect(getStockStatus(-5)).toBe("out");
    expect(getStockStatus(60)).toBe("low");
    expect(getStockStatus(61)).toBe("ok");
  });

  it("honors a smaller explicit threshold, e.g. a 50 g tube line", () => {
    expect(getStockStatus(50, 50)).toBe("low");
    expect(getStockStatus(51, 50)).toBe("ok");
  });
});

describe("suggestReorderPacks", () => {
  it("returns the fewest packs that lift the product strictly above its threshold", () => {
    expect(suggestReorderPacks(0, 60, 60)).toBe(2);
    expect(suggestReorderPacks(30, 60, 60)).toBe(1);
    expect(suggestReorderPacks(60, 60, 60)).toBe(1);
    expect(suggestReorderPacks(-70, 60, 60)).toBe(3);
    expect(suggestReorderPacks(0, 50, 50)).toBe(2);
  });

  it("works for a developer's 1000 g bottle against the flat 60 g threshold", () => {
    expect(suggestReorderPacks(60, 60, 1000)).toBe(1);
  });
});

describe("buildReorderList", () => {
  const brands: Record<string, Brand> = {
    wella: {
      ...BRANDS.wella,
      shades: [
        { code: "7/1", level: 7, tone: "ash", line: "koleston-perfect" },
        { code: "8/0", level: 8, tone: "natural", line: "koleston-perfect" },
      ],
    },
    loreal: {
      ...BRANDS.loreal,
      shades: [{ code: "7.1", level: 7, tone: "ash", line: "majirel" }],
    },
  };

  it("lists only tracked, catalog-present, low/out products, brand-then-shades-then-developers ordered", () => {
    const records: StockRecord[] = [
      { id: shadeStockId("wella", "koleston-perfect", "7/1"), kind: "shade", brandId: "wella", line: "koleston-perfect", code: "7/1", remainingGrams: 30 },
      { id: shadeStockId("wella", "koleston-perfect", "8/0"), kind: "shade", brandId: "wella", line: "koleston-perfect", code: "8/0", remainingGrams: 500 },
      { id: developerStockId("wella", null, 20), kind: "developer", brandId: "wella", line: null, volume: 20, remainingGrams: 0 },
      { id: shadeStockId("wella", null, "9/99"), kind: "shade", brandId: "wella", line: null, code: "9/99", remainingGrams: 0 },
      { id: shadeStockId("loreal", "majirel", "7.1"), kind: "shade", brandId: "loreal", line: "majirel", code: "7.1", remainingGrams: 0 },
    ];

    const items = buildReorderList(brands, records);

    expect(items.map(item => item.id)).toEqual([
      shadeStockId("loreal", "majirel", "7.1"),
      shadeStockId("wella", "koleston-perfect", "7/1"),
      developerStockId("wella", null, 20),
    ]);
    expect(items[0]).toMatchObject({ status: "out", packGrams: 50, suggestedPacks: 2 });
    expect(items[1]).toMatchObject({ status: "low", packGrams: 60, suggestedPacks: 1 });
    expect(items[2]).toMatchObject({ status: "out", packGrams: 1000, suggestedPacks: 1 });
  });

  it("lists a scoped line's developer (INOA) as its own row, separate from the rest of its brand", () => {
    const brandsWithInoa: Record<string, Brand> = {
      loreal: {
        ...BRANDS.loreal,
        shades: [
          { code: "7.1", level: 7, tone: "ash", line: "majirel" },
          { code: "7.1", level: 7, tone: "ash", line: "inoa" },
        ],
      },
    };
    const records: StockRecord[] = [
      { id: developerStockId("loreal", null, 20), kind: "developer", brandId: "loreal", line: null, volume: 20, remainingGrams: 500 },
      { id: developerStockId("loreal", "inoa", 20), kind: "developer", brandId: "loreal", line: "inoa", volume: 20, remainingGrams: 0 },
    ];

    const items = buildReorderList(brandsWithInoa, records);

    expect(items.map(item => item.id)).toEqual([developerStockId("loreal", "inoa", 20)]);
    expect(items[0]).toMatchObject({ status: "out", suggestedPacks: 1, line: "inoa" });
  });
});
