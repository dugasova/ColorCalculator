import { describe, it, expect, vi, beforeEach } from "vitest";
import { subscribeToFormulaHistory, saveFormulaToHistory, deleteHistoryEntry, updateHistoryEntryDetails } from "./firestore";

const addDocMock = vi.fn();
const updateDocMock = vi.fn();
const deleteDocMock = vi.fn();
const docMock = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const uploadBytesMock = vi.fn();
const getDownloadURLMock = vi.fn();
const deleteObjectMock = vi.fn();

const onSnapshotMock = vi.fn();
const orderByMock = vi.fn((...args: unknown[]) => ({ kind: "orderBy", field: args[0] }));
const whereMock = vi.fn((...args: unknown[]) => ({ kind: "where", field: args[0], op: args[1], value: args[2] }));
const queryMock = vi.fn((...args: unknown[]) => ({ kind: "query", args }));

vi.mock("firebase/firestore", () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: vi.fn(() => "collection-ref"),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
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
  onSnapshotMock.mockImplementation(() => () => {});
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

describe("subscribeToFormulaHistory", () => {
  it("queries every entry, unfiltered by owner, for an admin", () => {
    onSnapshotMock.mockImplementation(() => () => {});
    subscribeToFormulaHistory({ isAdmin: true, currentUserEmail: "admin@salon.test" }, () => {}, () => {});

    expect(whereMock).not.toHaveBeenCalled();
    expect(orderByMock).toHaveBeenCalledWith("appliedAt", "desc");
    expect(queryMock).toHaveBeenCalledWith("collection-ref", { kind: "orderBy", field: "appliedAt" });
  });

  it("scopes the query to the signed-in stylist's own entries for a non-admin (Firestore rules reject an unscoped list request for them)", () => {
    onSnapshotMock.mockImplementation(() => () => {});
    subscribeToFormulaHistory({ isAdmin: false, currentUserEmail: "stylist@salon.test" }, () => {}, () => {});

    expect(whereMock).toHaveBeenCalledWith("appliedBy", "==", "stylist@salon.test");
    expect(queryMock).toHaveBeenCalledWith(
      "collection-ref",
      { kind: "where", field: "appliedBy", op: "==", value: "stylist@salon.test" },
      { kind: "orderBy", field: "appliedAt" }
    );
  });

  it("skips a malformed document instead of throwing or poisoning the rest of the list", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    onSnapshotMock.mockImplementation((_q, next) => {
      next({
        docs: [
          {
            id: "good",
            data: () => ({
              clientName: "Anna", clientId: null, note: "", appliedBy: "s@t", steps: [], markupMultiplier: 1,
              productCost: null, servicePrice: null, patchTestDate: "", allergyNotes: "", patchTestOverride: false,
              beforePhotoUrl: null, afterPhotoUrl: null, appliedAt: null,
            }),
          },
          { id: "bad", data: () => ({ appliedBy: "s@t" }) }, // missing required fields
        ],
      });
      return () => {};
    });

    const onChange = vi.fn();
    subscribeToFormulaHistory({ isAdmin: true, currentUserEmail: "s@t" }, onChange, () => {});

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
    expect(onChange.mock.calls[0][0][0].id).toBe("good");
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
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

describe("updateHistoryEntryDetails", () => {
  function editParams(overrides: Partial<Parameters<typeof updateHistoryEntryDetails>[0]> = {}) {
    return {
      entry: { id: "entry-1", beforePhotoUrl: null, afterPhotoUrl: null },
      note: "edited note",
      patchTestDate: "2024-02-27T10:00",
      allergyNotes: "none",
      patchTestOverride: false,
      beforePhoto: { kind: "keep" as const },
      afterPhoto: { kind: "keep" as const },
      ...overrides,
    };
  }

  it("writes the text fields and returns them for the caller to merge, leaving the formula and pricing out of the update", async () => {
    const result = await updateHistoryEntryDetails(editParams());

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    expect(updateDocMock).toHaveBeenCalledWith(
      { kind: "doc", args: [{}, "formulaHistory", "entry-1"] },
      { note: "edited note", patchTestDate: "2024-02-27T10:00", allergyNotes: "none", patchTestOverride: false, beforePhotoUrl: null, afterPhotoUrl: null },
    );
    expect(result.note).toBe("edited note");
    expect(uploadBytesMock).not.toHaveBeenCalled();
    expect(deleteObjectMock).not.toHaveBeenCalled();
  });

  it("keeps an existing photo URL untouched on a 'keep' edit", async () => {
    const result = await updateHistoryEntryDetails(editParams({
      entry: { id: "entry-1", beforePhotoUrl: "https://x/before.jpg", afterPhotoUrl: null },
    }));

    expect(result.beforePhotoUrl).toBe("https://x/before.jpg");
    expect(uploadBytesMock).not.toHaveBeenCalled();
  });

  it("uploads a forgotten photo to its deterministic slot path and stores the resulting URL in the same write", async () => {
    const file = new File(["x"], "after.jpg", { type: "image/jpeg" });

    const result = await updateHistoryEntryDetails(editParams({ afterPhoto: { kind: "replace", file } }));

    expect(uploadBytesMock).toHaveBeenCalledWith({ kind: "ref", args: [{}, "formulaHistory/entry-1/after"] }, file);
    expect(result.afterPhotoUrl).toBe("https://example.test/photo.jpg");
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    expect(updateDocMock.mock.calls[0][1]).toMatchObject({ afterPhotoUrl: "https://example.test/photo.jpg" });
  });

  it("rejects and leaves the document untouched when a photo upload fails, so the colorist sees the failure and can retry", async () => {
    uploadBytesMock.mockRejectedValue(new Error("network drop"));

    await expect(updateHistoryEntryDetails(editParams({
      beforePhoto: { kind: "replace", file: new File(["x"], "before.jpg") },
    }))).rejects.toThrow("network drop");

    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("clears the URL, then deletes the stored file, when a photo is removed", async () => {
    const result = await updateHistoryEntryDetails(editParams({
      entry: { id: "entry-1", beforePhotoUrl: "https://x/before.jpg", afterPhotoUrl: "https://x/after.jpg" },
      beforePhoto: { kind: "remove" },
    }));

    expect(result.beforePhotoUrl).toBeNull();
    expect(result.afterPhotoUrl).toBe("https://x/after.jpg");
    expect(deleteObjectMock).toHaveBeenCalledTimes(1);
    expect(deleteObjectMock).toHaveBeenCalledWith({ kind: "ref", args: [{}, "formulaHistory/entry-1/before"] });
    expect(updateDocMock.mock.invocationCallOrder[0]).toBeLessThan(deleteObjectMock.mock.invocationCallOrder[0]);
  });

  it("does not delete any file, and does not touch Storage, when the document update fails", async () => {
    updateDocMock.mockRejectedValue(new Error("permission-denied"));

    await expect(updateHistoryEntryDetails(editParams({
      entry: { id: "entry-1", beforePhotoUrl: "https://x/before.jpg", afterPhotoUrl: null },
      beforePhoto: { kind: "remove" },
    }))).rejects.toThrow("permission-denied");

    expect(deleteObjectMock).not.toHaveBeenCalled();
  });
});
