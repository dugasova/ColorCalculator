import { describe, it, expect } from "vitest";
import { buildRepeatFormulaRequest, buildRepeatSessionRequest, findMissingShadeCodes } from "./repeatFormula";
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

describe("findMissingShadeCodes", () => {
  const matrixStep = (overrides: Partial<ColorHistoryStep>) =>
    makeColorStep({ brandId: "matrix", brandName: "Matrix", line: "socolor", ...overrides });

  it("lists the visit's shades the line no longer has", () => {
    const step = matrixStep({
      targetShade: { code: "9P", level: 9, tone: "pearl", line: "socolor" },
      additionalShade: { code: "8A", level: 8, tone: "ash", line: "socolor" },
      additionalShadeGrams: 5,
    });
    expect(findMissingShadeCodes(step, BRANDS.matrix)).toEqual(["9P", "8A"]);
  });

  it("is empty when every shade is still in the palette", () => {
    const step = matrixStep({ targetShade: { code: "9A", level: 9, tone: "ash", line: "socolor" } });
    expect(findMissingShadeCodes(step, BRANDS.matrix)).toEqual([]);
  });

  it("checks the shade on the step's own line", () => {
    // 10A exists in Super Sync but not in SoColor
    const step = matrixStep({ targetShade: { code: "10A", level: 10, tone: "ash", line: "socolor" } });
    expect(findMissingShadeCodes(step, BRANDS.matrix)).toEqual(["10A"]);
  });

  it("is carried by the repeat requests", () => {
    const step = matrixStep({ targetShade: { code: "9P", level: 9, tone: "pearl", line: "socolor" } });
    const entry = makeEntry({ clientName: "Anna", steps: [step] });
    expect(buildRepeatFormulaRequest(entry, BRANDS)?.missingShadeCodes).toEqual(["9P"]);
    const session = makeEntry({ clientName: "Anna", steps: [step, { ...step, strandZone: "ends" }] });
    expect(buildRepeatSessionRequest(session, BRANDS)?.missingShadeCodes).toEqual(["9P"]);
  });
});
