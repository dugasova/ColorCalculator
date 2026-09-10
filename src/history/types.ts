import type { Timestamp } from "firebase/firestore";
import type { Shade } from "../engine/shades";
import type { Level } from "../engine/levels";
import type { FullFormula } from "../engine/formula";
import type { BleachFormula } from "../engine/bleach";
import type { PrePigmentationResult } from "../engine/prePigmentation";
import type { ApplicationZone } from "../engine/applicationZone";
import type { HairCanvas } from "../engine/canvas";

// One dye/tone step within a saved session (single-step for a simple color service,
// multiple for complex work like balayage: one or more `BleachHistoryStep`s to lift
// sections, followed by a `ColorHistoryStep` to tone).
export interface ColorHistoryStep {
  kind: "color";
  brandName: string;
  line: string | null;
  targetShade: Shade;
  startLevel: Level;
  grayPercent: number;
  applicationZone: ApplicationZone;
  canvas?: HairCanvas;
  result: FullFormula;
  additionalShade: Shade | null;
  additionalShadeGrams: number | null;
  additionalShade2?: Shade | null;
  additionalShade2Grams?: number | null;
  // A substitute blend for a shade that's out of stock - two real shades split the
  // single calculated color total (see `splitShadeBlend` in engine/formula.ts) instead
  // of `targetShade` (which may not be a physical product to weigh) or growing the total
  // the way `additionalShade`/`applyAdditionalShade` does. Mutually exclusive with
  // `additionalShade` above.
  blend: ColorBlend | null;
  // The recommended (or colorist-opted-in) filler step's full computed result, snapshotted
  // at save time - see PrePigmentationField/PrePigmentationStep. Storing the computed
  // result rather than just an "enabled" flag keeps the saved record an immutable record
  // of what was actually recommended/applied, even if the engine's own pre-pigmentation
  // thresholds change in a later release. Null whenever the checkbox was off or the level
  // drop didn't warrant it.
  prePigmentation: PrePigmentationResult | null;
  neutralizationApplied: boolean;
  processingMinutes: number;
  pricePerGram: number;
}

export interface ColorBlend {
  shadeA: Shade;
  shadeAGrams: number;
  shadeB: Shade;
  shadeBGrams: number;
}

export interface BleachHistoryStep {
  kind: "bleach";
  startLevel: Level;
  canvas?: HairCanvas;
  targetLevel: Level;
  result: BleachFormula;
  processingMinutes: number;
  pricePerGram: number;
}

export type HistoryStep = ColorHistoryStep | BleachHistoryStep;

export interface FormulaHistoryEntry {
  id: string;
  clientName: string;
  note: string;
  appliedBy: string;
  appliedAt: Timestamp | null;
  steps: HistoryStep[];
  markupMultiplier: number;
  productCost: number | null;
  servicePrice: number | null;
  // Required by many jurisdictions before a first/renewed chemical service: a recorded
  // patch-test timestamp (>=48h old) or an explicit colorist override when one isn't needed.
  patchTestDate: string;
  allergyNotes: string;
  patchTestOverride: boolean;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
}

// The shape saved before multi-step sessions existed: a single color formula flattened
// directly onto the entry instead of wrapped in `steps`. Firestore documents written by
// earlier versions of the app still have this shape; `normalizeHistoryEntry` (see
// ./schema) upgrades them to a one-step `steps` array on read so existing history keeps
// working unchanged.
export interface LegacyFormulaHistoryEntry {
  id: string;
  clientName: string;
  note: string;
  appliedBy: string;
  appliedAt: Timestamp | null;
  brandName: string;
  line: string | null;
  targetShade: Shade;
  startLevel: Level;
  grayPercent: number;
  result: FullFormula;
  additionalShade?: Shade | null;
  additionalShadeGrams?: number | null;
  additionalShade2?: Shade | null;
  additionalShade2Grams?: number | null;
  processingMinutes: number;
  applicationZone: ApplicationZone;
  pricePerGram: number;
  markupMultiplier: number;
  productCost: number | null;
  servicePrice: number | null;
  patchTestDate: string;
  allergyNotes: string;
  patchTestOverride: boolean;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
}
