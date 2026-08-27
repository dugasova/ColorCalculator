// One-off repair: deletes every migrated `paletteOverrides` `add` document for
// L'Oréal Majirel (brandId 'loreal', shade.line 'majirel'), so the corrected,
// verified-against-the-official-chart shade array in src/engine/brands/loreal.ts
// takes effect for every salon that already ran `npm run migrate:palette` before
// that correction landed.
//
// Why this is needed: `getFullBrandShades` drops a base shade in favor of an
// `add` override sharing its (line, code) — see src/engine/brands.ts. If Majirel
// was migrated into Firestore while the chart still held the old, approximated
// shade data, those stale override documents keep shadowing the corrected
// built-in chart even after the source file is fixed. Deleting them lets the
// (now-correct) base chart show through immediately; no re-add is needed for the
// app to work, since `setShadeDisabled` targets shades by (line, code) whether or
// not they were ever migrated. Run `npm run migrate:palette` again afterward only
// if you want the corrected chart to also be individually admin-editable in
// PaletteAdminView (matching the original migration's purpose).
//
// Safe to run even if Majirel was never migrated (finds nothing, deletes nothing).
// Safe to re-run.
//
// Usage:
//   MIGRATION_ADMIN_EMAIL=you@salon.example MIGRATION_ADMIN_PASSWORD=... npm run migrate:repair-majirel
//
// The signed-in account MUST already have `role: 'admin'` on its `users/{uid}`
// Firestore document (see firestore.rules) — palette deletes are rejected otherwise.
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { auth, db } from "../src/firebase";
import type { PaletteOverride } from "../src/engine/brands";

async function main() {
  const email = process.env.MIGRATION_ADMIN_EMAIL;
  const password = process.env.MIGRATION_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set MIGRATION_ADMIN_EMAIL and MIGRATION_ADMIN_PASSWORD to an account with role: 'admin' before running this script.");
    process.exitCode = 1;
    return;
  }

  await signInWithEmailAndPassword(auth, email, password);

  const snapshot = await getDocs(collection(db, "paletteOverrides"));
  const staleMajirelAdds = snapshot.docs.filter(d => {
    const data = d.data() as PaletteOverride;
    return data.kind === 'add' && data.brandId === 'loreal' && data.shade.line === 'majirel';
  });

  for (const d of staleMajirelAdds) {
    await deleteDoc(doc(db, "paletteOverrides", d.id));
  }

  console.log(`Deleted ${staleMajirelAdds.length} stale Majirel override(s). The corrected built-in chart now applies.`);
  await signOut(auth);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
