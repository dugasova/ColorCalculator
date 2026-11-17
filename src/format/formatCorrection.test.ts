import { describe, expect, it } from "vitest";
import "../i18n";
import { formatCorrectionMix } from "./formatCorrection";

describe("formatCorrectionMix", () => {
  it("writes the bowl like the formula mix, developer covering color and corrector", () => {
    const corrector = {
      parts: [
        { name: "0/88", grams: 1 },
        { name: "0/66", grams: 1 },
      ],
      developerGrams: 2,
    };
    expect(formatCorrectionMix(30, { colorParts: 1, developerParts: 1 }, corrector)).toBe(
      "color- 30.0 g 0/88- 1.0 g 0/66- 1.0 g developer 32.0 g",
    );
  });

  it("leaves the corrector out when none is mixed in", () => {
    expect(formatCorrectionMix(30, { colorParts: 1, developerParts: 2 }, null)).toBe("color- 30.0 g developer 60.0 g");
  });
});
