import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

export type UserRole = 'admin' | 'stylist';

const USERS_COLLECTION = "users";

// Role assignment isn't self-service — there's no UI for it. An admin (or the salon owner
// with console access) sets `role: 'admin'` on a `users/{uid}` document by hand in the
// Firebase console; everyone else defaults to 'stylist'. See firestore.rules: only the
// palette collections check this role, and only reads of `users` are allowed client-side.
export function subscribeToUserRole(uid: string, onChange: (role: UserRole) => void): Unsubscribe {
  return onSnapshot(doc(db, USERS_COLLECTION, uid), snapshot => {
    onChange(snapshot.data()?.role === 'admin' ? 'admin' : 'stylist');
  });
}

// `uid` is a Firebase `User.uid`, always a non-empty string for a signed-in user — see the
// only call site, `AuthenticatedApp` in App.tsx, which only renders once `user` exists.
export function useIsAdmin(uid: string): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => subscribeToUserRole(uid, role => setIsAdmin(role === 'admin')), [uid]);

  return isAdmin;
}
