// One-off repair: deletes every migrated `paletteOverrides` `add` document for Wella
// Koleston Perfect Special Blonde (brandId 'wella', shade.line 'koleston-perfect',
// shade.level 12), so the corrected shade array in src/engine/brands/wella.ts — which now
// sets `acceptsPartialLift` on every Special Blonde shade, letting the engine fall back to
// the strongest developer and report the level actually reached instead of refusing to
// compute a formula whenever the nominal level-12 target is out of reach in one process —
// takes effect for every salon that already ran `npm run migrate:palette` before that
// correction landed.
//
// Why this is needed: `getFullBrandShades` drops a base shade in favor of an `add`
// override sharing its (line, code) — see src/engine/paletteOverrides.ts. If Special Blonde
// was migrated into Firestore before `acceptsPartialLift` existed, those stale override
// documents keep shadowing the corrected built-in chart even after the source file is
// fixed, so the calculator keeps showing "Not achievable in a single process" for a
// deliberate maximum-lift selection. Deleting them lets the (now-correct) base chart show
// through immediately; no re-add is needed for the app to work, since `setShadeDisabled`
// targets shades by (line, code) whether or not they were ever migrated. Run
// `npm run migrate:palette` again afterward only if you want the corrected chart to also
// be individually admin-editable in PaletteAdminView (matching the original migration's
// purpose).
//
// Scoped to level 12 specifically (not the whole 'koleston-perfect' line, unlike the
// Igora/Majirel repair scripts) - Special Blonde has no distinct `line` of its own, it
// shares 'koleston-perfect' with the regular Koleston Perfect shades, and this repair must
// not touch those.
//
// Safe to run even if Special Blonde was never migrated (finds nothing, deletes nothing).
// Safe to re-run.
//
// Usage:
//   MIGRATION_ADMIN_EMAIL=you@salon.example MIGRATION_ADMIN_PASSWORD=... npm run migrate:repair-wella-special-blonde
//
// The signed-in account MUST already have `role: 'admin'` on its `users/{uid}`
// Firestore document (see firestore.rules) — palette deletes are rejected otherwise.
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { auth, db } from "../src/firebase";
import type { PaletteOverride } from "../src/engine/paletteOverrides";

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
  const staleSpecialBlondeAdds = snapshot.docs.filter(d => {
    const data = d.data() as PaletteOverride;
    return data.kind === "add" && data.brandId === "wella"
      && data.shade.line === "koleston-perfect" && data.shade.level === 12;
  });

  for (const d of staleSpecialBlondeAdds) {
    await deleteDoc(doc(db, "paletteOverrides", d.id));
  }

  console.log(`Deleted ${staleSpecialBlondeAdds.length} stale Special Blonde override(s). The corrected built-in chart now applies.`);
  await signOut(auth);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
