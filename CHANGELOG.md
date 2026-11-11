# Changelog

All notable changes to Formulist. Versions follow [SemVer](https://semver.org/); see
"Releasing" in the README for the process.

## 0.10.0 — 2026-11-11

- Gray coverage: optional natural base blended into the formula, shown in the mix and
  saved with the visit, stock and repeat.
- History: the recorded gray percentage is shown with the hair-state recap (porosity,
  thickness, chemical history); the "Gray coverage" line is hidden when it changes
  nothing in the mix.
- Formula warnings in saved visits now follow the current UI language instead of the
  language the visit was saved in. Entries saved by this version show a garbled warning
  line in app versions before 0.10.0, so update installed Android apps.
- Fixed the warning for deposit-only shades, which said "level N or lower" where it meant
  "or higher".
- Repeat and analytics match a brand by its id, so renaming a brand in the palette no
  longer breaks Repeat or splits its shades in the statistics.
- The web app is deployed to Cloudflare Workers by GitHub Actions after checks pass.

## 0.9.0 — 2026-10-14

First versioned release.

- Formula calculator for Wella, Schwarzkopf Igora, L'Oréal, Matrix and Redken lines,
  plus bleach, complex multi-step coloring, color correction and pre-pigmentation.
- Client history with saved client profiles, before/after photos, actual-grams entry,
  repeat formula and revisit reminders.
- Favorite formulas, dye stock and order list, salon and stylist analytics.
- Admin-editable palette and photo-based shade/level estimation with calibration.
- Salon membership and access requests, offline-tolerant writes, Android app (Capacitor)
  and installable PWA, English/Ukrainian UI.
- App version shown in the account menu and attached to Sentry releases and to every
  saved history entry.
