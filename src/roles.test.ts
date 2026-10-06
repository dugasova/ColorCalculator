import { describe, it, expect, vi, beforeEach } from "vitest";
import { subscribeToMembership } from "./roles";

const docMock = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const onSnapshotMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => docMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
}));
vi.mock("./firebase", () => ({ db: {} }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("subscribeToMembership", () => {
  it("reports 'admin' for an existing doc with role admin", () => {
    const onChange = vi.fn();
    const { next } = captureCallbacksFor(onChange);

    next({ exists: () => true, data: () => ({ role: "admin" }) });

    expect(onChange).toHaveBeenCalledWith("admin");
  });

  it("reports 'stylist' for an existing doc without an admin role", () => {
    const onChange = vi.fn();
    const { next } = captureCallbacksFor(onChange);

    next({ exists: () => true, data: () => ({}) });

    expect(onChange).toHaveBeenCalledWith("stylist");
  });

  it("reports 'pending' for a missing doc confirmed server-side", () => {
    const onChange = vi.fn();
    const { next } = captureCallbacksFor(onChange);

    next({ exists: () => false, metadata: { fromCache: false } });

    expect(onChange).toHaveBeenCalledWith("pending");
  });

  it("does not call back for a missing doc that's only a cache miss", () => {
    const onChange = vi.fn();
    const { next } = captureCallbacksFor(onChange);

    next({ exists: () => false, metadata: { fromCache: true } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports 'pending' on a permission-denied error", () => {
    const onChange = vi.fn();
    const { error } = captureCallbacksFor(onChange);

    error({ code: "permission-denied" });

    expect(onChange).toHaveBeenCalledWith("pending");
  });

  it("reports 'stylist' and logs on any other error", () => {
    const onChange = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { error } = captureCallbacksFor(onChange);

    error({ code: "unavailable" });

    expect(onChange).toHaveBeenCalledWith("stylist");
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

function captureCallbacksFor(onChange: (membership: string) => void) {
  subscribeToMembership("uid-1", onChange);
  const [, next, error] = onSnapshotMock.mock.calls[0] as [
    unknown,
    (snapshot: unknown) => void,
    (error: unknown) => void,
  ];
  return { next, error };
}
