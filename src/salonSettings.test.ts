import { describe, it, expect, vi, beforeEach } from "vitest";
import { subscribeToPricingSettings, setSalonMarkupMultiplier, DEFAULT_PRICING_SETTINGS } from "./salonSettings";

const docMock = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const setDocMock = vi.fn();
const onSnapshotMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => docMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
}));
vi.mock("./firebase", () => ({ db: {} }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("subscribeToPricingSettings", () => {
  it("falls back to the built-in default when the document doesn't exist", () => {
    const onChange = vi.fn();
    subscribeToPricingSettings(onChange);
    const [, onNext] = onSnapshotMock.mock.calls[0];
    onNext({ exists: () => false });
    expect(onChange).toHaveBeenCalledWith(DEFAULT_PRICING_SETTINGS);
  });

  it("passes through a well-formed document", () => {
    const onChange = vi.fn();
    subscribeToPricingSettings(onChange);
    const [, onNext] = onSnapshotMock.mock.calls[0];
    onNext({ exists: () => true, data: () => ({ markupMultiplier: 3.5 }) });
    expect(onChange).toHaveBeenCalledWith({ markupMultiplier: 3.5 });
  });

  it("falls back to the built-in default for a malformed document instead of poisoning every calculator's markup", () => {
    const onChange = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    subscribeToPricingSettings(onChange);
    const [, onNext] = onSnapshotMock.mock.calls[0];
    onNext({ exists: () => true, data: () => ({ markupMultiplier: "not-a-number" }) });
    expect(onChange).toHaveBeenCalledWith(DEFAULT_PRICING_SETTINGS);
    consoleError.mockRestore();
  });

  // Regression: a permission-denied listener error (e.g. the salonSettings Firestore rule
  // hasn't propagated/deployed yet) used to have no onError handler at all, so Firestore
  // logged it as an uncaught "Error in snapshot listener" and no calculator ever got a
  // markup value. It must instead fall back to the default, the same as every other
  // degraded case above.
  it("falls back to the built-in default when the listener itself errors (e.g. permission-denied)", () => {
    const onChange = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    subscribeToPricingSettings(onChange);
    const [, , onError] = onSnapshotMock.mock.calls[0];
    onError(new Error("Missing or insufficient permissions."));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_PRICING_SETTINGS);
    consoleError.mockRestore();
  });
});

describe("setSalonMarkupMultiplier", () => {
  it("writes the markup to the well-known pricing settings document", async () => {
    await setSalonMarkupMultiplier(3);
    expect(setDocMock).toHaveBeenCalledWith(expect.anything(), { markupMultiplier: 3 });
  });
});
