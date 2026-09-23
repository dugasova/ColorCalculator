import { describe, it, expect } from "vitest";
import i18n from "../src/i18n";
import { formatSessionText, formatSessionSummary } from "./formatSession";
import type { ColorHistoryStep, BleachHistoryStep } from "./history";

const colorStep: ColorHistoryStep = {
  kind: "color",
  brandName: "Generic",
  line: null,
  targetShade: { code: "9.1", level: 9, tone: "ash" },
  startLevel: 6,
  grayPercent: 0,
  applicationZone: "full-head",
  result: {
    developerVolume: 30,
    mixingRatio: { colorParts: 1, developerParts: 2 },
    grayCoverage: { naturalRatio: 0, fashionRatio: 1, note: "apply the fashion tone as-is" },
    achievedLevel: 9,
    underlyingPigment: "pale-yellow",
    recommendedCorrectiveTone: "violet",
    correctorGrams: 3,
    recommendedProcessingMinutes: 30,
    toneWarning: null,
    eligibilityWarning: null,
    liftUnsupportedWarning: null,
    grams: { colorGrams: 20, developerGrams: 40 },
  },
  additionalShade: null,
  additionalShadeGrams: null,
  blend: null,
  prePigmentation: null,
  neutralizationApplied: false,
  processingMinutes: 30,
  pricePerGram: 0.18,
};

const bleachStep: BleachHistoryStep = {
  kind: "bleach",
  startLevel: 6,
  targetLevel: 9,
  result: {
    startLevel: 6, targetLevel: 9, liftNeeded: 3, developerVolume: 30, multiStepRequired: false,
    mixingRatio: { powderParts: 1, developerParts: 2 }, grams: { powderGrams: 20, developerGrams: 40 },
    recommendedProcessingMinutes: 35, maxScalpProcessingMinutes: 50, checkIntervalMinMinutes: 5, checkIntervalMaxMinutes: 10,
  },
  processingMinutes: 35,
  pricePerGram: 0.1,
};

describe("formatSessionText", () => {
  it("renders a single-step session exactly like the plain single-formula text, with no step numbering", () => {
    const text = formatSessionText([colorStep]);
    expect(text).not.toContain("Step 1");
    expect(text).toContain("Generic — 9.1 (ash)");
    expect(text).toContain("Mix: 9.1- 20.0 g developer 40.0 g");
  });

  it("numbers each step and appends the combined total processing time for a multi-step session", () => {
    const text = formatSessionText([bleachStep, colorStep]);

    expect(text).toContain("Step 1");
    expect(text).toContain("Step 2");
    expect(text).toContain("Bleach Calculator");
    expect(text).toContain("Generic — 9.1 (ash)");
    // 35 (bleach) + 30 (color) = 65 total minutes.
    expect(text).toContain("Total processing time: 65 min");
  });

  it("orders blocks the same as the input steps array", () => {
    const text = formatSessionText([colorStep, bleachStep]);
    const colorIndex = text.indexOf("Generic — 9.1");
    const bleachIndex = text.indexOf("Bleach Calculator");
    expect(colorIndex).toBeLessThan(bleachIndex);
  });

  it("does not throw for a step saved before the blend field existed (blend is undefined, not null)", () => {
    const legacyStep = { ...colorStep };
    delete (legacyStep as Partial<ColorHistoryStep>).blend;

    expect(() => formatSessionText([legacyStep])).not.toThrow();
    expect(formatSessionText([legacyStep])).toContain("Mix: 9.1- 20.0 g developer 40.0 g");
  });

  it("prepends the recorded filler step ahead of the target-color block when prePigmentation is set", () => {
    const stepWithFiller: ColorHistoryStep = {
      ...colorStep,
      startLevel: 9,
      targetShade: { code: "5.4", level: 5, tone: "copper" },
      prePigmentation: {
        need: "required-same-session",
        underlyingPigment: "orange",
        fillerTone: "copper",
        exampleFillerShade: { code: "5.4", level: 5, tone: "copper" },
        mixingRatio: { fillerParts: 1, diluentParts: 1 },
        grams: { fillerGrams: 15, diluentGrams: 15 },
        fillerProcessingMinutes: 15,
        multiVisitGapDays: null,
        finalStepMixingRatio: { colorParts: 1, developerParts: 1 },
        finalStepDeveloperVolume: 10,
      },
    };

    const text = formatSessionText([stepWithFiller]);

    expect(text).toContain("Step 1 — Filler");
    expect(text).toContain("Generic 5.4 (Copper)");
    expect(text).toContain("Step 2 — Target color");
    expect(text).toContain("Generic — 5.4 (copper)");
  });

  it("does not throw for a step saved before the prePigmentation field existed (reads back as undefined, not null)", () => {
    const legacyStep = { ...colorStep };
    delete (legacyStep as Partial<ColorHistoryStep>).prePigmentation;

    expect(() => formatSessionText([legacyStep])).not.toThrow();
    expect(formatSessionText([legacyStep])).not.toContain("Step 1 — Filler");
  });

  it("renders the gray-coverage note in the current UI language, ignoring whatever language was baked into the stored note when the entry was saved (regression: a Firestore-loaded step's note is a plain string frozen at save time, not a live i18n getter)", () => {
    const staleEnglishNoteStep: ColorHistoryStep = {
      ...colorStep,
      result: {
        ...colorStep.result,
        grayCoverage: { naturalRatio: 0, fashionRatio: 1, note: "apply the fashion tone as-is" },
      },
    };
    const originalLanguage = i18n.language;
    try {
      i18n.changeLanguage("uk");
      const text = formatSessionText([staleEnglishNoteStep]);
      expect(text).toContain("Покриття сивини: нанести модний тон без змішування (0% база / 100% тон)");
      expect(text).not.toContain("apply the fashion tone as-is");
    } finally {
      i18n.changeLanguage(originalLanguage);
    }
  });
});

