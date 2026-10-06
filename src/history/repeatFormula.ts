import type { Brand, BrandId } from "../engine/brands";
import type { DeveloperVolume, Level } from "../engine/levels";
import { APPLICATION_ZONE_DEFAULT_COLOR_GRAMS, type ApplicationZone } from "../engine/applicationZone";
import type { HairCanvas } from "../engine/canvas";
import { sameMixingRatio, type MixingRatio } from "../engine/shades";
import { DEFAULT_MARKUP_MULTIPLIER } from "../engine/pricing";
import type { StrandZone } from "../engine/strandZone";
import type { StartingBase } from "../engine/startingBase";
import type { ColorHistoryStep, FormulaHistoryEntry } from "./types";

export interface RepeatFormulaRequest {
  // Carried forward so Save can re-link this repeat to the same client profile instead
  // of silently creating a duplicate one -- see SessionDetailsPanel's `repeatRequest`
  // prop. `clientId` is whatever the original entry had (real id, or null for a legacy
  // entry saved before clientId existed / an explicitly unlinked save).
  clientName: string;
  clientId: string | null;
  brandId: BrandId;
  line: string | null;
  targetShadeCode: string;
  startLevel: Level;
  grayPercent: number;
  totalGrams: number;
  // Primary dye grams (additional shades excluded), restored into "Color only" mode
  // for zones that default to it (see APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE).
  colorGrams: number;
  manualDeveloperVolume: DeveloperVolume | undefined;
  manualMixingRatio: MixingRatio | undefined;
  additionalShadeCode: string | null;
  additionalShadeGrams: number;
  additionalShade2Code?: string | null;
  additionalShade2Grams?: number;
  canvas?: HairCanvas;
  blendShadeACode: string | null;
  blendShadeBCode: string | null;
  blendPrimaryPercent: number;
  processingMinutes: number;
  applicationZone: ApplicationZone;
  pricePerGram: number;
  markupMultiplier: number;
  servicePrice: number | undefined;
  // Only the boolean choice, not the snapshotted PrePigmentationResult itself - Repeat
  // recomputes it live from the restored startLevel/targetShadeCode/totalGrams above
  // (see useFormulaCalculatorState), the same way every other field here is a raw input
  // rather than a frozen calculation.
  prePigmentationEnabled: boolean;
}

// True for a plain single-color-step entry (FormulaCalculator never writes `strandZone`
// on the step it saves; ColorStepCard, used by every Complex Coloring step, always does
// -- see ColorStepCard.tsx) -- the only shape `buildRepeatFormulaRequest` below can
// replay into the simple calculator. Everything else (multi-step sessions, and a
// single color step saved from Complex Coloring with a strandZone) is a Complex
// Coloring session instead -- see `buildRepeatSessionRequest`.
function isSimpleFormulaEntry(entry: FormulaHistoryEntry): boolean {
  return entry.steps.length === 1 && entry.steps[0].kind === "color" && entry.steps[0].strandZone === undefined;
}

// The step's brand is stored as `brandName` (a display string, see ColorHistoryStep),
// so it's matched back by name against the live catalog (built-ins plus whatever an
// admin has added/renamed via PaletteAdminView -- see `usePalette`). `undefined` if the
// brand no longer exists (e.g. renamed or removed since the entry was saved).
function resolveStepBrand(step: ColorHistoryStep, brands: Record<BrandId, Brand>): Brand | undefined {
  return Object.values(brands).find(b => b.name === step.brandName);
}

// Neither totalGrams nor colorGrams is stored directly on a saved step; both are
// reconstructed here from the color+developer split in `result.grams`, same for the
// manual developer-volume/mixing-ratio overrides. Shared by buildRepeatFormulaRequest
// and buildRepeatSessionRequest below -- identical per-step math either way.
function reconstructColorMix(step: ColorHistoryStep): {
  totalGrams: number;
  colorGrams: number;
  manualDeveloperVolume: DeveloperVolume | undefined;
  manualMixingRatio: MixingRatio | undefined;
} {
  // A substitute blend already splits the single calculated total between its two
  // components (see `splitShadeBlend`), so `step.result.grams.colorGrams` *is* the
  // original total — nothing to back out. A discretionary additional shade instead grew
  // the total on top of the primary mix (see `applyAdditionalShade`), so its grams are
  // subtracted back out here first, and re-applied on top from restored state on repeat.
  // The two are mutually exclusive (see ColorHistoryStep), so only one branch applies.
  // `undefined` (not `null`) from Firestore - normalize so the `!== null` checks below
  // don't take the "blend present" branch and crash dereferencing an undefined blend.
  const blend = step.blend ?? null;
  const additionalShadeGrams = step.additionalShadeGrams ?? 0;
  const additionalShade2Grams = step.additionalShade2Grams ?? 0;
  const applicationZone = step.applicationZone ?? "full-head";
  let totalGrams = 60;
  let colorGrams = APPLICATION_ZONE_DEFAULT_COLOR_GRAMS[applicationZone];
  if (step.result.grams !== null) {
    const primaryColorGrams = blend !== null
      ? step.result.grams.colorGrams
      : step.result.grams.colorGrams - additionalShadeGrams - additionalShade2Grams;
    const primaryDeveloperGrams = primaryColorGrams * step.result.mixingRatio.developerParts / step.result.mixingRatio.colorParts;
    totalGrams = Math.round(primaryColorGrams + primaryDeveloperGrams);
    colorGrams = Math.round(primaryColorGrams);
  }
  return {
    totalGrams,
    colorGrams,
    manualDeveloperVolume: step.targetShade.developerVolumeChoices !== undefined
      ? (step.result.developerVolume ?? undefined)
      : undefined,
    manualMixingRatio: step.targetShade.mixingRatioChoices !== undefined
      ? (step.targetShade.mixingRatioChoices.find(choice => sameMixingRatio(choice, step.result.mixingRatio)))
      : undefined,
  };
}

