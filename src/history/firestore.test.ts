import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveFormulaToHistory } from "./firestore";

const addDocMock = vi.fn();
const updateDocMock = vi.fn();
const uploadBytesMock = vi.fn();
const getDownloadURLMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: vi.fn(() => "collection-ref"),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => "server-timestamp"),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  // schema.ts (imported transitively via firestore.ts) uses `Timestamp` as a
  // `z.instanceof` check -- any distinct class works here since these tests never
  // construct one. Declared inside the factory since `vi.mock` factories are hoisted
  // above top-level module code.
  Timestamp: class MockTimestamp {},
}));
vi.mock("firebase/storage", () => ({
  getDownloadURL: (...args: unknown[]) => getDownloadURLMock(...args),
  ref: vi.fn(() => "storage-ref"),
  uploadBytes: (...args: unknown[]) => uploadBytesMock(...args),
}));
vi.mock("../firebase", () => ({ db: {}, storage: {} }));

function baseParams() {
  return {
    clientName: "Anna",
    note: "",
    appliedBy: "stylist@salon.test",
    steps: [],
    markupMultiplier: 4,
    productCost: null,
    servicePrice: null,
    patchTestDate: "",
    allergyNotes: "",
    patchTestOverride: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  addDocMock.mockResolvedValue({ id: "doc-1" });
  updateDocMock.mockResolvedValue(undefined);
  uploadBytesMock.mockResolvedValue(undefined);
  getDownloadURLMock.mockResolvedValue("https://example.test/photo.jpg");
});

describe("saveFormulaToHistory", () => {
  it("resolves even when the photo upload fails, instead of surfacing a false error that would prompt a duplicate-creating retry", async () => {
    uploadBytesMock.mockRejectedValue(new Error("network drop"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(saveFormulaToHistory({
      ...baseParams(),
      beforePhotoFile: new File(["x"], "before.jpg", { type: "image/jpeg" }),
      afterPhotoFile: null,
    })).resolves.toBeUndefined();

    // The history entry itself (client, formula, pricing, patch-test info) was already
    // durably saved via addDoc before the photo upload ran -- exactly once, no retry loop.
    expect(addDocMock).toHaveBeenCalledTimes(1);
    // The failed attach is still traceable, just not fatal to the overall save.
    expect(consoleError).toHaveBeenCalledTimes(1);
    // No photo URL to attach, so no follow-up write was attempted.
    expect(updateDocMock).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("still attaches the uploaded photo URL on the happy path", async () => {
    await saveFormulaToHistory({
      ...baseParams(),
      beforePhotoFile: new File(["x"], "before.jpg", { type: "image/jpeg" }),
      afterPhotoFile: null,
    });

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    expect(updateDocMock).toHaveBeenCalledWith(
      { id: "doc-1" },
      { beforePhotoUrl: "https://example.test/photo.jpg" }
    );
  });
});
