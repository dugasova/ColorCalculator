import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureAccessRequest, approveAccessRequest } from "./accessRequests";

const getDocMock = vi.fn();
const setDocMock = vi.fn();
const docMock = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const writeBatchSetMock = vi.fn();
const writeBatchDeleteMock = vi.fn();
const writeBatchCommitMock = vi.fn();
const writeBatchMock = vi.fn((...args: unknown[]) => {
  void args;
  return { set: writeBatchSetMock, delete: writeBatchDeleteMock, commit: writeBatchCommitMock };
});

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "collection-ref"),
  doc: (...args: unknown[]) => docMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => "server-timestamp"),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: (...args: unknown[]) => writeBatchMock(...args),
  // schema.ts-style `z.instanceof` check -- any distinct class works here since these
  // tests never construct one. See src/history/firestore.test.ts's identical comment.
  Timestamp: class MockTimestamp { },
}));
vi.mock("./firebase", () => ({ db: {} }));

beforeEach(() => {
  vi.clearAllMocks();
  setDocMock.mockResolvedValue(undefined);
  writeBatchCommitMock.mockResolvedValue(undefined);
});

describe("ensureAccessRequest", () => {
  it("returns the existing status without writing when a request already exists", async () => {
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ status: "rejected" }) });

    const result = await ensureAccessRequest("u1", "u1@salon.test");

    expect(result).toBe("rejected");
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("creates a pending request when none exists yet", async () => {
    getDocMock.mockResolvedValue({ exists: () => false });

    const result = await ensureAccessRequest("u1", "u1@salon.test");

    expect(result).toBe("created");
    expect(setDocMock).toHaveBeenCalledWith(
      { kind: "doc", args: [{}, "accessRequests", "u1"] },
      { email: "u1@salon.test", status: "pending", requestedAt: "server-timestamp" }
    );
  });
});

describe("approveAccessRequest", () => {
  it("sets the stylist role and deletes the request in one batch", async () => {
    await approveAccessRequest("u1");

    expect(writeBatchSetMock).toHaveBeenCalledWith({ kind: "doc", args: [{}, "users", "u1"] }, { role: "stylist" });
    expect(writeBatchDeleteMock).toHaveBeenCalledWith({ kind: "doc", args: [{}, "accessRequests", "u1"] });
    expect(writeBatchCommitMock).toHaveBeenCalledTimes(1);
  });
});