// One step's worth of reconstructed calculator input, seeded once into a ColorStepCard/
// BleachStepCard at mount (see each card's own `seed` prop) by `buildRepeatSessionRequest`
// below. `canvas`/`strandZone`/`startingBase` stay optional -- a step saved before those
// fields existed simply lacks them, and the cards fall back to their own existing
// defaults/same-zone inheritance exactly as an unseeded card would.
export interface ColorStepSeed {
  kind: "color";
  brandId: BrandId;
  line: string | null;
  targetShadeCode: string;
  startLevel: Level;
  grayPercent: number;
  totalGrams: number;
  colorGrams: number;
  manualDeveloperVolume: DeveloperVolume | undefined;
  manualMixingRatio: MixingRatio | undefined;
  additionalShadeCode: string | null;
  additionalShadeGrams: number;
  additionalShade2Code: string | null;
  additionalShade2Grams: number;
  processingMinutes: number;
  pricePerGram: number;
  prePigmentationEnabled: boolean;
  canvas?: HairCanvas;
  strandZone?: StrandZone;
  startingBase?: StartingBase;
}

export interface BleachStepSeed {
  kind: "bleach";
  startLevel: Level;
  targetLevel: Level;
  totalGrams: number;
  processingMinutes: number;
  pricePerGram: number;
  canvas?: HairCanvas;
  strandZone?: StrandZone;
  startingBase?: StartingBase;
}

export type StepSeed = ColorStepSeed | BleachStepSeed;

export interface RepeatSessionRequest {
  clientName: string;
  clientId: string | null;
  steps: StepSeed[];
  markupMultiplier: number;
  servicePrice: number | undefined;
}

// Reconstructs calculator input state from a saved history entry so it can be replayed.
// A plain single-color-step entry (see `isSimpleFormulaEntry`) replays into the simple
// calculator; everything else -- a multi-step complex-coloring session (bleach + tone,
// or several of either), or even a single color step saved from Complex Coloring (it
// carries a strandZone the simple calculator has no field for) -- has no single-formula
// calculator to repeat into, so this returns null (History then falls back to
// `buildRepeatSessionRequest` for the "Repeat" action instead).
// Returns null if the brand no longer exists (e.g. it was renamed or removed since the
// entry was saved).
export function buildRepeatFormulaRequest(entry: FormulaHistoryEntry, brands: Record<BrandId, Brand>): RepeatFormulaRequest | null {
  if (!isSimpleFormulaEntry(entry)) return null;
  const step = entry.steps[0];
  if (step.kind !== "color") return null; // narrowing only; isSimpleFormulaEntry already guarantees it

  const brand = resolveStepBrand(step, brands);
  if (brand === undefined) return null;

  // A substitute blend already splits the single calculated total between its two
  // components (see `splitShadeBlend`), so `step.result.grams.colorGrams` *is* the
  // original total — nothing to back out. A discretionary additional shade instead grew
  // the total on top of the primary mix (see `applyAdditionalShade`), so its grams are
  // subtracted back out here first, and re-applied on top from restored state on repeat.
  // The two are mutually exclusive (see ColorHistoryStep), so only one branch applies.
  // `undefined` (not `null`) from Firestore - normalize so the `!== null` checks below
  // don't take the "blend present" branch and crash dereferencing an undefined blend.
  const blend = step.blend ?? null;
  const additionalShadeGrams = step.additionalShadeGrams ?? 0;
  const additionalShade2Grams = step.additionalShade2Grams ?? 0;
  const applicationZone = step.applicationZone ?? "full-head";
  const { totalGrams, colorGrams, manualDeveloperVolume, manualMixingRatio } = reconstructColorMix(step);
  const blendTotal = blend !== null ? blend.shadeAGrams + blend.shadeBGrams : 0;
  const blendPrimaryPercent = blend !== null && blendTotal > 0 ? Math.round(blend.shadeAGrams / blendTotal * 100) : 70;

  return {
    clientName: entry.clientName,
    clientId: entry.clientId,
    brandId: brand.id,
    line: step.line,
    targetShadeCode: step.targetShade.code,
    startLevel: step.startLevel,
    grayPercent: step.grayPercent,
    totalGrams,
    colorGrams,
    canvas: step.canvas ?? { porosity: "normal", thickness: "medium", chemicalHistory: [] },
    manualDeveloperVolume,
    manualMixingRatio,
    additionalShadeCode: blend === null ? (step.additionalShade?.code ?? null) : null,
    additionalShadeGrams: blend === null ? additionalShadeGrams : 0,
    additionalShade2Code: blend === null ? (step.additionalShade2?.code ?? null) : null,
    additionalShade2Grams: blend === null ? additionalShade2Grams : 0,
    blendShadeACode: blend?.shadeA.code ?? null,
    blendShadeBCode: blend?.shadeB.code ?? null,
    blendPrimaryPercent,
    // `normalizeHistoryEntry` coerces this to `null` on the Firestore read path; kept
    // defensive here too since this reads whatever `entry.steps` the caller passed in.
    prePigmentationEnabled: (step.prePigmentation ?? null) !== null,
    processingMinutes: step.processingMinutes,
    applicationZone,
    pricePerGram: step.pricePerGram ?? brand.pricePerGram,
    markupMultiplier: entry.markupMultiplier ?? DEFAULT_MARKUP_MULTIPLIER,
    servicePrice: entry.servicePrice ?? undefined,
  };
}

