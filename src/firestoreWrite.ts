// Firestore resolves a write's promise only on server acknowledgement; the write itself is
// applied to the local (persistent) cache immediately and replayed on reconnect. Waiting for
// the ack offline would leave "Saving…" spinning until the network returns, so after a short
// grace period we treat the write as queued and stop waiting.
export const SERVER_ACK_TIMEOUT_MS = 4000;

export type WriteOutcome = "synced" | "queued";

export function settleWrite(write: Promise<unknown>, label: string, timeoutMs = SERVER_ACK_TIMEOUT_MS): Promise<WriteOutcome> {
  // `Promise.resolve` (not used bare) so a caller/mock handing back a plain value instead
  // of an actual Promise -- real Firestore always returns one, but a test double might
  // not bother -- still behaves like an already-resolved write instead of throwing.
  const settled = Promise.resolve(write);
  // Promise.withResolvers would read more linearly here, but this repo's tsconfig targets
  // ES2023 (no ES2024 lib), so the executor form is what's actually available.
  return new Promise<WriteOutcome>((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve("queued");
      settled.catch(err => console.error(`Queued write "${label}" failed to sync:`, err));
    }, timeoutMs);
    settled.then(
      () => { clearTimeout(timer); resolve("synced"); },
      err => { clearTimeout(timer); reject(err); },
    );
  });
}
