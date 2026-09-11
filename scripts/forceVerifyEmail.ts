// One-off unblock for when Firebase Auth's own verification email can't be delivered
// (mail provider silently blocking/dropping Firebase's default sender, resend quota
// exhausted from repeated attempts, expired links, etc.) -- marks one account's email
// as verified directly via the Admin SDK instead of "clicked the link in an email that
// arrived." firestore.rules requires `email_verified` on the ID token for every salon-
// data read/write (see src/App.tsx's VerifyEmailScreen gate, mirrored there client-
// side) -- this is the one legitimate way around a stuck delivery pipeline, since the
// Admin SDK enforces its own authority (a service account key scoped to this exact
// Firebase project) in place of "proved I own this inbox."
//
// Setup (once):
//   1. Firebase Console -> Project settings (gear icon) -> Service accounts ->
//      "Generate new private key" -- downloads a JSON key file. Save it OUTSIDE this
//      repo (or anywhere covered by .gitignore's `*firebase-adminsdk*.json` pattern) --
//      it grants full admin access to the whole Firebase project, treat it like a
//      password.
//   2. Add to .env: GOOGLE_APPLICATION_CREDENTIALS=/full/path/to/that-file.json
//
// Usage:
//   npm run verify-email:force -- someone@example.com
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "node:fs";

async function main() {
  const email = process.argv[2];
  if (email === undefined) {
    throw new Error("Usage: npm run verify-email:force -- <email>");
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath === undefined) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS in .env -- see this file's header comment.");
  }

  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  const app = initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth(app);

  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { emailVerified: true });
  console.log(`Marked "${email}" (uid ${user.uid}) as email-verified.`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
