import { describe, expect, it } from "vitest";
import { formatBrandLineLabel, formatLineLabel } from "./formatLineLabel";

describe("formatLineLabel", () => {
  it("capitalizes each word of the line id", () => {
    expect(formatLineLabel("koleston-perfect")).toBe("Koleston Perfect");
    expect(formatLineLabel("super-sync")).toBe("Super Sync");
  });

  it("spells SoColor as Matrix does", () => {
    expect(formatLineLabel("socolor")).toBe("SoColor");
    expect(formatBrandLineLabel("Matrix", "socolor")).toBe("Matrix SoColor");
  });
});
