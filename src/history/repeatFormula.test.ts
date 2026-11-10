import { describe, it, expect } from "vitest";
import { buildRepeatFormulaRequest, buildRepeatSessionRequest } from "./repeatFormula";
import { BRANDS, type Brand, type BrandId } from "../engine/brands";
import type { ColorHistoryStep } from "./types";
import { makeColorStep, makeEntry } from "../testFixtures";

// The live catalog after an admin renamed the Generic brand in PaletteAdmin.
const BRANDS_WITH_GENERIC_RENAMED: Record<BrandId, Brand> = {
  ...BRANDS,
  generic: { ...BRANDS.generic, name: "House Color" },
};

function repeatSingleStep(step: Partial<ColorHistoryStep>, brands: Record<BrandId, Brand> = BRANDS) {
  return buildRepeatFormulaRequest(makeEntry({ clientName: "Anna", steps: [makeColorStep(step)] }), brands);
}

describe("buildRepeatFormulaRequest brand resolution", () => {
  it("finds the brand by id when id and name both match", () => {
    expect(repeatSingleStep({ brandId: "generic", brandName: "Generic" })?.brandId).toBe("generic");
  });

  it("finds the brand by id after it was renamed in the catalog", () => {
    const request = repeatSingleStep({ brandId: "generic", brandName: "Generic" }, BRANDS_WITH_GENERIC_RENAMED);
    expect(request?.brandId).toBe("generic");
  });

  it("falls back to the name for a legacy step saved without a brandId", () => {
    expect(repeatSingleStep({ brandId: undefined, brandName: "Wella" })?.brandId).toBe("wella");
  });

  it("falls back to the name when the stored brandId is no longer in the catalog", () => {
    expect(repeatSingleStep({ brandId: "removed-brand", brandName: "Wella" })?.brandId).toBe("wella");
  });

  it("returns null when neither the id nor the name matches any brand", () => {
    expect(repeatSingleStep({ brandId: "removed-brand", brandName: "Removed Brand" })).toBeNull();
  });
});

describe("buildRepeatSessionRequest brand resolution", () => {
  it("finds each color step's brand by id after it was renamed in the catalog", () => {
    const entry = makeEntry({
      clientName: "Anna",
      steps: [makeColorStep({ brandId: "generic", brandName: "Generic", strandZone: "roots" })],
    });
    const request = buildRepeatSessionRequest(entry, BRANDS_WITH_GENERIC_RENAMED);
    expect(request?.steps[0]).toMatchObject({ kind: "color", brandId: "generic" });
  });
});
