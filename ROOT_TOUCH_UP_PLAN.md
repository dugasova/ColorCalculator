# Root touch-up: enter dye grams, derive developer — review & finish

## Context
Colorist request: for a root touch-up, calculate from 40 g of **dye** (not 40 g total mix) and derive developer from the mixing ratio; if the master needs more dye, they type any amount. Also: review the in-progress code and optimize it.

An uncommitted implementation already exists in the working tree (9 modified files + new `src/components/FormulaCalculator/fields/GramsInputField.tsx`). Baseline: `npx tsc -p tsconfig.app.json --noEmit` clean; `npx vitest run` → 50 files / 478 tests pass. End state: choosing **"Root touch-up"** automatically switches the amount input to **"Color only" = 40 g** (developer = 40 × developerParts / colorParts); **"Full head"** switches back to **"Total weight" = 80 g**; the mode select stays so the master can override either way and type any amount; review defects below fixed.

### Existing diff (keep as the base)
- `src/engine/applicationZone.ts`: `export type GramsInputMode = "total" | "color"`; `APPLICATION_ZONE_DEFAULT_COLOR_GRAMS = { "full-head": 60, "root-touch-up": 40 }`.
- `src/engine/formula.ts`: `calculateFormulaGramsFromColorGrams(colorGrams, ratio)`; `calculateFullFormula(..., manualMixingRatio?, colorGramsOverride?: number)`.
- `src/components/FormulaCalculator/useShadeFormulaState.ts`: `gramsInputMode` + `colorGrams` state, `colorGramsOverride` → engine, exports `effectiveTotalGrams`; `handleApplicationZoneChange` resets `totalGrams` and `colorGrams`.
- `GramsInputField.tsx` (mode `Select` + one numeric input, id `gramsAmount${idSuffix}`) used by `FormulaCalculator.tsx` and `ColorStepCard.tsx`; pre-pigmentation reads `effectiveTotalGrams`; repeat replay forces `"total"`; en/uk strings `fields.colorGrams`, `fields.gramsInputMode`, `fields.gramsInputModeTotal`, `fields.gramsInputModeColor`.

### Review findings fixed by this plan
1. **Regression**: `effectiveTotalGrams` (useShadeFormulaState ~L200) sums `effectiveResult.grams`, which already includes additional-shade grams → in default "total" mode adding an additional shade now enlarges the pre-pigmentation filler (before the diff it used raw `totalGrams`). Also float sum instead of exact `totalGrams`, and stale `totalGrams` fallback in "color" mode when `result.grams` is null.
2. **Dead code**: `fields/TotalGramsField.tsx` has no importers.
3. **Duplication**: `applyAdditionalShade` re-implements `calculateFormulaGramsFromColorGrams`'s formula.
4. **Request not met by default**: root touch-up = 40 g total (≈20 g dye at 1:1) unless the master flips the mode manually.
5. **Repeat**: replay forces "total" and never re-seeds `colorGrams`, so a repeated root touch-up opens in total mode and a later switch to "Color only" shows an unrelated value.
6. **No tests** for the new engine path.

## Approach
Steps are independent except Step 4 depends on Step 3's constant. Tree builds and tests pass after each step (Step 4 needs its test-literal updates in the same step).

### Step 1 — Engine: dedupe and keep total-mode corrector input exact (`src/engine/formula.ts`)
- Replace the body of `applyAdditionalShade` with `return calculateFormulaGramsFromColorGrams(grams.colorGrams + additionalColorGrams, ratio);` (move `calculateFormulaGramsFromColorGrams` above it if needed — it already is, L136). Signature unchanged.
- In `calculateFullFormula`, rename local `effectiveTotalGrams` (L303) to `correctorBaseGrams` and compute it as `colorGramsOverride !== undefined && grams !== null ? grams.colorGrams + grams.developerGrams : totalGrams;` so total mode passes the exact `totalGrams` exactly as before the diff. Shorten the comment above it to one line: corrector grams scale with the real mix total when the dye weight was entered directly.
- Leave the `colorGramsOverride` positional parameter as is (changing to an options object would touch ~40 test call sites for no behavior gain). Corrector keeps using the total mix weight (pre-existing semantics; do not change to dye-only here).

### Step 2 — Hook: fix `effectiveTotalGrams` (`src/components/FormulaCalculator/useShadeFormulaState.ts`)
- Import `calculateFormulaGramsFromColorGrams` from `../../engine/formula`.
- Replace the `effectiveTotalGrams` computation (L197–202) with:
  ```ts
  const colorModeGrams = gramsInputMode === "color" ? calculateFormulaGramsFromColorGrams(colorGrams, result.mixingRatio) : null;
  const effectiveTotalGrams = colorModeGrams !== null ? colorModeGrams.colorGrams + colorModeGrams.developerGrams : totalGrams;
  ```
  Uses `result` (pre-additional-shade) and `result.mixingRatio` (always non-null), so: total mode = exact `totalGrams` (pre-diff behavior restored), color mode never falls back to stale `totalGrams`. Update the comment above: "real primary mix total (color + developer), excluding additional shades".
