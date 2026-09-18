import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchFormulaHistory, saveFormulaToHistory, deleteHistoryEntry } from "./firestore";

const addDocMock = vi.fn();
const updateDocMock = vi.fn();
const deleteDocMock = vi.fn();
const docMock = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const uploadBytesMock = vi.fn();
const getDownloadURLMock = vi.fn();
const deleteObjectMock = vi.fn();

const getDocsMock = vi.fn();
const orderByMock = vi.fn((...args: unknown[]) => ({ kind: "orderBy", field: args[0] }));
const whereMock = vi.fn((...args: unknown[]) => ({ kind: "where", field: args[0], op: args[1], value: args[2] }));
const queryMock = vi.fn((...args: unknown[]) => ({ kind: "query", args }));

vi.mock("firebase/firestore", () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: vi.fn(() => "collection-ref"),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
  serverTimestamp: vi.fn(() => "server-timestamp"),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  // schema.ts (imported transitively via firestore.ts) uses `Timestamp` as a
  // `z.instanceof` check - any distinct class works here since these tests never
  // construct one. Declared inside the factory since `vi.mock` factories are hoisted
  // above top-level module code.
  Timestamp: class MockTimestamp { },
}));
vi.mock("firebase/storage", () => ({
  deleteObject: (...args: unknown[]) => deleteObjectMock(...args),
  getDownloadURL: (...args: unknown[]) => getDownloadURLMock(...args),
  ref: (...args: unknown[]) => ({ kind: "ref", args }),
  uploadBytes: (...args: unknown[]) => uploadBytesMock(...args),
}));
vi.mock("../firebase", () => ({ db: {}, storage: {} }));

function baseParams() {
  return {
    clientName: "Anna",
    clientId: null,
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
  deleteDocMock.mockResolvedValue(undefined);
  uploadBytesMock.mockResolvedValue(undefined);
  getDownloadURLMock.mockResolvedValue("https://example.test/photo.jpg");
  getDocsMock.mockResolvedValue({ docs: [] });
  deleteObjectMock.mockResolvedValue(undefined);
});

describe("saveFormulaToHistory", () => {
  it("resolves even when the photo upload fails, instead of surfacing a false error that would prompt a duplicate-creating retry", async () => {
    uploadBytesMock.mockRejectedValue(new Error("network drop"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => { });

    await expect(saveFormulaToHistory({
      ...baseParams(),
      beforePhotoFile: new File(["x"], "before.jpg", { type: "image/jpeg" }),
      afterPhotoFile: null,
    })).resolves.toBeUndefined();

    // The history entry itself (client, formula, pricing, patch-test info) was already
    // durably saved via addDoc before the photo upload ran - exactly once, no retry loop.
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

describe("fetchFormulaHistory", () => {
  it("queries every entry, unfiltered by owner, for an admin", async () => {
    await fetchFormulaHistory({ isAdmin: true, currentUserEmail: "admin@salon.test" });

    expect(whereMock).not.toHaveBeenCalled();
    expect(orderByMock).toHaveBeenCalledWith("appliedAt", "desc");
    expect(queryMock).toHaveBeenCalledWith("collection-ref", { kind: "orderBy", field: "appliedAt" });
  });

  it("scopes the query to the signed-in stylist's own entries for a non-admin (Firestore rules reject an unscoped list request for them)", async () => {
    await fetchFormulaHistory({ isAdmin: false, currentUserEmail: "stylist@salon.test" });

    expect(whereMock).toHaveBeenCalledWith("appliedBy", "==", "stylist@salon.test");
    expect(queryMock).toHaveBeenCalledWith(
      "collection-ref",
      { kind: "where", field: "appliedBy", op: "==", value: "stylist@salon.test" },
      { kind: "orderBy", field: "appliedAt" }
    );
  });
});

describe("deleteHistoryEntry", () => {
  it("deletes both photo slots and the document when both photos exist", async () => {
    await deleteHistoryEntry({ id: "entry-1", beforePhotoUrl: "https://x/before.jpg", afterPhotoUrl: "https://x/after.jpg" });

    expect(deleteObjectMock).toHaveBeenCalledTimes(2);
    expect(deleteObjectMock).toHaveBeenCalledWith({ kind: "ref", args: [{}, "formulaHistory/entry-1/before"] });
    expect(deleteObjectMock).toHaveBeenCalledWith({ kind: "ref", args: [{}, "formulaHistory/entry-1/after"] });
    expect(deleteDocMock).toHaveBeenCalledWith({ kind: "doc", args: [{}, "formulaHistory", "entry-1"] });
  });

  it("skips a photo slot that was never uploaded", async () => {
    await deleteHistoryEntry({ id: "entry-1", beforePhotoUrl: "https://x/before.jpg", afterPhotoUrl: null });

    expect(deleteObjectMock).toHaveBeenCalledTimes(1);
    expect(deleteObjectMock).toHaveBeenCalledWith({ kind: "ref", args: [{}, "formulaHistory/entry-1/before"] });
    expect(deleteDocMock).toHaveBeenCalledTimes(1);
  });

  it("deletes the document even when a photo was already gone from Storage", async () => {
    deleteObjectMock.mockRejectedValue({ code: "storage/object-not-found" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deleteHistoryEntry({ id: "entry-1", beforePhotoUrl: "https://x/before.jpg", afterPhotoUrl: null }))
      .resolves.toBeUndefined();

    expect(deleteDocMock).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("still deletes the document when a photo delete fails for a real reason, logging it rather than blocking the record wipe", async () => {
    deleteObjectMock.mockRejectedValue(new Error("network drop"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deleteHistoryEntry({ id: "entry-1", beforePhotoUrl: "https://x/before.jpg", afterPhotoUrl: null }))
      .resolves.toBeUndefined();

    expect(deleteDocMock).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it("skips Storage entirely when neither photo was uploaded", async () => {
    await deleteHistoryEntry({ id: "entry-1", beforePhotoUrl: null, afterPhotoUrl: null });

    expect(deleteObjectMock).not.toHaveBeenCalled();
    expect(deleteDocMock).toHaveBeenCalledTimes(1);
  });
});
