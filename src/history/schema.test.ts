import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import { CURRENT_HISTORY_SCHEMA_VERSION, historyEntryShapeSchema, normalizeHistoryEntry } from "./schema";
import type { ColorHistoryStep, FormulaHistoryEntry, LegacyFormulaHistoryEntry } from "./types";
import type { FullFormula } from "../engine/formula";
import { COLOR_FULL_FORMULA, makeBleachStep, makeColorStep, makeEntry } from "../testFixtures";

// A result as documents older than schema 3 stored it: warnings as translated sentences.
function textWarningResult(overrides: Record<string, unknown>): FullFormula {
  return { ...COLOR_FULL_FORMULA, ...overrides } as unknown as FullFormula;
}

function normalizedColorStep(step: ColorHistoryStep, schemaVersion = 2): ColorHistoryStep {
  const normalized = normalizeHistoryEntry(makeEntry({ clientName: "Anna", steps: [step], schemaVersion }));
  return normalized.steps[0] as ColorHistoryStep;
}

const LEGACY_ENTRY: LegacyFormulaHistoryEntry = {
  id: "legacy-1",
  clientName: "Old Client",
  note: "",
  appliedBy: "stylist",
  appliedAt: null,
  brandName: "Wella",
  line: null,
  targetShade: { code: "8/3", level: 8, tone: "gold" },
  startLevel: 6,
  grayPercent: 0,
  result: COLOR_FULL_FORMULA,
  processingMinutes: 30,
  applicationZone: "full-head",
  pricePerGram: 0.2,
  markupMultiplier: 3,
  productCost: null,
  servicePrice: null,
  patchTestDate: "",
  allergyNotes: "",
  patchTestOverride: true,
  beforePhotoUrl: null,
  afterPhotoUrl: null,
};

describe("normalizeHistoryEntry: formula warnings saved as text (schema < 3)", () => {
  it("rebuilds a text tone warning from the step's shade and the result's pigment and corrective tone", () => {
    const step = normalizedColorStep(
      makeColorStep({
        startLevel: 6,
        targetShade: { code: "8.3", level: 8, tone: "gold" },
        result: textWarningResult({
          underlyingPigment: "yellow",
          recommendedCorrectiveTone: "violet",
          toneWarning: "The chosen tone 'gold' won't neutralize yellow pigment; 'violet' is recommended",
        }),
      }),
    );
    expect(step.result.toneWarning).toEqual({ tone: "gold", pigment: "yellow", recommended: "violet" });
    expect(step.result.eligibilityWarning).toBeNull();
    expect(step.result.liftUnsupportedWarning).toBeNull();
  });

  it("rebuilds a text eligibility warning from the shade snapshot's minStartLevel", () => {
    const step = normalizedColorStep(
      makeColorStep({
        startLevel: 5,
        targetShade: { code: "12/0", level: 10, tone: "natural", minStartLevel: 6 },
        result: textWarningResult({ eligibilityWarning: "Відтінок '12/0' потребує рівня 6 або вище" }),
      }),
    );
    expect(step.result.eligibilityWarning).toEqual({ code: "12/0", minLevel: 6, startLevel: 5 });
  });

  it("rebuilds a text can't-lift warning from the shade and start level", () => {
    const step = normalizedColorStep(
      makeColorStep({
        startLevel: 6,
        targetShade: { code: "8/73", level: 8, tone: "gold" },
        result: textWarningResult({ liftUnsupportedWarning: "'8/73' can't lift level" }),
      }),
    );
    expect(step.result.liftUnsupportedWarning).toEqual({ code: "8/73", level: 8, startLevel: 6 });
  });

  it("drops a text warning whose inputs are no longer on the step, instead of keeping unrenderable text", () => {
    const step = normalizedColorStep(
      makeColorStep({
        // no minStartLevel on the snapshot, no pigment/corrective tone on the result
        result: textWarningResult({ toneWarning: "some text", eligibilityWarning: "some text" }),
      }),
    );
    expect(step.result.toneWarning).toBeNull();
    expect(step.result.eligibilityWarning).toBeNull();
  });

  it("fills a warning field the document never had with null", () => {
    const result = { ...COLOR_FULL_FORMULA } as Record<string, unknown>;
    delete result.eligibilityWarning;
    delete result.liftUnsupportedWarning;
    const step = normalizedColorStep(makeColorStep({ result: result as unknown as FullFormula }));
    expect(step.result.eligibilityWarning).toBeNull();
    expect(step.result.liftUnsupportedWarning).toBeNull();
  });

  it("keeps the rest of the result and the stored schemaVersion untouched", () => {
    const entry = makeEntry({
      clientName: "Anna",
      schemaVersion: 2,
      steps: [makeColorStep({ result: textWarningResult({ liftUnsupportedWarning: "text" }) })],
    });
    const normalized = normalizeHistoryEntry(entry);
    expect(normalized.schemaVersion).toBe(2);
    const result = (normalized.steps[0] as ColorHistoryStep).result;
    expect(result.liftUnsupportedWarning).not.toBeNull();
    expect({ ...result, liftUnsupportedWarning: null }).toEqual(COLOR_FULL_FORMULA);
  });

  it("leaves warnings that are already data as they are, returning the same entry", () => {
    const toneWarning = { tone: "gold", pigment: "yellow", recommended: "violet" } as const;
    const entry = makeEntry({
      clientName: "Anna",
      steps: [makeColorStep({ result: { ...COLOR_FULL_FORMULA, toneWarning } }), makeBleachStep()],
    });
    const normalized = normalizeHistoryEntry(entry);
    expect(normalized).toBe(entry);
    expect((normalized.steps[0] as ColorHistoryStep).result.toneWarning).toBe(toneWarning);
  });

  it("upgrades text warnings on a legacy flat entry too", () => {
    const normalized = normalizeHistoryEntry({
      ...LEGACY_ENTRY,
      result: textWarningResult({
        underlyingPigment: "yellow",
        recommendedCorrectiveTone: "violet",
        toneWarning: "text",
      }),
    });
    expect((normalized.steps[0] as ColorHistoryStep).result.toneWarning).toEqual({
      tone: "gold",
      pigment: "yellow",
      recommended: "violet",
    });
    expect(normalized.schemaVersion).toBe(1);
  });
});

