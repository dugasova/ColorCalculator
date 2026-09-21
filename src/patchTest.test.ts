import { describe, it, expect } from "vitest";
import { isPatchTestSufficient, PATCH_TEST_MIN_HOURS } from "./patchTest";

const HOUR_MS = 60 * 60 * 1000;
const referenceMs = new Date("2024-03-10T12:00").getTime();

describe("isPatchTestSufficient", () => {
  it("passes whenever the override is confirmed, even with no date", () => {
    expect(isPatchTestSufficient("", true, referenceMs)).toBe(true);
  });

  it("fails with no date and no override", () => {
    expect(isPatchTestSufficient("", false, referenceMs)).toBe(false);
  });

  it("passes when the test is exactly the minimum age at the reference time", () => {
    const date = "2024-03-08T12:00";
    expect(referenceMs - new Date(date).getTime()).toBe(PATCH_TEST_MIN_HOURS * HOUR_MS);
    expect(isPatchTestSufficient(date, false, referenceMs)).toBe(true);
  });

  it("fails when the test is even a minute short of the minimum age", () => {
    expect(isPatchTestSufficient("2024-03-08T12:01", false, referenceMs)).toBe(false);
  });
});
