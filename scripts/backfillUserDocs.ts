// One-off migration, run once before deploying the tightened firestore.rules (see that
// file's `isMember` comment): membership now requires a `users/{uid}` Firestore document
// to exist, not just a verified Auth account, so every *existing* Auth user needs one
// before the new rules land -- otherwise an already-active stylist is locked out the
// moment the rules deploy. New sign-ups after this point get their document created by
// an admin via the Firebase console (see src/roles.ts), same as role assignment already
// works; this script only backfills the accounts that predate that requirement.
//
// Defaults every backfilled account to `role: 'stylist'` (merge, so it never overwrites
// an existing document or an already-set `role: 'admin'`) -- an admin can promote anyone
// afterward the same way role assignment already works.
//
// Setup: same as scripts/forceVerifyEmail.ts -- a service account key referenced by
// GOOGLE_APPLICATION_CREDENTIALS in .env, kept outside the repo under secrets/ (gitignored).
//
// Usage:
//   npm run backfill:user-docs
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

async function main() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath === undefined) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS in .env -- see this file's header comment.");
  }

  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  const app = initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const { users } = await auth.listUsers();
  for (const user of users) {
    const ref = db.collection("users").doc(user.uid);
    const existing = await ref.get();
    if (existing.exists) {
      console.log(`Skipping ${user.email ?? user.uid} -- already has a users/ document.`);
      continue;
    }
    await ref.set({ role: "stylist" }, { merge: true });
    console.log(`Created users/${user.uid} (${user.email ?? "no email"}) with role: 'stylist'.`);
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
