import { describe, it, expect, vi } from "vitest";
import {
  applyFavoriteRecipe, applyFormValues, repeatRequestToFormValues, type FormulaFormSetters, type FormulaFormValues,
} from "./formulaRequests";
import type { RepeatFormulaRequest } from "../../history";
import type { FavoriteFormulaRecipe } from "../../favoriteFormulas";

const REPEAT: RepeatFormulaRequest = {
  clientName: "Anna",
  clientId: "client-1",
  brandId: "wella",
  line: "koleston-perfect",
  targetShadeCode: "7/1",
  startLevel: 6,
  grayPercent: 30,
  totalGrams: 90,
  colorGrams: 30,
  manualDeveloperVolume: 20,
  manualMixingRatio: { colorParts: 1, developerParts: 2 },
  additionalShadeCode: "0/11",
  additionalShadeGrams: 5,
  additionalShade2Code: null,
  additionalShade2Grams: 0,
  canvas: { porosity: "high", thickness: "fine", chemicalHistory: ["bleached-blonde"] },
  blendShadeACode: null,
  blendShadeBCode: null,
  blendPrimaryPercent: 70,
  processingMinutes: 35,
  applicationZone: "full-head",
  pricePerGram: 0.25,
  markupMultiplier: 3,
  servicePrice: 1200,
  prePigmentationEnabled: true,
};

const RECIPE: FavoriteFormulaRecipe = {
  brandId: "wella",
  line: "koleston-perfect",
  targetShadeCode: "7/1",
  additionalShadeCode: null,
  additionalShadeGrams: 0,
  additionalShade2Code: null,
  additionalShade2Grams: 0,
  blendShadeACode: "7/0",
  blendShadeBCode: "7/11",
  blendPrimaryPercent: 60,
  manualDeveloperVolume: null,
  manualMixingRatio: null,
  manualProcessingMinutes: null,
  applicationZone: "root-touch-up",
  gramsInputMode: "total",
  totalGrams: 60,
  colorGrams: 20,
};

describe("repeatRequestToFormValues", () => {
  it("restores a saved hair canvas, and falls back to the fresh-calculator defaults without one", () => {
    expect(repeatRequestToFormValues(REPEAT)).toMatchObject({ porosity: "high", thickness: "fine", chemicalHistory: ["bleached-blonde"] });
    expect(repeatRequestToFormValues({ ...REPEAT, canvas: undefined })).toMatchObject({
      porosity: "normal", thickness: "medium", chemicalHistory: [],
    });
  });

  it("re-derives the grams input mode from the restored zone", () => {
    expect(repeatRequestToFormValues(REPEAT).gramsInputMode).toBe("total");
    expect(repeatRequestToFormValues({ ...REPEAT, applicationZone: "root-touch-up" }).gramsInputMode).toBe("color");
  });

  it("defaults a legacy entry's missing second additional shade to none", () => {
    const legacy = { ...REPEAT, additionalShade2Code: undefined, additionalShade2Grams: undefined };
    expect(repeatRequestToFormValues(legacy)).toMatchObject({ additionalShade2Code: null, additionalShade2Grams: 0 });
  });

  it("enables blend mode only when both blend components were saved", () => {
    expect(repeatRequestToFormValues(REPEAT).blendModeEnabled).toBe(false);
    expect(repeatRequestToFormValues({ ...REPEAT, blendShadeACode: "7/0" }).blendModeEnabled).toBe(false);
    expect(repeatRequestToFormValues({ ...REPEAT, blendShadeACode: "7/0", blendShadeBCode: "7/11" }).blendModeEnabled).toBe(true);
  });

  it("restores pricing and processing time as manual overrides, and never re-applies neutralization", () => {
    expect(repeatRequestToFormValues(REPEAT)).toMatchObject({
      manualPricePerGram: 0.25, manualMarkupMultiplier: 3, manualServicePrice: 1200,
      manualProcessingMinutes: 35, neutralizationApplied: false, prePigmentationEnabled: true,
    });
  });
});

describe("applyFavoriteRecipe", () => {
  it("never touches the on-screen client's diagnostics, markup or pre-pigmentation", () => {
    const values = applyFavoriteRecipe(RECIPE);
    for (const key of ["startLevel", "grayPercent", "porosity", "thickness", "chemicalHistory", "manualMarkupMultiplier", "prePigmentationEnabled"]) {
      expect(values).not.toHaveProperty(key);
    }
  });

  it("explicitly resets the manual price and service price so they re-derive from the brand", () => {
    const values = applyFavoriteRecipe(RECIPE);
    expect(Object.hasOwn(values, "manualPricePerGram")).toBe(true);
    expect(values.manualPricePerGram).toBeUndefined();
    expect(Object.hasOwn(values, "manualServicePrice")).toBe(true);
    expect(values.manualServicePrice).toBeUndefined();
  });

  it("maps stored null manual overrides to undefined and keeps the saved grams input mode", () => {
    expect(applyFavoriteRecipe(RECIPE)).toMatchObject({
      manualDeveloperVolume: undefined, manualMixingRatio: undefined, manualProcessingMinutes: undefined,
      gramsInputMode: "total", blendModeEnabled: true, neutralizationApplied: false,
    });
  });
});

describe("applyFormValues", () => {
  function makeSetters(): FormulaFormSetters {
    const keys = Object.keys(repeatRequestToFormValues(REPEAT)) as (keyof FormulaFormValues)[];
    return Object.fromEntries(keys.map(key => [key, vi.fn()])) as unknown as FormulaFormSetters;
  }

  it("calls the setter for a key present with an explicit undefined", () => {
    const setters = makeSetters();
    applyFormValues({ manualPricePerGram: undefined }, setters);
    expect(setters.manualPricePerGram).toHaveBeenCalledWith(undefined);
  });

  it("leaves a field alone when its key is absent", () => {
    const setters = makeSetters();
    applyFormValues({ brandId: "loreal" }, setters);
    expect(setters.brandId).toHaveBeenCalledWith("loreal");
    expect(setters.startLevel).not.toHaveBeenCalled();
    expect(setters.manualPricePerGram).not.toHaveBeenCalled();
  });
});