- `colorGramsOverride` line stays.

### Step 3 — Root touch-up defaults to dye-only input
- `src/engine/applicationZone.ts`: add after `APPLICATION_ZONE_DEFAULT_COLOR_GRAMS`:
  ```ts
  // Which unit each zone starts in: a root touch-up is measured as dye (40 g of color,
  // developer derived from the ratio); a full head as a total mix weight.
  export const APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE: Record<ApplicationZone, GramsInputMode> = {
    "full-head": "total",
    "root-touch-up": "color",
  };
  ```
- `useShadeFormulaState.ts`: import it; initial state `useState<GramsInputMode>(APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE["full-head"])`; in `handleApplicationZoneChange` add `setGramsInputMode(APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE[zone]);`. Trim the 5-line comment above `gramsInputMode` state to reference the constant.
- `ColorStepCard` has no application-zone field (uses strand zone) → stays "total"/80 g by default; mode select still available there. No change.

### Step 4 — Repeat restores the zone's mode and the exact dye amount
- `src/history/repeatFormula.ts`:
  - Add `colorGrams: number;` to `RepeatFormulaRequest` right after `totalGrams`, comment: primary dye grams (additional shades excluded), restored into "Color only" mode for zones that default to it.
  - In `buildRepeatFormulaRequest`: hoist `const applicationZone = step.applicationZone ?? "full-head";` (reuse it in the returned object); declare `let colorGrams = APPLICATION_ZONE_DEFAULT_COLOR_GRAMS[applicationZone];` next to `let totalGrams = 60;`; inside the existing `if (step.result.grams !== null)` block set `colorGrams = Math.round(primaryColorGrams);` (integer because `useClampedNumberText` accepts digits only). Return `colorGrams`. Import `APPLICATION_ZONE_DEFAULT_COLOR_GRAMS` (value import) from `../engine/applicationZone`.
  - Update the header comment (L50–51) to mention both totals are reconstructed from `result.grams`.
- `src/components/FormulaCalculator/useFormulaCalculatorState.ts` replay block (L73–75): replace `setGramsInputMode("total");` with
  ```ts
  setGramsInputMode(APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE[repeatRequest.applicationZone]);
  setColorGrams(repeatRequest.colorGrams);
  ```
  (`setColorGrams` is already destructured from `base`, L40.) Import the constant from `../../engine/applicationZone`.
- Add `colorGrams` to every `RepeatFormulaRequest` literal (tsc will flag any missed):
  - `src/components/FormulaCalculator/FormulaCalculator.test.tsx`: `repeatFor` (~L40, `totalGrams: 60` → add `colorGrams: 30`), literals at ~L70 (`colorGrams: 30`), ~L84 and ~L100 (`totalGrams: 30` → `colorGrams: 15`).
  - `src/components/FormulaCalculator/SessionDetailsPanel.repeatClient.test.tsx` `makeRepeatRequest` (~L30, `totalGrams: 60` → `colorGrams: 30`).

### Step 5 — Delete dead code
- Delete `src/components/FormulaCalculator/fields/TotalGramsField.tsx`.
- `fields/AdditionalShadeField.tsx` L33 comment: `TotalGramsField's 1` → `GramsInputField's 1`.
- `grep -rn "TotalGramsField" src` must return nothing.

