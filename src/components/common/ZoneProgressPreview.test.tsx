// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "../../i18n";
import { ZoneProgressPreview } from "./ZoneProgressPreview";
import type { ColorHistoryStep } from "../../history";
import type { Shade } from "../../engine/shades";

// See ColorStepCard.interaction.test.tsx for why this project needs an explicit
// afterEach(cleanup): it doesn't set vitest's `test.globals: true`, so
// @testing-library/react's automatic cleanup (which relies on detecting a global
// `afterEach`) never registers on its own.
afterEach(cleanup);

const baseResult: ColorHistoryStep["result"] = {
  developerVolume: 30,
  mixingRatio: { colorParts: 1, developerParts: 2 },
  grayCoverage: { naturalRatio: 0, fashionRatio: 1, note: "apply the fashion tone as-is" },
  achievedLevel: null,
  underlyingPigment: null,
  recommendedCorrectiveTone: null,
  correctorGrams: null,
  recommendedProcessingMinutes: 30,
  toneWarning: null,
  eligibilityWarning: null,
  liftUnsupportedWarning: null,
  grams: { colorGrams: 20, developerGrams: 40 },
};

function colorStep(strandZone: ColorHistoryStep["strandZone"], startLevel: number, targetShade: Shade): ColorHistoryStep {
  return {
    kind: "color",
    brandName: "Generic",
    line: null,
    grayPercent: 0,
    applicationZone: "full-head",
    strandZone,
    startLevel: startLevel as ColorHistoryStep["startLevel"],
    targetShade,
    result: baseResult,
    additionalShade: null,
    additionalShadeGrams: null,
    blend: null,
    prePigmentation: null,
    neutralizationApplied: false,
    processingMinutes: 30,
    pricePerGram: 0.18,
  };
}

describe("ZoneProgressPreview", () => {
  it("renders one row per zone with the zone label and each step's caption", () => {
    const steps = [
      colorStep("roots", 6, { code: "6/97", level: 6, tone: "copper" }),
      colorStep("mid-lengths", 6, { code: "8.7", level: 8, tone: "gold" }),
      colorStep("ends", 8, { code: "8/73", level: 8, tone: "gold" }),
    ];

    render(<ZoneProgressPreview steps={steps} />);

    const rows = document.querySelectorAll(".zone-preview__row");
    expect(rows).toHaveLength(3);

    expect(screen.getByText("Roots")).toBeTruthy();
    expect(screen.getByText("Mid-lengths")).toBeTruthy();
    expect(screen.getByText("Ends")).toBeTruthy();

    expect(screen.getByText("6/97")).toBeTruthy();
    expect(screen.getByText("8.7")).toBeTruthy();
    expect(screen.getByText("8/73")).toBeTruthy();

    const swatches = document.querySelectorAll<HTMLElement>(".zone-preview__swatch");
    expect(swatches.length).toBeGreaterThan(0);
    for (const swatch of swatches) {
      expect(swatch.style.backgroundColor).not.toBe("");
    }
  });

  it("renders nothing for a session with no steps", () => {
    const { container } = render(<ZoneProgressPreview steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
