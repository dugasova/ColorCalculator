import { z } from "zod";
import { Timestamp, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import type { FirestoreError, Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { parseSnapshotDocs } from "./firestoreSubscribe";
import { settleWrite } from "./firestoreWrite";

const ACCESS_REQUESTS_COLLECTION = "accessRequests";
const USERS_COLLECTION = "users";

export type AccessRequestStatus = "pending" | "rejected";

export interface AccessRequest {
  id: string;
  email: string;
  status: AccessRequestStatus;
  requestedAt: Timestamp | null;
}

const accessRequestShapeSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.enum(["pending", "rejected"]),
  requestedAt: z.instanceof(Timestamp).nullable(),
});

// Called once per session by MemberGate's PendingAccessScreen for a verified account
// that isn't a salon member yet (see roles.ts's subscribeToMembership). The document id
// is the requester's own uid, so a second call for the same uid (e.g. a reload, or the
// "Check again" button) is naturally idempotent at the Firestore level too -- but we
// still short-circuit here on a read first, rather than always writing, so an existing
// "rejected" request is never silently bounced back to "pending" by the requester simply
// reopening the app.
export async function ensureAccessRequest(uid: string, email: string): Promise<"created" | AccessRequestStatus> {
  const ref = doc(db, ACCESS_REQUESTS_COLLECTION, uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return (existing.data().status as AccessRequestStatus | undefined) === "rejected" ? "rejected" : "pending";
  }
  await settleWrite(setDoc(ref, { email, status: "pending", requestedAt: serverTimestamp() }), `access request ${uid}`);
  return "created";
}

// Admin action from TeamView: provisions the `users/{uid}` document that actually grants
// membership (see roles.ts, firestore.rules' isMember()) and clears the now-resolved
// request in one atomic batch, so a reader never observes "approved but still pending" or
// "request gone but not yet a member".
export async function approveAccessRequest(uid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, USERS_COLLECTION, uid), { role: "stylist" });
  batch.delete(doc(db, ACCESS_REQUESTS_COLLECTION, uid));
  await settleWrite(batch.commit(), `approve access ${uid}`);
}

// Leaves the request document in place (status: "rejected") rather than deleting it, so
// a rejected requester's PendingAccessScreen can show a clear reason instead of just
// looping back to "request sent" the next time ensureAccessRequest runs.
export async function rejectAccessRequest(uid: string): Promise<void> {
  await settleWrite(updateDoc(doc(db, ACCESS_REQUESTS_COLLECTION, uid), { status: "rejected" }), `reject access ${uid}`);
}

// Admin-only live list of requests still awaiting a decision (TeamView). No `orderBy`
// here -- a single-field `where` needs no composite index, unlike `where` + `orderBy` on
// a different field would -- so results are sorted client-side instead, oldest first,
// with the (practically impossible, write still in flight) `requestedAt: null` case last.
export function subscribeToPendingAccessRequests(
  onChange: (requests: AccessRequest[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const q = query(collection(db, ACCESS_REQUESTS_COLLECTION), where("status", "==", "pending"));
  return onSnapshot(q, snapshot => {
    const requests = parseSnapshotDocs<AccessRequest>(snapshot, accessRequestShapeSchema, "access request", true);
    requests.sort((a, b) => {
      if (a.requestedAt === null) return b.requestedAt === null ? 0 : 1;
      if (b.requestedAt === null) return -1;
      return a.requestedAt.toMillis() - b.requestedAt.toMillis();
    });
    onChange(requests);
  }, onError);
}