// Reconstructs calculator input for every step of a saved multi-step complex-coloring
// session (or even a single color step saved from Complex Coloring -- see
// `isSimpleFormulaEntry`), one seed per step in the same order they were saved -- see
// `buildRepeatFormulaRequest`'s own doc comment for why those two cases are mutually
// exclusive and routed to different calculators. Returns null for an empty session
// (nothing to repeat) or if any color step's brand no longer exists (same rule as
// `buildRepeatFormulaRequest`: a single missing brand fails the whole entry rather than
// silently dropping that one step).
export function buildRepeatSessionRequest(entry: FormulaHistoryEntry, brands: Record<BrandId, Brand>): RepeatSessionRequest | null {
  if (entry.steps.length === 0 || isSimpleFormulaEntry(entry)) return null;

  const steps: StepSeed[] = [];
  for (const step of entry.steps) {
    if (step.kind === "color") {
      const brand = resolveStepBrand(step, brands);
      if (brand === undefined) return null;
      const blend = step.blend ?? null;
      const additionalShadeGrams = step.additionalShadeGrams ?? 0;
      const additionalShade2Grams = step.additionalShade2Grams ?? 0;
      const { totalGrams, colorGrams, manualDeveloperVolume, manualMixingRatio } = reconstructColorMix(step);
      steps.push({
        kind: "color",
        brandId: brand.id,
        line: step.line,
        targetShadeCode: step.targetShade.code,
        startLevel: step.startLevel,
        grayPercent: step.grayPercent,
        totalGrams,
        colorGrams,
        manualDeveloperVolume,
        manualMixingRatio,
        additionalShadeCode: blend === null ? (step.additionalShade?.code ?? null) : null,
        additionalShadeGrams: blend === null ? additionalShadeGrams : 0,
        additionalShade2Code: blend === null ? (step.additionalShade2?.code ?? null) : null,
        additionalShade2Grams: blend === null ? additionalShade2Grams : 0,
        processingMinutes: step.processingMinutes,
        pricePerGram: step.pricePerGram ?? brand.pricePerGram,
        prePigmentationEnabled: (step.prePigmentation ?? null) !== null,
        canvas: step.canvas,
        strandZone: step.strandZone,
        startingBase: step.startingBase,
      });
    } else {
      // BleachStepCard's own default total (60g) -- used whenever this step predates
      // actual-grams tracking, or the engine couldn't compute a mix at all (e.g. no lift
      // needed), same fallback `buildRepeatFormulaRequest`'s color-step reconstruction uses.
      steps.push({
        kind: "bleach",
        startLevel: step.startLevel,
        targetLevel: step.targetLevel,
        totalGrams: step.result.grams !== null ? Math.round(step.result.grams.powderGrams + step.result.grams.developerGrams) : 60,
        processingMinutes: step.processingMinutes,
        pricePerGram: step.pricePerGram,
        canvas: step.canvas,
        strandZone: step.strandZone,
        startingBase: step.startingBase,
      });
    }
  }

  return {
    clientName: entry.clientName,
    clientId: entry.clientId,
    steps,
    markupMultiplier: entry.markupMultiplier ?? DEFAULT_MARKUP_MULTIPLIER,
    servicePrice: entry.servicePrice ?? undefined,
  };
}
