import { z } from "zod";
import { Timestamp } from "firebase/firestore";
import { canvasShapeSchema } from "../engine/canvas";
import type { FullFormula } from "../engine/formula";
import type { ColorHistoryStep, FormulaHistoryEntry, LegacyFormulaHistoryEntry } from "./types";

// Validates a formulaHistory Firestore document's top-level shape (see subscribeToFormulaHistory
// in ./firestore). Deliberately shallow: `result`/`targetShade`/`additionalShade`/`blend` are the
// nested, purely-computed/display output of the formula engine (FullFormula, BleachFormula
// -- engine/formula.ts, engine/bleach.ts), not something a corrupt value could feed back
// into a live calculation the way a palette shade does. Deep-validating every one of their
// fields here would mean shadowing that whole type graph and keeping it in permanent
// lockstep with the engine, for a read-only history/repeat feature -- a bad trade. This
// still catches the realistic corruption case (a document missing/mistyped the top-level
// scalar fields the UI reads directly: client name, pricing, patch-test/photo metadata)
const historyStepShapeSchema = z.union([
  z.looseObject({
    kind: z.literal("color"),
    canvas: canvasShapeSchema.optional(),
    actualColorGrams: z.number().nonnegative().nullable().optional(),
  }),
  z.looseObject({ kind: z.literal("bleach"), canvas: canvasShapeSchema.optional() }),
]);

const formulaHistoryEntryShapeSchema = z.object({
  id: z.string(),
  clientName: z.string(),
  // Optional/nullable, not just nullable: every `steps`-based document saved before this
  // field existed (all of them, pre-dating clients.ts's real per-client ids) simply lacks
  // it at the Firestore level -- normalizeHistoryEntry's early-return branch below
  // coerces the missing case to `null` so the rest of the app only ever sees the fully
  // normalized `FormulaHistoryEntry.clientId: string | null`.
  clientId: z.string().nullable().optional(),
  note: z.string(),
  appliedBy: z.string(),
  appliedAt: z.instanceof(Timestamp).nullable(),
  steps: z.array(historyStepShapeSchema),
  markupMultiplier: z.number(),
  productCost: z.number().nullable(),
  servicePrice: z.number().nullable(),
  patchTestDate: z.string(),
  allergyNotes: z.string(),
  patchTestOverride: z.boolean(),
  beforePhotoUrl: z.string().nullable(),
  afterPhotoUrl: z.string().nullable(),
  // Optional: absent on every document saved before versioning existed (filled in by
  // normalizeHistoryEntry). A `schemaVersion` above CURRENT_HISTORY_SCHEMA_VERSION --
  // written by a newer app than a stale cached PWA reading it -- is still accepted and
  // shown as-is rather than hidden: a newer format only ever adds fields, and losing a
  // client's visit from their history is worse than not displaying a field it can't know.
  schemaVersion: z.number().int().positive().optional(),
  appVersion: z.string().nullable().optional(),
});

const legacyFormulaHistoryEntryShapeSchema = z.object({
  id: z.string(),
  clientName: z.string(),
  note: z.string(),
  appliedBy: z.string(),
  appliedAt: z.instanceof(Timestamp).nullable(),
  brandName: z.string(),
  line: z.string().nullable(),
  targetShade: z.looseObject({ code: z.string() }),
  startLevel: z.number(),
  grayPercent: z.number(),
  result: z.looseObject({}),
  additionalShade: z.looseObject({ code: z.string() }).nullable().optional(),
  additionalShadeGrams: z.number().nullable().optional(),
  processingMinutes: z.number(),
  applicationZone: z.enum(["full-head", "root-touch-up"]),
  pricePerGram: z.number(),
  markupMultiplier: z.number(),
  productCost: z.number().nullable(),
  servicePrice: z.number().nullable(),
  patchTestDate: z.string(),
  allergyNotes: z.string(),
  patchTestOverride: z.boolean(),
  beforePhotoUrl: z.string().nullable(),
  afterPhotoUrl: z.string().nullable(),
});

// A well-formed new-format document never has `brandName` (that's the legacy shape) and a
// well-formed legacy document never has `steps` -- matches `normalizeHistoryEntry`'s own
// `'steps' in raw` discrimination below, so the two schemas never both match the same
// document, and never both reject a genuinely well-formed one.
export const historyEntryShapeSchema = z.union([formulaHistoryEntryShapeSchema, legacyFormulaHistoryEntryShapeSchema]);

// The `schemaVersion` every new history document is written with (see
// saveFormulaToHistory). Bump it -- and teach normalizeHistoryEntry to upgrade the previous
// value -- whenever a change makes old documents need conversion on read.
//  1 = the legacy flat shape (no `steps`)
//  2 = the `steps`-based shape, formula warnings stored as translated text
//  3 = formula warnings stored as language-independent data (see upgradeFormulaWarnings)
export const CURRENT_HISTORY_SCHEMA_VERSION = 3;
const LEGACY_HISTORY_SCHEMA_VERSION = 1;
// What a `steps`-based document saved before versioning existed is taken to be.
const UNVERSIONED_STEPS_SCHEMA_VERSION = 2;

type WarningKey = "toneWarning" | "eligibilityWarning" | "liftUnsupportedWarning";
const WARNING_KEYS: WarningKey[] = ["toneWarning", "eligibilityWarning", "liftUnsupportedWarning"];

// True for a warning that isn't in the current shape: a translated string (schema < 3), or
// a field the document doesn't have at all (saved before that warning existed).
function isOutdatedWarning(value: unknown): boolean {
  return typeof value === "string" || value === undefined;
}

