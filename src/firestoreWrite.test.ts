import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { settleWrite, SERVER_ACK_TIMEOUT_MS } from "./firestoreWrite";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("settleWrite", () => {
  it("resolves 'synced' once the write resolves, well before the timeout", async () => {
    const outcome = await settleWrite(Promise.resolve("ok"), "test write");
    expect(outcome).toBe("synced");
  });

  it("rejects with the write's own error when it rejects before the timeout", async () => {
    const err = new Error("permission-denied");
    await expect(settleWrite(Promise.reject(err), "test write")).rejects.toBe(err);
  });

  it("resolves 'queued' once the grace period elapses without the write settling", async () => {
    const promise = settleWrite(new Promise(() => {}), "test write");
    await vi.advanceTimersByTimeAsync(SERVER_ACK_TIMEOUT_MS);
    await expect(promise).resolves.toBe("queued");
  });

  it("logs, rather than throws, when a write rejects only after it was already treated as queued", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let reject!: (err: unknown) => void;
    const write = new Promise((_resolve, r) => { reject = r; });

    const promise = settleWrite(write, "late write");
    await vi.advanceTimersByTimeAsync(SERVER_ACK_TIMEOUT_MS);
    await expect(promise).resolves.toBe("queued");

    reject(new Error("network drop"));
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledTimes(1));
    expect(consoleError.mock.calls[0][0]).toContain("late write");

    consoleError.mockRestore();
  });
});
