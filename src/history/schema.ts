import { z } from "zod";
import { Timestamp } from "firebase/firestore";
import type { ColorHistoryStep, FormulaHistoryEntry, LegacyFormulaHistoryEntry } from "./types";

// Validates a formulaHistory Firestore document's top-level shape (see fetchFormulaHistory
// in ./firestore). Deliberately shallow: `result`/`targetShade`/`additionalShade`/`blend` are the
// nested, purely-computed/display output of the formula engine (FullFormula, BleachFormula
// -- engine/formula.ts, engine/bleach.ts), not something a corrupt value could feed back
// into a live calculation the way a palette shade does. Deep-validating every one of their
// fields here would mean shadowing that whole type graph and keeping it in permanent
// lockstep with the engine, for a read-only history/repeat feature -- a bad trade. This
// still catches the realistic corruption case (a document missing/mistyped the top-level
// scalar fields the UI reads directly: client name, pricing, patch-test/photo metadata)
const canvasShapeSchema = z.object({
  porosity: z.enum(["low", "normal", "high"]),
  thickness: z.enum(["fine", "medium", "coarse"]),
  chemicalHistory: z.array(z.enum(["keratin", "perm", "henna", "direct_dye"])),
});

const historyStepShapeSchema = z.union([
  z.looseObject({ kind: z.literal("color"), canvas: canvasShapeSchema.optional() }),
  z.looseObject({ kind: z.literal("bleach"), canvas: canvasShapeSchema.optional() }),
]);

const formulaHistoryEntryShapeSchema = z.object({
  id: z.string(),
  clientName: z.string(),
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

export function normalizeHistoryEntry(raw: LegacyFormulaHistoryEntry | FormulaHistoryEntry): FormulaHistoryEntry {
  if ("steps" in raw && raw.steps !== undefined) return raw;

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
    result: legacy.result,
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
  };
}
