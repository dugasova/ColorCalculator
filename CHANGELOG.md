# Changelog

All notable changes to Formulist. Versions follow [SemVer](https://semver.org/); see
"Releasing" in the README for the process.

## 0.13.0 — 2026-11-25

- Correctors named by real shades of the line, at the formula's level (the nearest level
  where the line has none: one darker on levels 4–7, one lighter from 8):
  - Matrix: no boosters. SoColor: A / AA, AV / P, NJ / AJ, G / W, C, RR; Super Sync now
    names its own A, V / P, G shades;
  - Redken Shades EQ: T or 01B, V / VV / VB, M, G, C, RR.
- Redken follows the European range:
  - Shades EQ: the European chart, 63 shades, with level 10 (010VV Lavender Ice, 010VG
    Baby Blonde, 010T Platinum, 010P Ivory Pearl, 010GI Tahitian Sand, 010N Delicate
    Natural); US-only shades removed;
  - Color Gels Oils: 73 shades, including 6MO / 8MO mocha, 5GCh / 7GCh gold chocolate and
    the AB, CR, WG, GI families; shades no longer sold removed.
- Redken's lightening background follows its own card: 7 orange, 6 red-orange, 5 red.
- CI: a pull-request check that starts after its PR is merged no longer cancels the
  deploy on main.

## 0.12.0 — 2026-11-23

- Formula comparison:
  - "Compare with another formula" pins the current formula as A; the live formula is B.
    A stays while the app is open, across screens and after a save.
  - A bar at the bottom names A and counts the differences; the table opens in a sheet,
    showing the differing rows first.
  - From History: compare a saved visit with a new calculation, or two saved visits
    (single-formula visits).
- Bleach: pick the toner's brand and line; its shades that tone the background at the
  target level are listed. Special blondes and high-lift series are never offered after
  powder. The bleach target level stops at 10.
- Matrix follows the European card (the range sold in Ukraine):
  - SoColor Pre-Bonded: the European palette, 95 shades, including the mocha series, warm
    naturals, Jade and the Reflect shades;
  - High Lift 11A / 11N: 1:1, the developer by the base (3% tones a bleached 10–11, 12%
    from a natural 7), with a warning below 7;
  - Ultra Blonde (UL-): 1:2, 9% up to 4 levels, 12% beyond;
  - Super Sync: the 2026 card, 16 new shades (66 in all); lifts one level (11V from a 10);
  - neutralization by Matrix's own background chart and the colorist's pigment balance;
    Titanium (6T) is not counted as a neutralizer;
  - no SoBoost (no longer sold in Ukraine): SoColor corrects with A, AV / P, J, G shades
    and SoRed.
- Fixes:
  - high porosity no longer lowers a lifting shade to a developer it does not lift with
    (Ultra Blonde, Wella Special Blonde);
  - the line name reads "SoColor".

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