### Step 6 — Tests (behavior, not wiring)
- `src/engine/formula.test.ts`, new `describe("calculateFormulaGramsFromColorGrams")`: `(40, {1,1})` → `{ colorGrams: 40, developerGrams: 40 }`; `(40, {1,1.5})` → `{ 40, 60 }`; `(40, {1,2})` → `{ 40, 80 }`.
- `src/engine/formula.fullFormula.test.ts`: with `targetShade = { code: "8.1", level: 8, tone: "ash" }`, `calculateFullFormula(6, targetShade, 0, 60, undefined, undefined, undefined, 40)` → `grams` equals `{ colorGrams: 40, developerGrams: 60 }` (ratio 1:1.5, `totalGrams` 60 ignored for the split), and its `correctorGrams` equals `calculateFullFormula(6, targetShade, 0, 100).correctorGrams` (and is non-null).
- `src/history.test.ts` in `describe("buildRepeatFormulaRequest")`: `makeColorStep({ applicationZone: "root-touch-up", result: { ...COLOR_FULL_FORMULA, grams: { colorGrams: 40, developerGrams: 40 } } })` → `request.colorGrams === 40`, `request.totalGrams === 80`, `request.applicationZone === "root-touch-up"` (import `COLOR_FULL_FORMULA` from `./testFixtures` if not already imported; else spread `makeColorStep().result`).
- `src/components/ComplexColoring/ColorStepCard.interaction.test.tsx` (existing helpers `renderStep`, `chooseOption`, `lastStep`):
  - "derives developer from a dye-only amount": `chooseOption("Amount entered as", "color")`; `fireEvent.change(screen.getByLabelText("Color, g"), { target: { value: "50" } })`; expect `lastStep(onChange).result.mixingRatio` `{ colorParts: 1, developerParts: 1 }` and `.result.grams` `{ colorGrams: 50, developerGrams: 50 }` (default start 10 → Generic 1.0).
  - Regression for finding 1, "does not grow the pre-pigmentation filler when an additional shade is added": click `"Add pre-pigmentation step"`, capture `lastStep(onChange).prePigmentation?.grams`; `chooseOption("Additional shade (colorist's discretion)", "2.1")`; `fireEvent.change(screen.getByLabelText("Additional shade, g"), { target: { value: "10" } })`; expect `lastStep(onChange).result.grams?.colorGrams` > 40 (additional applied) and `prePigmentation?.grams` toEqual the captured value. Must fail on the current diff and pass after Step 2.
- New `src/components/FormulaCalculator/FormulaCalculator.gramsInput.test.tsx` (copy header of `FormulaCalculator.blendCandidates.test.tsx`: `// @vitest-environment jsdom`, `import "../../i18n"`, `afterEach(cleanup)`; copy `chooseOption` from ColorStepCard.interaction.test.tsx):
  - render `<FormulaCalculator appliedBy="stylist@example.com" />`; `chooseOption("Application", "root-touch-up")` → `screen.getByLabelText("Color, g")` has value `"40"` and `screen.getByText(/developer 40\.0 g/)` exists (default 10 → 1.0 is 1:1).
  - change `"Color, g"` to `"55"` → `/developer 55\.0 g/` shown.
  - `chooseOption("Application", "full-head")` → `screen.getByLabelText("Total weight, g")` has value `"80"` and `/developer 40\.0 g/` shown.
  - If `getByLabelText("Application")` matches more than one element, click `document.getElementById("applicationZone")` (id set in `ApplicationZoneField.tsx`) and then the `[role="option"][data-value="…"]` element, the same way `chooseOption` does.

## Critical files & anchors
- `src/components/FormulaCalculator/useShadeFormulaState.ts` — `effectiveTotalGrams` (~L197), `handleApplicationZoneChange` (~L147), `gramsInputMode` state (~L80).
- `src/engine/formula.ts` — `applyAdditionalShade` (L145), `calculateFullFormula` grams/corrector block (L296–305).
- `src/history/repeatFormula.ts` — `RepeatFormulaRequest` (L9), `buildRepeatFormulaRequest` totals block (L72–79).
- `src/components/FormulaCalculator/useFormulaCalculatorState.ts` — repeat replay block (L55–92).

## Verification
Working dir `/home/dugasova/colorcalculator`.
1. `npx tsc -b` — clean (catches any missed `RepeatFormulaRequest` literal).
2. `npx vitest run` — all green; specifically `npx vitest run src/components/ComplexColoring/ColorStepCard.interaction.test.tsx` — the pre-pigmentation regression test fails if Step 2 is reverted.
3. `npx eslint .` — clean.
4. Smoke (UI): `npm run dev`, open the printed URL, sign in, Formula calculator:
   - Зона нанесення → «Прикореневе фарбування»: mode shows «Лише фарба», input «Фарба, г» = 40; Mix line shows `developer 40.0 g` for a 1:1 case; pick a lifting shade (e.g. start 6 → 8.x) → developer 60.0 g at 1:1.5.
   - Type 55 → developer recalculates from 55.
   - Switch to «Все волосся» → «Загальна вага» 80 g.
   - Save a root touch-up, open History → Repeat → calculator reopens in «Лише фарба» with the same dye grams.

## Assumptions & contingencies
- Full head keeps total-mix entry (80 g) by default; only root touch-up switches to dye-only. The master can still override the mode in either zone.
- Repeat derives the mode from the saved zone (the input mode itself is not persisted in history); root entries saved before this change (40 g total) repeat as dye-only with their actual dye grams (e.g. 20 g), producing the same mix.
- If `/developer 40\.0 g/` does not appear in the FormulaCalculator test because the default shade yields `developerVolume === null` (no grams), first select a shade via `openCombobox("Shade")` + option `"8.1 ash"` with start level unchanged, and assert the developer value computed by hand from the displayed ratio.