describe("formatSessionSummary", () => {
  it("summarizes a single color step as starting level -> brand/line/shade", () => {
    const summary = formatSessionSummary([{ ...colorStep, line: "koleston-perfect", brandName: "Wella", startLevel: 10, targetShade: { code: "7/17", level: 7, tone: "ash", secondaryTone: "chocolate" } }]);

    expect(summary).toBe("Starting level: 10 → Target: Wella Koleston Perfect — 7/17");
  });

  it("omits the line when the step has none", () => {
    const summary = formatSessionSummary([colorStep]);

    expect(summary).toBe("Starting level: 6 → Target: Generic — 9.1");
  });

  it("falls back to the plain target level for a bleach-only session (no color/toning step)", () => {
    const summary = formatSessionSummary([bleachStep]);

    expect(summary).toBe("Starting level: 6 → Target: 9");
  });

  it("favors the LAST color step's shade in a multi-step session, not the first step's starting level target", () => {
    const summary = formatSessionSummary([bleachStep, colorStep]);

    // bleachStep starts at 6; colorStep (the final toning step) targets Generic 9.1.
    expect(summary).toBe("Starting level: 6 → Target: Generic — 9.1");
  });

  it("lists each zone's own final shade instead of a false single target when a multi-zone session's zones reach different results", () => {
    // Regression: root 6/6.0, mid-lengths 8/8.12, ends 10/10.13 previously collapsed to
    // "Starting level: 6-10 -> Target: Generic - 10.13", implying every zone reached the
    // ends' shade -- neither the roots nor the mid-lengths zone actually did.
    const roots = { ...colorStep, startLevel: 6 as const, strandZone: "roots" as const, targetShade: { code: "6.0", level: 6 as const, tone: "natural" as const } };
    const midLengths = { ...colorStep, startLevel: 8 as const, strandZone: "mid-lengths" as const, targetShade: { code: "8.12", level: 8 as const, tone: "ash" as const, secondaryTone: "matt" as const } };
    const ends = { ...colorStep, startLevel: 10 as const, strandZone: "ends" as const, targetShade: { code: "10.13", level: 10 as const, tone: "ash" as const, secondaryTone: "gold" as const } };

    const summary = formatSessionSummary([roots, midLengths, ends]);

    expect(summary).toBe("Starting level: 6–10 → Target: Roots 6.0, Mid-lengths 8.12, Ends 10.13");
  });

  it("still favors the LAST color step's shade when steps share one zone -- sequential passes on the same hair, not parallel zones", () => {
    const roots = { ...colorStep, startLevel: 6 as const, strandZone: "roots" as const, targetShade: { code: "6.0", level: 6 as const, tone: "natural" as const } };
    const rootsCorrected = { ...colorStep, startLevel: 6 as const, strandZone: "roots" as const, targetShade: { code: "6.1", level: 6 as const, tone: "ash" as const } };

    const summary = formatSessionSummary([roots, rootsCorrected]);

    expect(summary).toBe("Starting level: 6 → Target: Generic — 6.1");
  });

  it("keeps the single-value format when every step happens to share the same start level", () => {
    const summary = formatSessionSummary([colorStep, { ...colorStep, targetShade: { code: "6.1", level: 6 as const, tone: "ash" as const } }]);

    expect(summary).toBe("Starting level: 6 → Target: Generic — 6.1");
  });
});

describe("formatSessionText: zone and starting-base recap", () => {
  it("prepends the zone label and starting-base line ahead of the rest of a step's text when set", () => {
    const text = formatSessionText([{ ...colorStep, strandZone: "mid-lengths", startingBase: { kind: "colored", tone: "gold" } }]);

    expect(text).toContain("Zone: Mid-lengths");
    expect(text).toContain("Starting base: Colored (Gold)");
    expect(text.indexOf("Zone: Mid-lengths")).toBeLessThan(text.indexOf("Generic — 9.1"));
  });

  it("omits the redundant 'Application: Full head' line for a ComplexColoring step (it carries strandZone instead)", () => {
    // Regression: ColorStepCard no longer offers ApplicationZoneField, but
    // applicationZone stays frozen at "full-head" on the saved step -- the formula text
    // must not keep showing it as if it were still a real, colorist-made choice.
    const text = formatSessionText([{ ...colorStep, strandZone: "roots", applicationZone: "full-head" }]);
    expect(text).not.toContain("Application:");
  });

  it("keeps showing 'Application: ...' for a plain FormulaCalculator save (no strandZone at all)", () => {
    const text = formatSessionText([colorStep]);
    expect(text).toContain("Application: Full head");
  });


  it("shows the natural-base label with no tone when startingBase is natural", () => {
    const text = formatSessionText([{ ...colorStep, startingBase: { kind: "natural" } }]);
    expect(text).toContain("Starting base: Natural (virgin)");
  });

  it("omits the zone/starting-base lines entirely for a step that never set them (plain single-shade save)", () => {
    const text = formatSessionText([colorStep]);
    expect(text).not.toContain("Zone:");
    expect(text).not.toContain("Starting base:");
  });
});