function hasOutdatedWarnings(result: FullFormula): boolean {
  return WARNING_KEYS.some(key => isOutdatedWarning(result[key]));
}

// Before schema 3 the engine stored each warning as a sentence already translated into
// whatever language was active at save time. They're now plain data rendered at display
// time (see engine/formula.ts's ToneWarning & co., format/formulaMessages.ts), so an old
// text warning is rebuilt here from the same values the engine derived it from, all of
// which the step itself still holds: the target shade snapshot, the start level and the
// result's own pigment/corrective tone. A warning whose inputs are somehow gone becomes
// `null` rather than surviving as text nothing can render; a missing field likewise.
function upgradeFormulaWarnings(step: Pick<ColorHistoryStep, "targetShade" | "startLevel" | "result">): FullFormula {
  const { result, targetShade, startLevel } = step;
  if (!hasOutdatedWarnings(result)) return result;
  const stored: Record<WarningKey, unknown> = result;

  let toneWarning = result.toneWarning ?? null;
  if (isOutdatedWarning(stored.toneWarning)) {
    toneWarning =
      typeof stored.toneWarning === "string" &&
      result.underlyingPigment != null &&
      result.recommendedCorrectiveTone != null
        ? { tone: targetShade.tone, pigment: result.underlyingPigment, recommended: result.recommendedCorrectiveTone }
        : null;
  }

  let eligibilityWarning = result.eligibilityWarning ?? null;
  if (isOutdatedWarning(stored.eligibilityWarning)) {
    eligibilityWarning =
      typeof stored.eligibilityWarning === "string" && targetShade.minStartLevel !== undefined
        ? { code: targetShade.code, minLevel: targetShade.minStartLevel, startLevel }
        : null;
  }

  let liftUnsupportedWarning = result.liftUnsupportedWarning ?? null;
  if (isOutdatedWarning(stored.liftUnsupportedWarning)) {
    liftUnsupportedWarning =
      typeof stored.liftUnsupportedWarning === "string"
        ? { code: targetShade.code, level: targetShade.level, startLevel }
        : null;
  }

  return { ...result, toneWarning, eligibilityWarning, liftUnsupportedWarning };
}

export function normalizeHistoryEntry(raw: LegacyFormulaHistoryEntry | FormulaHistoryEntry): FormulaHistoryEntry {
  // `raw.clientId` reads as `undefined` (not `null`), and a color step's
  // `prePigmentation` reads back as `undefined` (not `null`), for any steps-based
  // document saved before those fields existed -- coerced here so every caller
  // downstream can rely on the declared `string | null` / `PrePigmentationResult | null`
  // types without re-deriving the fallback itself (formatSession.ts, repeatFormula.ts
  // and revisit.ts each used to, with two different idioms). `schemaVersion`/`appVersion`
  // are likewise absent on documents saved before versioning existed, and a color step's
  // formula warnings are text rather than data on documents older than schema 3 (see
  // upgradeFormulaWarnings). The stored `schemaVersion` itself is kept as-is. Returns `raw`
  // unchanged (not a copy) when it already has every one of these fields, same as the
  // plain `return raw` this replaced for an already-well-formed modern entry.
  if ("steps" in raw && raw.steps !== undefined) {
    const needsCoercion =
      raw.clientId === undefined ||
      raw.schemaVersion === undefined ||
      raw.appVersion === undefined ||
      raw.steps.some(
        step => step.kind === "color" && (step.prePigmentation === undefined || hasOutdatedWarnings(step.result)),
      );
    if (!needsCoercion) return raw;
    const steps = raw.steps.map(step =>
      step.kind === "color"
        ? { ...step, prePigmentation: step.prePigmentation ?? null, result: upgradeFormulaWarnings(step) }
        : step,
    );
    return {
      ...raw,
      clientId: raw.clientId ?? null,
      schemaVersion: raw.schemaVersion ?? UNVERSIONED_STEPS_SCHEMA_VERSION,
      appVersion: raw.appVersion ?? null,
      steps,
    };
  }

  const legacy = raw as LegacyFormulaHistoryEntry;
  const colorStep: ColorHistoryStep = {
    kind: "color",
    brandName: legacy.brandName,
    line: legacy.line,
    targetShade: legacy.targetShade,
    startLevel: legacy.startLevel,
    grayPercent: legacy.grayPercent,
    canvas: { porosity: "normal", thickness: "medium", chemicalHistory: [] },
    applicationZone: legacy.applicationZone,
    result: upgradeFormulaWarnings(legacy),
    additionalShade: legacy.additionalShade ?? null,
    additionalShadeGrams: legacy.additionalShadeGrams ?? null,
    additionalShade2: legacy.additionalShade2 ?? null,
    additionalShade2Grams: legacy.additionalShade2Grams ?? null,
    blend: null,
    prePigmentation: null,
    neutralizationApplied: false,
    processingMinutes: legacy.processingMinutes,
    pricePerGram: legacy.pricePerGram,
  };

  return {
    id: legacy.id,
    clientName: legacy.clientName,
    clientId: null,
    note: legacy.note,
    appliedBy: legacy.appliedBy,
    appliedAt: legacy.appliedAt,
    steps: [colorStep],
    markupMultiplier: legacy.markupMultiplier,
    productCost: legacy.productCost,
    servicePrice: legacy.servicePrice,
    patchTestDate: legacy.patchTestDate,
    allergyNotes: legacy.allergyNotes,
    patchTestOverride: legacy.patchTestOverride,
    beforePhotoUrl: legacy.beforePhotoUrl,
    afterPhotoUrl: legacy.afterPhotoUrl,
    schemaVersion: LEGACY_HISTORY_SCHEMA_VERSION,
    appVersion: null,
  };
}
