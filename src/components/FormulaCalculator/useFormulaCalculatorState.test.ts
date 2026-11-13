// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { BRANDS } from "../../engine/brands";
import { useFormulaCalculatorState } from "./useFormulaCalculatorState";

afterEach(cleanup);

// Which fields survive and which reset when the colorist changes the brand, line, shade
// or application zone. These rules are spread over several state hooks (shade selection,
// additional shades, manual overrides, blend mode, pricing), so they are pinned here at
// the level the calculator actually uses them.
function renderCalculator() {
  const hook = renderHook(() => useFormulaCalculatorState(BRANDS));
  const state = () => hook.result.current;
  return { state, run: (fn: (s: ReturnType<typeof state>) => void) => act(() => fn(state())) };
}

// Wella Koleston Perfect 7/0 with every override the calculator offers switched on.
function renderCustomized() {
  const calc = renderCalculator();
  const { state, run } = calc;
  run(s => s.handleBrandIdChange("wella"));
  run(s => s.handleTargetShadeCodeChange("7/0"));
  run(s => {
    s.handleAdditionalShadeCodeChange("7/1");
    s.setAdditionalShade2Code("7/3");
    s.setManualPricePerGram(0.5);
    s.setManualServicePrice(99);
    s.setMarkupMultiplier(5);
    s.handleBlendModeChange(true);
    s.setManualProcessingMinutes(40);
    s.setNeutralizationApplied(true);
    s.setGrayNaturalApplied(true);
    s.setNaturalBaseShadeCode("7/00");
  });
  run(s => {
    s.setAdditionalShadeGrams(10);
    s.setAdditionalShade2Grams(5);
    s.setBlendShadeACode("7/1");
    s.setBlendShadeBCode("7/3");
    s.setBlendPrimaryPercent(50);
  });
  expect(state().blendShadeACodeEffective).toBe("7/1");
  return calc;
}

function expectShadePoolReset(s: ReturnType<ReturnType<typeof renderCalculator>["state"]>) {
  expect(s.additionalShadeCode).toBeNull();
  expect(s.additionalShadeGrams).toBe(0);
  expect(s.additionalShade2Code).toBeNull();
  expect(s.additionalShade2Grams).toBe(0);
  expect(s.blendModeEnabled).toBe(false);
  expect(s.blendPrimaryPercent).toBe(70);
  expect(s.blend).toBeNull();
}

function expectShadeOverridesReset(s: ReturnType<ReturnType<typeof renderCalculator>["state"]>) {
  expect(s.manualDeveloperVolume).toBeUndefined();
  expect(s.manualMixingRatio).toBeUndefined();
  expect(s.manualProcessingMinutes).toBeUndefined();
  expect(s.processingMinutes).toBe(s.result.recommendedProcessingMinutes);
  expect(s.neutralizationApplied).toBe(false);
  expect(s.naturalBaseShadeCode).toBeNull();
  expect(s.manualServicePrice).toBeUndefined();
  // Whether to dose a natural base follows the client's gray, not the shade.
  expect(s.grayNaturalApplied).toBe(true);
  // The salon's markup is not tied to a shade.
  expect(s.markupMultiplier).toBe(5);
}

