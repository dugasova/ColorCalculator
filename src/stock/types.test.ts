import { describe, it, expect } from "vitest";
import { stockRecordSchema } from "./types";

describe("stockRecordSchema", () => {
  it("still accepts a developer document saved before line-scoping existed (no `line` key at all), defaulting it to null", () => {
    const legacyDoc = { kind: "developer", brandId: "wella", volume: 6, remainingGrams: 500 };
    const result = stockRecordSchema.safeParse(legacyDoc);
    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({ line: null });
  });

  it("accepts a scoped developer document with an explicit line", () => {
    const scopedDoc = { kind: "developer", brandId: "loreal", line: "inoa", volume: 20, remainingGrams: 10 };
    const result = stockRecordSchema.safeParse(scopedDoc);
    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({ line: "inoa" });
  });
});