describe("normalizeHistoryEntry: fields older documents lack", () => {
  it("coerces a missing clientId and a color step's missing prePigmentation to null", () => {
    const step = { ...makeColorStep() } as Record<string, unknown>;
    delete step.prePigmentation;
    const entry = { ...makeEntry({ clientName: "Anna", steps: [step as unknown as ColorHistoryStep] }) } as Record<
      string,
      unknown
    >;
    delete entry.clientId;
    const normalized = normalizeHistoryEntry(entry as unknown as FormulaHistoryEntry);
    expect(normalized.clientId).toBeNull();
    expect((normalized.steps[0] as ColorHistoryStep).prePigmentation).toBeNull();
  });

  it("leaves bleach steps untouched", () => {
    const bleach = makeBleachStep();
    const entry = { ...makeEntry({ clientName: "Anna", steps: [bleach] }) } as Record<string, unknown>;
    delete entry.clientId;
    const normalized = normalizeHistoryEntry(entry as unknown as FormulaHistoryEntry);
    expect(normalized.steps[0]).toBe(bleach);
  });

  it("gives a legacy flat entry a null clientId, a default canvas and no blend/pre-pigmentation", () => {
    const normalized = normalizeHistoryEntry(LEGACY_ENTRY);
    expect(normalized.clientId).toBeNull();
    expect(normalized.steps[0]).toMatchObject({
      kind: "color",
      canvas: { porosity: "normal", thickness: "medium", chemicalHistory: [] },
      blend: null,
      prePigmentation: null,
      neutralizationApplied: false,
      additionalShade: null,
      additionalShadeGrams: null,
    });
  });
});

describe("historyEntryShapeSchema", () => {
  it("writes new documents with a schema version this module can read", () => {
    expect(CURRENT_HISTORY_SCHEMA_VERSION).toBe(3);
    expect(historyEntryShapeSchema.safeParse(makeEntry({ clientName: "Anna" })).success).toBe(true);
  });

  it("accepts a steps-based document without clientId, schemaVersion or appVersion", () => {
    const entry = { ...makeEntry({ clientName: "Anna" }) } as Record<string, unknown>;
    delete entry.clientId;
    delete entry.schemaVersion;
    delete entry.appVersion;
    expect(historyEntryShapeSchema.safeParse(entry).success).toBe(true);
  });

  it("accepts a legacy flat document", () => {
    expect(historyEntryShapeSchema.safeParse(LEGACY_ENTRY).success).toBe(true);
  });

  it("accepts a Timestamp appliedAt and rejects any other date representation", () => {
    const entry = makeEntry({ clientName: "Anna", appliedAt: Timestamp.fromMillis(0) });
    expect(historyEntryShapeSchema.safeParse(entry).success).toBe(true);
    expect(historyEntryShapeSchema.safeParse({ ...entry, appliedAt: "2026-01-01" }).success).toBe(false);
  });

  it.each([
    ["a missing clientName", { clientName: undefined }],
    ["a non-numeric markupMultiplier", { markupMultiplier: "4" }],
    ["a non-boolean patchTestOverride", { patchTestOverride: "yes" }],
    ["steps that isn't an array", { steps: {} }],
    ["a step of an unknown kind", { steps: [{ kind: "perm" }] }],
    ["negative actual grams on a color step", { steps: [{ ...makeColorStep(), actualColorGrams: -1 }] }],
  ])("rejects %s", (_label, overrides) => {
    const entry = { ...makeEntry({ clientName: "Anna" }), ...overrides };
    expect(historyEntryShapeSchema.safeParse(entry).success).toBe(false);
  });

  it("rejects a legacy document with an unknown application zone", () => {
    expect(historyEntryShapeSchema.safeParse({ ...LEGACY_ENTRY, applicationZone: "ends" }).success).toBe(false);
  });
});