describe("useFormulaCalculatorState resets", () => {
  it("starts on the generic chart with full-head defaults", () => {
    const { state } = renderCalculator();
    expect(state()).toMatchObject({
      brandId: "generic",
      line: null,
      targetShadeCode: "1.0",
      applicationZone: "full-head",
      gramsInputMode: "total",
      totalGrams: 80,
      blendModeEnabled: false,
    });
    expect(state().pricePerGram).toBe(BRANDS.generic.pricePerGram);
  });

  it("changing the brand selects its first shade and clears every shade- and brand-bound choice", () => {
    const { state, run } = renderCustomized();
    run(s => s.handleBrandIdChange("igora"));

    expect(state()).toMatchObject({ brandId: "igora", line: "royal", targetShadeCode: "1-0" });
    expectShadePoolReset(state());
    expectShadeOverridesReset(state());
    expect(state().manualPricePerGram).toBeUndefined();
    expect(state().pricePerGram).toBe(BRANDS.igora.pricePerGram);
  });

  it("changing the line selects its first shade and clears shade-bound choices, keeping the brand's price", () => {
    const { state, run } = renderCustomized();
    run(s => s.handleLineChange("color-touch"));

    expect(state()).toMatchObject({ brandId: "wella", line: "color-touch", targetShadeCode: "2/0" });
    expectShadePoolReset(state());
    expectShadeOverridesReset(state());
    expect(state().manualPricePerGram).toBe(0.5);
    // A line whose developer is picked by hand falls back to its first choice.
    expect(state().result.developerVolume).toBe(6);
  });

  it("changing the shade within a line keeps additional shades and blend mode, dropping per-shade overrides", () => {
    const { state, run } = renderCustomized();
    run(s => s.handleTargetShadeCodeChange("7/17"));

    expect(state().targetShadeCode).toBe("7/17");
    expectShadeOverridesReset(state());
    expect(state().manualPricePerGram).toBe(0.5);
    expect(state()).toMatchObject({
      additionalShadeCode: "7/1",
      additionalShadeGrams: 10,
      additionalShade2Code: "7/3",
      additionalShade2Grams: 5,
      blendModeEnabled: true,
      blendPrimaryPercent: 70,
    });
    // The hand-picked blend pair is dropped in favour of a fresh suggestion for 7/17.
    const { blendShadeACodeEffective, blendShadeBCodeEffective } = state();
    run(s => s.handleBlendModeChange(false));
    run(s => s.handleBlendModeChange(true));
    expect(state().blendShadeACodeEffective).toBe(blendShadeACodeEffective);
    expect(state().blendShadeBCodeEffective).toBe(blendShadeBCodeEffective);
  });

  it("a manual developer choice does not carry over to another shade", () => {
    const { state, run } = renderCalculator();
    run(s => s.handleBrandIdChange("wella"));
    run(s => s.handleLineChange("color-touch"));
    run(s => s.setManualDeveloperVolume(13));
    expect(state().result.developerVolume).toBe(13);

    run(s => s.handleTargetShadeCodeChange("2/8"));
    expect(state().manualDeveloperVolume).toBeUndefined();
    expect(state().result.developerVolume).toBe(6);
  });

  it("selecting a cross-brand match jumps to that shade and resets like a brand change", () => {
    const { state, run } = renderCustomized();
    run(s => s.handleCrossBrandMatchSelect("igora", "royal", "1-1"));

    expect(state()).toMatchObject({ brandId: "igora", line: "royal", targetShadeCode: "1-1" });
    expectShadePoolReset(state());
    expectShadeOverridesReset(state());
    expect(state().manualPricePerGram).toBeUndefined();
  });

  it("turning blend mode off forgets the hand-picked pair and split", () => {
    const { state, run } = renderCustomized();
    run(s => s.handleBlendModeChange(false));
    expect(state().blend).toBeNull();
    run(s => s.handleBlendModeChange(true));
    expect(state().blendPrimaryPercent).toBe(70);
    expect(state().blendShadeACodeEffective).not.toBe("7/1");
  });

  it("picking another additional shade resets its grams", () => {
    const { state, run } = renderCustomized();
    run(s => s.handleAdditionalShadeCodeChange("7/3"));
    expect(state()).toMatchObject({ additionalShadeCode: "7/3", additionalShadeGrams: 0 });
    // the second additional shade is its own field
    expect(state().additionalShade2Grams).toBe(5);
  });

  it("changing the application zone loads that zone's amount defaults", () => {
    const { state, run } = renderCalculator();
    run(s => s.setTotalGrams(120));
    run(s => s.handleApplicationZoneChange("root-touch-up"));
    expect(state()).toMatchObject({
      applicationZone: "root-touch-up",
      gramsInputMode: "color",
      colorGrams: 40,
      totalGrams: 40,
    });
    run(s => s.handleApplicationZoneChange("full-head"));
    expect(state()).toMatchObject({ gramsInputMode: "total", totalGrams: 80, colorGrams: 60 });
  });
});

describe("useFormulaCalculatorState derived values", () => {
  it("adds additional shades on top of the mix and prices the dye only", () => {
    const { state, run } = renderCalculator();
    run(s => s.handleBrandIdChange("wella"));
    run(s => s.handleTargetShadeCodeChange("7/0"));
    const baseColorGrams = state().result.grams!.colorGrams;
    run(s => s.handleAdditionalShadeCodeChange("7/1"));
    run(s => s.setAdditionalShadeGrams(10));

    expect(state().effectiveResult.grams!.colorGrams).toBeCloseTo(baseColorGrams + 10);
    expect(state().productCost).toBeCloseTo((baseColorGrams + 10) * BRANDS.wella.pricePerGram);
    expect(state().servicePrice).toBe(state().recommendedServicePrice);
    run(s => s.setManualServicePrice(50));
    expect(state().servicePrice).toBe(50);
  });

  it("splits the base color between the two blend shades without changing the total", () => {
    const { state, run } = renderCalculator();
    run(s => s.handleBrandIdChange("wella"));
    run(s => s.handleTargetShadeCodeChange("7/17"));
    run(s => s.handleBlendModeChange(true));
    run(s => s.setBlendPrimaryPercent(60));

    const { blend, result } = state();
    expect(blend).not.toBeNull();
    expect(blend!.shadeAGrams + blend!.shadeBGrams).toBeCloseTo(result.grams!.colorGrams);
    expect(blend!.shadeAGrams).toBeCloseTo(result.grams!.colorGrams * 0.6);
  });

  it("derives the total mix from a dye-only amount", () => {
    const { state, run } = renderCalculator();
    run(s => s.handleApplicationZoneChange("root-touch-up"));
    run(s => s.setColorGrams(50));
    const { grams, mixingRatio } = state().result;
    expect(grams!.colorGrams).toBe(50);
    expect(grams!.developerGrams).toBeCloseTo((50 * mixingRatio.developerParts) / mixingRatio.colorParts);
  });
});
