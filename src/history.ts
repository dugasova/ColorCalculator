import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import type { Shade } from "./engine/shades";
import type { DeveloperVolume, Level } from "./engine/levels";
import type { FullFormula } from "./engine/formula";
import type { BleachFormula } from "./engine/bleach";
import type { ApplicationZone } from "./engine/applicationZone";
import type { Brand, BrandId } from "./engine/brands";
import { DEFAULT_MARKUP_MULTIPLIER } from "./engine/pricing";

const HISTORY_COLLECTION = "formulaHistory";

// One dye/tone step within a saved session (single-step for a simple color service,
// multiple for complex work like balayage: one or more `BleachHistoryStep`s to lift
// sections, followed by a `ColorHistoryStep` to tone).
export interface ColorHistoryStep {
  kind: 'color';
  brandName: string;
  line: string | null;
  targetShade: Shade;
  startLevel: Level;
  grayPercent: number;
  applicationZone: ApplicationZone;
  result: FullFormula;
  additionalShade: Shade | null;
  additionalShadeGrams: number | null;
  // A substitute blend for a shade that's out of stock -- two real shades split the
  // single calculated color total (see `splitShadeBlend` in engine/formula.ts) instead
  // of `targetShade` (which may not be a physical product to weigh) or growing the total
  // the way `additionalShade`/`applyAdditionalShade` does. Mutually exclusive with
  // `additionalShade` above.
  blend: ColorBlend | null;
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
  kind: 'bleach';
  startLevel: Level;
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
// earlier versions of the app still have this shape; `normalizeHistoryEntry` upgrades them
// to a one-step `steps` array on read so existing history keeps working unchanged.
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

export function normalizeHistoryEntry(raw: LegacyFormulaHistoryEntry | FormulaHistoryEntry): FormulaHistoryEntry {
  if ('steps' in raw && raw.steps !== undefined) return raw;

  const legacy = raw as LegacyFormulaHistoryEntry;
  const colorStep: ColorHistoryStep = {
    kind: 'color',
    brandName: legacy.brandName,
    line: legacy.line,
    targetShade: legacy.targetShade,
    startLevel: legacy.startLevel,
    grayPercent: legacy.grayPercent,
    applicationZone: legacy.applicationZone,
    result: legacy.result,
    additionalShade: legacy.additionalShade ?? null,
    additionalShadeGrams: legacy.additionalShadeGrams ?? null,
    blend: null,
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

export interface SaveFormulaParams {
  clientName: string;
  note: string;
  appliedBy: string;
  steps: HistoryStep[];
  markupMultiplier: number;
  productCost: number | null;
  servicePrice: number | null;
  patchTestDate: string;
  allergyNotes: string;
  patchTestOverride: boolean;
  beforePhotoFile?: File | null;
  afterPhotoFile?: File | null;
}

// Strips values Firestore can't store: functions (e.g. Shade.developerLiftTable)
// and explicit `undefined` on unset optional fields (Firestore rejects both). Exported
// for reuse by other Firestore-writing modules (see `palette.ts`).
export function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

async function uploadFormulaPhoto(historyId: string, slot: 'before' | 'after', file: File): Promise<string> {
  const photoRef = ref(storage, `formulaHistory/${historyId}/${slot}`);
  await uploadBytes(photoRef, file);
  return getDownloadURL(photoRef);
}

export async function saveFormulaToHistory(params: SaveFormulaParams): Promise<void> {
  const docRef = await addDoc(collection(db, HISTORY_COLLECTION), {
    clientName: params.clientName,
    note: params.note,
    appliedBy: params.appliedBy,
    steps: sanitizeForFirestore(params.steps),
    markupMultiplier: params.markupMultiplier,
    productCost: params.productCost,
    servicePrice: params.servicePrice,
    patchTestDate: params.patchTestDate,
    allergyNotes: params.allergyNotes,
    patchTestOverride: params.patchTestOverride,
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    appliedAt: serverTimestamp(),
  });

  // Photos upload after the doc exists so they can live at a path keyed by its id;
  // attach the resulting URLs with a follow-up update rather than blocking doc creation
  // on the (much slower) file upload.
  const [beforePhotoUrl, afterPhotoUrl] = await Promise.all([
    params.beforePhotoFile ? uploadFormulaPhoto(docRef.id, 'before', params.beforePhotoFile) : Promise.resolve(null),
    params.afterPhotoFile ? uploadFormulaPhoto(docRef.id, 'after', params.afterPhotoFile) : Promise.resolve(null),
  ]);

  if (beforePhotoUrl !== null || afterPhotoUrl !== null) {
    await updateDoc(docRef, {
      ...(beforePhotoUrl !== null ? { beforePhotoUrl } : {}),
      ...(afterPhotoUrl !== null ? { afterPhotoUrl } : {}),
    });
  }
}

export async function fetchFormulaHistory(): Promise<FormulaHistoryEntry[]> {
  const q = query(collection(db, HISTORY_COLLECTION), orderBy("appliedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc =>
    normalizeHistoryEntry({ id: doc.id, ...doc.data() } as LegacyFormulaHistoryEntry | FormulaHistoryEntry)
  );
}

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
  blendShadeACode: string | null;
  blendShadeBCode: string | null;
  blendPrimaryPercent: number;
  processingMinutes: number;
  applicationZone: ApplicationZone;
  pricePerGram: number;
  markupMultiplier: number;
  servicePrice: number | undefined;
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
  if (entry.steps.length !== 1 || entry.steps[0].kind !== 'color') return null;
  const step = entry.steps[0];

  const brand = Object.values(brands).find(b => b.name === step.brandName);
  if (brand === undefined) return null;

  // A substitute blend already splits the single calculated total between its two
  // components (see `splitShadeBlend`), so `step.result.grams.colorGrams` *is* the
  // original total — nothing to back out. A discretionary additional shade instead grew
  // the total on top of the primary mix (see `applyAdditionalShade`), so its grams are
  // subtracted back out here first, and re-applied on top from restored state on repeat.
  // The two are mutually exclusive (see ColorHistoryStep), so only one branch applies.
  // Old history docs saved before this field existed lack it entirely, reading back as
  // `undefined` (not `null`) from Firestore -- normalize so the `!== null` checks below
  // don't take the "blend present" branch and crash dereferencing an undefined blend.
  const blend = step.blend ?? null;
  const additionalShadeGrams = step.additionalShadeGrams ?? 0;
  let totalGrams = 60;
  if (step.result.grams !== null) {
    const primaryColorGrams = blend !== null
      ? step.result.grams.colorGrams
      : step.result.grams.colorGrams - additionalShadeGrams;
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
    manualDeveloperVolume: step.targetShade.developerVolumeChoices !== undefined
      ? (step.result.developerVolume ?? undefined)
      : undefined,
    additionalShadeCode: blend === null ? (step.additionalShade?.code ?? null) : null,
    additionalShadeGrams: blend === null ? additionalShadeGrams : 0,
    blendShadeACode: blend?.shadeA.code ?? null,
    blendShadeBCode: blend?.shadeB.code ?? null,
    blendPrimaryPercent,
    processingMinutes: step.processingMinutes,
    applicationZone: step.applicationZone ?? 'full-head',
    pricePerGram: step.pricePerGram ?? brand.pricePerGram,
    markupMultiplier: entry.markupMultiplier ?? DEFAULT_MARKUP_MULTIPLIER,
    servicePrice: entry.servicePrice ?? undefined,
  };
}
