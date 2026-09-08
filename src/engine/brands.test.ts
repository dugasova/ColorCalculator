import { describe, it, expect } from "vitest";
import { IGORA_VIBRANCE_CHART } from "./brands/igora";

describe("IGORA_VIBRANCE_CHART", () => {
  it("mixes every shade -- including the Level 10 Toners sub-range -- 1:1 with Vibrance Activator", () => {
    expect(IGORA_VIBRANCE_CHART.length).toBeGreaterThan(0);
    for (const shade of IGORA_VIBRANCE_CHART) {
      expect(shade.fixedMixingRatio).toEqual({ colorParts: 1, developerParts: 1 });
    }
  });
});
