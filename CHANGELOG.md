# Changelog

All notable changes to Formulist. Versions follow [SemVer](https://semver.org/); see
"Releasing" in the README for the process.

## 0.11.0 — 2026-11-19

- Neutralization follows the lightening background:
  - blended backgrounds (e.g. yellow-orange) get a blended corrector;
  - the shade's own tone is taken into account;
  - the corrector is named by the brand's own mixtone or shade (Wella, L'Oréal, Matrix
    SoBoost, Igora 0- mixtones);
  - the colorist picks it per tone, and it is part of the mix.
- Igora: correctors dosed by the Rule of 11.
  - 0-22 / 0-11, with 0-99 optional from level 9; 0-89 or 0-88 against green.
  - The 12- Special Blonde series takes no mixtone.
- Bleach: the background at the target level and a toning recommendation after lifting.
- Color Correction: brand and line choice, blended unwanted tones, editable corrector
  grams, the line's own neutralizing shades and brand tips.
- Hair porosity adjusts the formula:
  - high porosity: one grade weaker auto-picked developer;
  - low porosity: +5 min.
- Complex Coloring: foil placement for highlight steps.
- Palettes:
  - Igora Royal matches the current shade card, including the pastel 9,5- toners (3% or
    1.9%, 1:1, on a level 9–10 base only);
  - Igora Vibrance gains level 8;
  - Matrix gains J and V shades;
  - Majirel Booster names.
- Redken: Chromatics (discontinued) is replaced by Color Gels Oils.
  - 61 shades, 1:1 with Pro-Oxide 10–40 vol.
  - Processing time follows the developer.
  - A warning when gray is lifted more than 2 levels.
- Fixes:
  - root touch-up total weight now includes developer;
  - history card buttons stay inside the card on narrow screens;
  - the selected unwanted-tone button is readable in the dark theme.
- Visits saved by this version carry new corrector and warning data, so update
  installed Android apps.

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
