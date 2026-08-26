// One-off migration: copies every hard-coded built-in shade (Generic, Wella, L'Oréal —
// see src/engine/brands.ts) into Firestore as `paletteOverrides` `add` documents, so the
// whole catalog becomes admin-editable through PaletteAdminView instead of only the
// dye lines/shades added after that feature shipped.
//
// Requires a `.env` (see .env.example) with the target Firebase project's config —
// `npm run migrate:palette` loads it via `tsx --env-file=.env`, and src/firebase.ts
// reads it from `process.env` under Node (it reads `import.meta.env` instead when this
// same module is imported by the Vite-built browser app).
//
// Usage:
//   MIGRATION_ADMIN_EMAIL=you@salon.example MIGRATION_ADMIN_PASSWORD=... npm run migrate:palette
//
// The signed-in account MUST already have `role: 'admin'` on its `users/{uid}` Firestore
// document (see firestore.rules) — palette writes are rejected otherwise. Safe to re-run,
// including after a network failure mid-run: a shade already present in Firestore (matched
// by brand + line + code — plain code isn't unique, several Wella and L'Oréal lines reuse
// the same numeric codes) is skipped, and `getFullBrandShades`'s base/override dedup means
// a partially-migrated brand never shows duplicate rows even mid-run.
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../src/firebase";
import { addShadeToBrand } from "../src/palette";
import { BRANDS, shadeKey, type PaletteOverride } from "../src/engine/brands";

function migrationKey(brandId: string, shade: { line?: string; code: string }): string {
  return `${brandId}::${shadeKey(shade)}`;
}

async function main() {
  const email = process.env.MIGRATION_ADMIN_EMAIL;
  const password = process.env.MIGRATION_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set MIGRATION_ADMIN_EMAIL and MIGRATION_ADMIN_PASSWORD to an account with role: 'admin' before running this script.");
    process.exitCode = 1;
    return;
  }

  await signInWithEmailAndPassword(auth, email, password);

  const existingOverrides = (await getDocs(collection(db, "paletteOverrides"))).docs.map(d => d.data() as PaletteOverride);
  const alreadyMigrated = new Set(
    existingOverrides
      .filter((o): o is Extract<PaletteOverride, { kind: 'add' }> => o.kind === 'add')
      .map(o => migrationKey(o.brandId, o.shade))
  );

  let migrated = 0;
  let skipped = 0;
  for (const brand of Object.values(BRANDS)) {
    for (const shade of brand.shades) {
      if (alreadyMigrated.has(migrationKey(brand.id, shade))) {
        skipped++;
        continue;
      }
      await addShadeToBrand(brand.id, shade);
      migrated++;
    }
  }

  console.log(`Migrated ${migrated} shade(s) into Firestore, skipped ${skipped} already present.`);
  await signOut(auth);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
