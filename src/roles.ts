import { doc, onSnapshot, type FirestoreError, type Unsubscribe } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

export type UserRole = "admin" | "stylist";
export type Membership = "loading" | "pending" | UserRole;

const USERS_COLLECTION = "users";

// Role assignment isn't self-service — there's no UI for it. An admin (or the salon owner
// with console access) sets `role: 'admin'` on a `users/{uid}` document by hand in the
// Firebase console; everyone else defaults to 'stylist'. See firestore.rules: only the
// palette collections check this role, and only reads of `users` are allowed client-side.
//
// A signed-up, email-verified user has no `users/{uid}` document until the salon owner
// provisions them (see `scripts/backfillUserDocs.ts`), so a missing doc or a permission
// error both mean "not provisioned yet" rather than a real failure — see firestore.rules
// lines 25–27 and 45–48. We only report "pending" once we're sure the doc is really
// missing server-side; a cache miss while offline would otherwise flash that screen.
export function subscribeToMembership(uid: string, onChange: (membership: Exclude<Membership, "loading">) => void): Unsubscribe {
  return onSnapshot(
    doc(db, USERS_COLLECTION, uid),
    snapshot => {
      if (snapshot.exists()) {
        onChange(snapshot.data().role === "admin" ? "admin" : "stylist");
        return;
      }
      if (!snapshot.metadata.fromCache) {
        onChange("pending");
      }
    },
    (error: FirestoreError) => {
      if (error.code === "permission-denied") {
        onChange("pending");
        return;
      }
      console.error(error);
      onChange("stylist");
    }
  );
}

// `uid` is a Firebase `User.uid`, always a non-empty string for a signed-in user — see the
// only call site, `MemberGate`, which only renders once `user` exists.
export function useMembership(uid: string): Membership {
  const [membership, setMembership] = useState<Membership>("loading");

  useEffect(() => subscribeToMembership(uid, setMembership), [uid]);

  return membership;
}
