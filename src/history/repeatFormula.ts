import type { Brand, BrandId } from "../engine/brands";
import type { DeveloperVolume, Level } from "../engine/levels";
import type { ApplicationZone } from "../engine/applicationZone";
import type { HairCanvas } from "../engine/canvas";
import { DEFAULT_MARKUP_MULTIPLIER } from "../engine/pricing";
import type { FormulaHistoryEntry } from "./types";

export interface RepeatFormulaRequest {
  brandId: BrandId;
  line: string | null;
  targetShadeCode: string;
  startLevel: Level;
  grayPercent: number;
  totalGrams: number;
  manualDeveloperVolume: DeveloperVolume | undefined;
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
  // Only the boolean choice, not the snapshotted PrePigmentationResult itself -- Repeat
  // recomputes it live from the restored startLevel/targetShadeCode/totalGrams above
  // (see useFormulaCalculatorState), the same way every other field here is a raw input
  // rather than a frozen calculation.
  prePigmentationEnabled: boolean;
}

// Reconstructs calculator input state from a saved history entry so it can be replayed.
// Only supported for a simple, single-color-step entry — a multi-step complex-coloring
// session (bleach + tone, or several of either) has no single-formula calculator to repeat
// into, so this returns null and History hides the "Repeat" action for those entries.
// The step only stores brandName (a display string), so the brand is matched back by name
// against the live catalog (built-ins plus whatever an admin has added/renamed via
// PaletteAdminView — see `usePalette`); totalGrams isn't stored either, but the
// color+developer split in `result.grams` sums back to the exact original total. Returns
// null if the brand no longer exists (e.g. it was renamed or removed since the entry was
// saved).
export function buildRepeatFormulaRequest(entry: FormulaHistoryEntry, brands: Record<BrandId, Brand>): RepeatFormulaRequest | null {
  if (entry.steps.length !== 1 || entry.steps[0].kind !== "color") return null;
  const step = entry.steps[0];

  const brand = Object.values(brands).find(b => b.name === step.brandName);
  if (brand === undefined) return null;

  // A substitute blend already splits the single calculated total between its two
  // components (see `splitShadeBlend`), so `step.result.grams.colorGrams` *is* the
  // original total — nothing to back out. A discretionary additional shade instead grew
  // the total on top of the primary mix (see `applyAdditionalShade`), so its grams are
  // subtracted back out here first, and re-applied on top from restored state on repeat.
  // The two are mutually exclusive (see ColorHistoryStep), so only one branch applies.
  // `undefined` (not `null`) from Firestore -- normalize so the `!== null` checks below
  // don't take the "blend present" branch and crash dereferencing an undefined blend.
  const blend = step.blend ?? null;
  const additionalShadeGrams = step.additionalShadeGrams ?? 0;
  const additionalShade2Grams = step.additionalShade2Grams ?? 0;
  let totalGrams = 60;
  if (step.result.grams !== null) {
    const primaryColorGrams = blend !== null
      ? step.result.grams.colorGrams
      : step.result.grams.colorGrams - additionalShadeGrams - additionalShade2Grams;
    const primaryDeveloperGrams = primaryColorGrams * step.result.mixingRatio.developerParts / step.result.mixingRatio.colorParts;
    totalGrams = Math.round(primaryColorGrams + primaryDeveloperGrams);
  }
  const blendTotal = blend !== null ? blend.shadeAGrams + blend.shadeBGrams : 0;
  const blendPrimaryPercent = blend !== null && blendTotal > 0 ? Math.round(blend.shadeAGrams / blendTotal * 100) : 70;

  return {
    brandId: brand.id,
    line: step.line,
    targetShadeCode: step.targetShade.code,
    startLevel: step.startLevel,
    grayPercent: step.grayPercent,
    totalGrams,
    canvas: step.canvas ?? { porosity: "normal", thickness: "medium", chemicalHistory: [] },
    manualDeveloperVolume: step.targetShade.developerVolumeChoices !== undefined
      ? (step.result.developerVolume ?? undefined)
      : undefined,
    additionalShadeCode: blend === null ? (step.additionalShade?.code ?? null) : null,
    additionalShadeGrams: blend === null ? additionalShadeGrams : 0,
    additionalShade2Code: blend === null ? (step.additionalShade2?.code ?? null) : null,
    additionalShade2Grams: blend === null ? additionalShade2Grams : 0,
    blendShadeACode: blend?.shadeA.code ?? null,
    blendShadeBCode: blend?.shadeB.code ?? null,
    blendPrimaryPercent,
    // Old docs saved before this field existed lack the `prePigmentation` key entirely,
    // reading back as `undefined` (not `null`) -- treat that the same as `null` (off).
    prePigmentationEnabled: (step.prePigmentation ?? null) !== null,
    processingMinutes: step.processingMinutes,
    applicationZone: step.applicationZone ?? "full-head",
    pricePerGram: step.pricePerGram ?? brand.pricePerGram,
    markupMultiplier: entry.markupMultiplier ?? DEFAULT_MARKUP_MULTIPLIER,
    servicePrice: entry.servicePrice ?? undefined,
  };
}
