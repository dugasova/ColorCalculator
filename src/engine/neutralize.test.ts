import { describe, it, expect } from "vitest";
import { suggestNeutralizingTone } from "./neutralize";

describe("suggestNeutralizingTone", () => {
  it("maps blue-based correctors to the ash retail tone", () => {
    expect(suggestNeutralizingTone("orange")).toBe("ash");
    expect(suggestNeutralizingTone("orange-yellow")).toBe("ash");
  });

  it("maps violet-based correctors to the violet retail tone", () => {
    expect(suggestNeutralizingTone("yellow-orange")).toBe("violet");
    expect(suggestNeutralizingTone("yellow")).toBe("violet");
    expect(suggestNeutralizingTone("pale-yellow")).toBe("violet");
    expect(suggestNeutralizingTone("very-light-yellow")).toBe("violet");
  });

  it("maps matt-based correctors to the matt retail tone", () => {
    expect(suggestNeutralizingTone("red")).toBe("matt");
    expect(suggestNeutralizingTone("red-orange")).toBe("matt");
  });
});
