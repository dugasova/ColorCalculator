import { describe, it, expect, vi, beforeEach } from "vitest";
import { consumeStock, reconcileStockConsumption, restockOneTube } from "./firestore";
import { makeColorStep } from "./testFixtures";

const docMock = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const getDocMock = vi.fn();
const setDocMock = vi.fn();
const updateDocMock = vi.fn();
const deleteDocMock = vi.fn();
const onSnapshotMock = vi.fn();
const incrementMock = vi.fn((n: number) => ({ kind: "increment", n }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "collection-ref"),
  doc: (...args: unknown[]) => docMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  increment: (n: number) => incrementMock(n),
}));
vi.mock("../firebase", () => ({ db: {} }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("consumeStock", () => {
  it("leaves an untracked product untouched instead of creating a new document", async () => {
    getDocMock.mockResolvedValue({ exists: () => false });
    await consumeStock([{ id: "shade::wella::x::y", kind: "shade", code: "y", grams: 30 }]);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("atomically decrements a tracked product's remaining grams", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });
    await consumeStock([{ id: "shade::wella::x::y", kind: "shade", code: "y", grams: 30 }]);
    expect(incrementMock).toHaveBeenCalledWith(-30);
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), { remainingGrams: { kind: "increment", n: -30 } });
  });

  it("treats an offline, uncached lookup the same as untracked instead of throwing", async () => {
    getDocMock.mockRejectedValue({ code: "unavailable" });
    await expect(consumeStock([{ id: "shade::wella::x::y", kind: "shade", code: "y", grams: 30 }])).resolves.toBeUndefined();
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});

describe("restockOneTube", () => {
  it("does nothing for an untracked product instead of creating one", async () => {
    getDocMock.mockResolvedValue({ exists: () => false });
    await restockOneTube("shade::wella::x::y", 60);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("atomically adds exactly one tube's worth of grams to a tracked product", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });
    await restockOneTube("shade::loreal::majirel::7.1", 50);
    expect(incrementMock).toHaveBeenCalledWith(50);
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), { remainingGrams: { kind: "increment", n: 50 } });
  });
});

describe("reconcileStockConsumption", () => {
  it("charges only the difference when a recorded actual figure changes an already-saved session's grams", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });
    const before = [makeColorStep({ actualColorGrams: undefined })];
    const after = [makeColorStep({ actualColorGrams: 45 })];
    await reconcileStockConsumption(before, after);
    expect(incrementMock).toHaveBeenCalledWith(-15);
    expect(updateDocMock).toHaveBeenCalledWith(
      expect.anything(),
      { remainingGrams: { kind: "increment", n: -15 } }
    );
  });

  it("issues no update at all when the two step arrays consume the same grams", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });
    const before = [makeColorStep()];
    const after = [makeColorStep()];
    await reconcileStockConsumption(before, after);
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});
