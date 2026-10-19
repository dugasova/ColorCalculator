import { describe, it, expect } from "vitest";
import {
  developerStockId, getBrandScopedDeveloperLines, getScopedDeveloperVolumes, getShadeTubeSizeGrams,
} from "./products";

describe("getShadeTubeSizeGrams", () => {
  it("uses the 50 g override for Majirel and Dia Light", () => {
    expect(getShadeTubeSizeGrams("loreal", "majirel")).toBe(50);
    expect(getShadeTubeSizeGrams("loreal", "dia-light")).toBe(50);
  });

  it("falls back to the standard 60 g tube for every other line, including L'Oréal's own INOA and Dia Color", () => {
    expect(getShadeTubeSizeGrams("loreal", "inoa")).toBe(60);
    expect(getShadeTubeSizeGrams("loreal", "dia-color")).toBe(60);
    expect(getShadeTubeSizeGrams("wella", "Koleston Perfect")).toBe(60);
    expect(getShadeTubeSizeGrams("generic", null)).toBe(60);
  });
});

describe("developerStockId / getBrandScopedDeveloperLines", () => {
  it("resolves every ordinary line to the brand-wide bucket, unaffected by this line-scoping", () => {
    expect(developerStockId("wella", null, 20)).toBe(developerStockId("wella", "Koleston Perfect", 20));
    expect(developerStockId("loreal", null, 20)).toBe(developerStockId("loreal", "majirel", 20));
    expect(getBrandScopedDeveloperLines("wella")).toEqual([]);
  });

  it("scopes INOA and Chromatics to their own id, distinct from their brand's shared bucket", () => {
    expect(developerStockId("loreal", "inoa", 20)).not.toBe(developerStockId("loreal", null, 20));
    expect(developerStockId("redken", "chromatics", 20)).not.toBe(developerStockId("redken", null, 20));
    expect(getBrandScopedDeveloperLines("loreal")).toEqual(["inoa"]);
    expect(getBrandScopedDeveloperLines("redken")).toEqual(["chromatics"]);
  });

  it("restricts a scoped line's developer to the volumes its real product ships in -- no 6/13/40 vol for INOA or Chromatics", () => {
    expect(getScopedDeveloperVolumes("loreal", "inoa")).toEqual([10, 20, 30]);
    expect(getScopedDeveloperVolumes("redken", "chromatics")).toEqual([10, 20, 30]);
  });
});
