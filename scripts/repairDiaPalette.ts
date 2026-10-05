// One-off repair: deletes stale `paletteOverrides` documents for L'Oréal Dia lines that
// no longer match the current built-in chart in src/engine/brands/loreal.ts. Covers two
// separate corrections:
//
// 1. Every migrated `add` document for 'dia-light' or 'dia-richesse' predating the
//    `mixingRatioChoices: [1:1.5, 1:2]` addition to those lines. Why this is needed:
//    `getFullBrandShades` drops a base shade in favor of an `add` override sharing its
//    (line, code) -- see src/engine/paletteOverrides.ts. If Dia Light/Richesse were
//    migrated into Firestore before `mixingRatioChoices` existed on these lines, those
//    stale override documents shadow the corrected built-in chart. `getFullBrandShades`
//    already has a narrow fallback that patches a *missing* `mixingRatioChoices` onto
//    such a stale copy at read time, so the 1:2 ratio picker shows up either way -- but
//    the stale document itself keeps every other field frozen at migration time (e.g.
//    any future correction to these lines' tones, developer choices, etc. would
//    silently be shadowed again). Deleting them lets the (now-correct) base chart show
//    through directly for every field.
//
// 2. Any `disable` document still targeting the 'dia-richesse' line, now that Dia
//    Richesse has been removed from the built-in catalog entirely and replaced by Dia
//    Color (a distinct line id -- see brands/loreal.ts). Those disables are orphaned:
//    'dia-richesse' no longer exists in the built-in chart for them to match, so they'd
//    sit in Firestore forever doing nothing.
//
// Neither case needs a re-add afterward: `setShadeDisabled` targets shades by (line,
// code) whether or not they were ever migrated. Run `npm run migrate:palette` again
// only if you want the corrected chart to also be individually admin-editable in
// PaletteAdminView (matching the original migration's purpose).
//
// Safe to run even if Dia was never migrated (finds nothing, deletes nothing).
// Safe to re-run.
//
// Usage:
//   MIGRATION_ADMIN_EMAIL=you@salon.example MIGRATION_ADMIN_PASSWORD=... npm run migrate:repair-dia
//
// The signed-in account MUST already have `role: 'admin'` on its `users/{uid}`
// Firestore document (see firestore.rules) -- palette deletes are rejected otherwise.
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
  const staleDiaAdds = snapshot.docs.filter(d => {
    const data = d.data() as PaletteOverride;
    return data.kind === "add" && data.brandId === "loreal"
      && (data.shade.line === "dia-light" || data.shade.line === "dia-richesse");
  });
  const orphanedDiaRichesseDisables = snapshot.docs.filter(d => {
    const data = d.data() as PaletteOverride;
    return data.kind === "disable" && data.brandId === "loreal" && data.line === "dia-richesse";
  });
  const staleDocs = [...staleDiaAdds, ...orphanedDiaRichesseDisables];

  for (const d of staleDocs) {
    await deleteDoc(doc(db, "paletteOverrides", d.id));
  }

  console.log(`Deleted ${staleDocs.length} stale Dia override(s).`);
  await signOut(auth);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
