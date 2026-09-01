# Color Calculator

A web app for hair salons that turns manual, error-prone color-formula math into a
guided calculator: mix ratios, developer volume, gray coverage, timing, and cost —
plus client history, revisit reminders, and salon analytics. Built for a single salon
running on shared Firebase infrastructure, not a multi-tenant SaaS.

## Features

- **Formula calculator** — pick a brand/line, target shade, starting level and gray
  percentage; get the color:developer ratio, gram split for a chosen total weight,
  recommended processing time, and gray-coverage strategy (fashion-only, equal mix,
  base-dominant, or natural-only for resistant gray).
- **Bleach calculator** — powder:developer ratio and safety-capped processing time for
  on-scalp lightening, with a hard ceiling and visual-check intervals.
- **Complex coloring** — compose a multi-step session (e.g. balayage: bleach sections,
  then tone) from any number of bleach/color steps; totals roll up across the whole
  appointment.
- **Color correction** — neutralize an unwanted tone (via the color-wheel complementary
  relationship) with the right corrector and technique.
- **Client history** — save applied formulas per client (formula, pricing, patch-test
  record, before/after photos), searchable, with a "repeat formula" shortcut that
  reconstructs the calculator state from a past visit.
- **Revisit reminders** — recommends the next visit date per client based on their
  gray-coverage tier and actual visit history.
- **Salon analytics** — visit counts, client retention, popular shades, average dye
  usage and product cost, computed from saved history.
- **Editable palette (admin)** — an admin can add new shades to an existing dye line,
  mark a shade discontinued without breaking past history, or register an entirely new
  custom dye line (with its own mixing ratio and price per gram) — all live, no
  redeploy needed. See [Admin: editing the palette](#admin-editing-the-palette).
- **English / Ukrainian** UI, switchable at runtime.

## Tech stack

- [React 19](https://react.dev/) + TypeScript, built with [Vite](https://vitejs.dev/)
- [Firebase](https://firebase.google.com/): Authentication (email/password), Firestore
  (client history, palette data), Storage (before/after photos)
- [react-i18next](https://react.i18next.com/) for localization
- [Vitest](https://vitest.dev/) for unit tests

## Architecture

```
src/
  engine/          Pure calculation logic (formulas, bleach, correction, brand/shade
                    data, color-to-hex preview) — framework-agnostic, unit tested.
  components/       One folder per screen/feature (FormulaCalculator, Bleach,
                    ComplexColoring, ColorCorrection, History, Analytics, PaletteAdmin,
                    Nav, LoginForm, LanguageSwitcher).
  history.ts        Firestore-backed client history (CRUD + legacy-shape migration).
  palette.ts        Firestore-backed palette data (custom brands, shade overrides) +
                    the React context/hooks that expose the live, merged catalog.
  roles.ts          Admin-role lookup (`users/{uid}.role` in Firestore).
  locales/          en / uk translation dictionaries.
scripts/
  migrateBuiltInPalette.ts   One-off migration: copies the hard-coded brand charts into
                             Firestore so they become admin-editable too.
  repairMajirelPalette.ts    One-off repair: clears stale migrated Majirel overrides
                             after a built-in chart correction so it takes effect.
```

The shade/brand catalog is a merge of two sources: the built-in charts hard-coded in
`src/engine/brands.ts` / `src/engine/brands/*.ts` (Generic, Wella, L'Oréal), and
Firestore-backed admin edits (`customBrands`, `paletteOverrides` collections). A shade's
identity within a brand is **(line, code)**, not code alone — several real brand lines
legitimately reuse the same numeric code (e.g. Wella's Koleston Perfect and Color Touch,
or L'Oréal's Majirel and Inoa).

## Getting started

### Prerequisites

- Node.js 20+
- A Firebase project with **Authentication** (email/password provider), **Firestore**,
  and **Storage** enabled.

### Setup

```bash
npm install
```

Point the app at your Firebase project:

```bash
cp .env.example .env
```

Fill in the values from Firebase console → Project settings → General → Your apps → SDK
setup and configuration (these are public client identifiers, not secrets — see the
note in `src/firebase.ts`). Set a shared sign-up gate in `src/inviteCode.ts`
(`SALON_INVITE_CODE`) — anyone with this code can self-register and gets full access to
shared salon data; it's a light deterrent, not real security. Real access control lives
in `firestore.rules` (Firestore documents) and `storage.rules` (before/after formula
photos).

Deploy the security rules (required — both Firestore and Storage deny everything by
default until rules are published):

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,storage
```

Run it locally:

```bash
npm run dev
```

### Admin: editing the palette

Only an account with `role: 'admin'` on its `users/{uid}` Firestore document can add
shades, discontinue shades, or add new dye lines through the in-app **Palette** screen.
There's no self-service UI for granting that role on purpose — set it by hand once, in
the Firebase console:

1. **Authentication** → find the account → copy its **User UID**.
2. **Firestore Database** → create a `users` collection → document ID = that UID →
   field `role` (string) = `admin`.

To bulk-migrate the hard-coded built-in charts into Firestore (so they become editable
the same way as anything an admin adds by hand), run the one-off script once, as an
admin account:

```bash
MIGRATION_ADMIN_EMAIL=you@salon.example MIGRATION_ADMIN_PASSWORD=*** npm run migrate:palette
```

Safe to re-run — already-migrated shades are skipped.

If a brand's built-in chart is corrected after it was already migrated (e.g. L'Oréal
Majirel's shade data was fixed to match the official chart), the stale migrated copy in
Firestore shadows the fix — `getFullBrandShades` prefers an `add` override over the base
shade whenever they share a (line, code). Clear the stale Majirel overrides once, as an
admin account:

```bash
MIGRATION_ADMIN_EMAIL=you@salon.example MIGRATION_ADMIN_PASSWORD=*** npm run migrate:repair-majirel
```

Safe to run even if Majirel was never migrated, and safe to re-run.

## Available scripts

| Command                  | Description                                    |
|---------------------------|-------------------------------------------------|
| `npm run dev`              | Start the Vite dev server                        |
| `npm run build`            | Type-check (`tsc -b`) and build for production   |
| `npm run lint`             | Run ESLint                                       |
| `npm run test`             | Run the Vitest suite                             |
| `npm run preview`          | Preview a production build locally               |
| `npm run migrate:palette`  | One-off migration of built-in shades to Firestore |
| `npm run migrate:repair-majirel` | Clears stale migrated Majirel overrides after a chart fix |
