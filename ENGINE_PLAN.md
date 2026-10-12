# Calculations stay on the client

## Context
Question: should this project's calculations (engine) be moved to a backend. Decision: don't move them. Code, rules, and infrastructure stay unchanged.

Grounds (verified in code):
- `src/engine/*` (~6000 lines) — pure deterministic functions with no `firebase` imports. Dependencies are only `zod`, `../i18n`, `../levels`, `../shades`.
- Offline operation is required: `src/firebase.ts` uses `persistentLocalCache`, saving without network shows "Saved on device". The app is built as a Capacitor APK.
- There is no backend (no `functions/` directory). Getting one would require the Blaze plan.

Accepted constraint: `productCost`/`servicePrice` (`src/engine/pricing.ts`) and stock deduction (`computeStockConsumption` → `applyStockDelta` in `src/stock.ts`) are computed client-side. The `dyeStock` rule in `firestore.rules` only checks that a single field `remainingGrams` changes and that it's a number. A salon member is treated as trusted.

## Approach
1. No changes to the working tree. Nothing to create, edit, or deploy.

## Verification
- `git status --short` shows the same files as before. No new changes.

## Assumptions & contingencies
- Revisit the backend question if multiple salons appear, payroll/bonus calculations based on history, payment integration, or a need to hide the engine formulas from the bundle.
