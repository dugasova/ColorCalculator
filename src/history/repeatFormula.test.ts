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

describe("buildRepeatFormulaRequest ash + violet ratio", () => {
  it("restores the A : V ratio a Matrix Super Sync visit was mixed with", () => {
    const step = makeColorStep({
      brandId: "matrix",
      brandName: "Matrix",
      line: "super-sync",
      targetShade: { code: "10A", level: 10, tone: "ash", line: "super-sync" },
      result: {
        ...makeColorStep().result,
        ashVioletMix: {
          ashCode: "10A",
          violetCode: "10V",
          ratio: { ashParts: 1, violetParts: 3 },
          choices: [
            { ashParts: 1, violetParts: 2 },
            { ashParts: 1, violetParts: 3 },
          ],
        },
      },
    });
    expect(buildRepeatFormulaRequest(makeEntry({ clientName: "Anna", steps: [step] }), BRANDS)?.ashVioletRatio).toEqual(
      {
        ashParts: 1,
        violetParts: 3,
      },
    );
    expect(repeatSingleStep({})?.ashVioletRatio).toBeNull();
  });
});
