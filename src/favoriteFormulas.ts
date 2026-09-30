import { z } from "zod";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import type { FirestoreError, Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { parseSnapshotDocs } from "./firestoreSubscribe";
import { settleWrite } from "./firestoreWrite";
import type { Brand, BrandId } from "./engine/brands";
import type { DeveloperVolume } from "./engine/levels";
import { type MixingRatio, developerVolumeSchema, mixingRatioSchema } from "./engine/shades";
import type { ApplicationZone, GramsInputMode } from "./engine/applicationZone";
import { formatBrandLineLabel } from "./engine/formatLineLabel";

const FAVORITE_FORMULAS_COLLECTION = "favoriteFormulas";

// A favorite's saved recipe deliberately excludes the client-specific inputs a formula
// also depends on (startLevel, grayPercent, hair canvas) and pricing (pricePerGram,
// markup, service price) -- see applyFavoriteRecipe in useFormulaCalculatorState.ts for
// why: inserting a favorite is meant to swap in a shade/mix recipe for *this* client's
// existing diagnostics, not replay a whole past session the way History's "Repeat
// formula" does.
export interface FavoriteFormulaRecipe {
  brandId: BrandId;
  line: string | null;
  targetShadeCode: string;
  additionalShadeCode: string | null;
  additionalShadeGrams: number;
  additionalShade2Code: string | null;
  additionalShade2Grams: number;
  // Both non-null iff the substitute blend was enabled -- see checkFavoriteAvailability
  // and applyFavoriteRecipe, which both use "both non-null" as the on/off signal instead
  // of a separate stored boolean.
  blendShadeACode: string | null;
  blendShadeBCode: string | null;
  blendPrimaryPercent: number;
  // Raw manual overrides, not the effective (defaulted) values -- for permanent lines the
  // developer/processing time are recomputed for whichever client's start level/gray %
  // is current when the favorite is applied.
  manualDeveloperVolume: DeveloperVolume | null;
  manualMixingRatio: MixingRatio | null;
  manualProcessingMinutes: number | null;
  applicationZone: ApplicationZone;
  gramsInputMode: GramsInputMode;
  totalGrams: number;
  colorGrams: number;
}

export interface FavoriteFormula {
  id: string;
  ownedBy: string;
  name: string;
  recipe: FavoriteFormulaRecipe;
}

const favoriteFormulaRecipeSchema = z.object({
  brandId: z.string(),
  line: z.string().nullable(),
  targetShadeCode: z.string(),
  additionalShadeCode: z.string().nullable(),
  additionalShadeGrams: z.number(),
  additionalShade2Code: z.string().nullable(),
  additionalShade2Grams: z.number(),
  blendShadeACode: z.string().nullable(),
  blendShadeBCode: z.string().nullable(),
  blendPrimaryPercent: z.number(),
  manualDeveloperVolume: developerVolumeSchema.nullable(),
  manualMixingRatio: mixingRatioSchema.nullable(),
  manualProcessingMinutes: z.number().nullable(),
  applicationZone: z.enum(["full-head", "root-touch-up"]),
  gramsInputMode: z.enum(["total", "color"]),
  totalGrams: z.number(),
  colorGrams: z.number(),
});

const favoriteFormulaShapeSchema = z.object({
  id: z.string(),
  ownedBy: z.string(),
  name: z.string(),
  recipe: favoriteFormulaRecipeSchema,
});

// A brand-new favorite in the calling stylist's own library (see firestore.rules's
// favoriteFormulas block: `create` pins `ownedBy` to the caller's own token email).
export async function createFavoriteFormula(params: { ownedBy: string; name: string; recipe: FavoriteFormulaRecipe }): Promise<void> {
  const docRef = doc(collection(db, FAVORITE_FORMULAS_COLLECTION));
  await settleWrite(setDoc(docRef, {
    ownedBy: params.ownedBy,
    name: params.name.trim(),
    recipe: params.recipe,
    updatedAt: serverTimestamp(),
  }), `favorite formula ${docRef.id}`);
}

export async function renameFavoriteFormula(id: string, name: string): Promise<void> {
  await settleWrite(updateDoc(doc(db, FAVORITE_FORMULAS_COLLECTION, id), {
    name: name.trim(),
    updatedAt: serverTimestamp(),
  }), `favorite formula ${id}`);
}

// Wrapped in settleWrite, unlike clients.ts's bare deleteClient, so an offline delete
// doesn't hang the "Manage favorites" dialog waiting for a server ack that may not
// arrive for a while.
export async function deleteFavoriteFormula(id: string): Promise<void> {
  await settleWrite(deleteDoc(doc(db, FAVORITE_FORMULAS_COLLECTION, id)), `favorite formula ${id}`);
}

// Every stylist's favorite-formula library is private to them, mirroring clients.ts's
// `ownedBy`-scoped rule -- no admin override here (see firestore.rules), unlike clients/
// formulaHistory: this is a personal shortcut list, not salon-shared record-keeping.
export function subscribeToFavoriteFormulas(
  ownedBy: string,
  onChange: (favorites: FavoriteFormula[]) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  const q = query(collection(db, FAVORITE_FORMULAS_COLLECTION), where("ownedBy", "==", ownedBy), orderBy("name"));
  return onSnapshot(q, snapshot => {
    onChange(parseSnapshotDocs(snapshot, favoriteFormulaShapeSchema, "favorite formula", true));
  }, onError);
}

export type FavoriteAvailability = { kind: "available" } | { kind: "brand-missing" } | { kind: "shades-missing"; codes: string[] };

// Guards against useShadeFormulaState.ts's render-time target-shade fallback
// (targetShade ?? lineShades[0] ?? ...): without this check, a favorite whose shade was
// discontinued (or whose whole brand/line was removed) since it was saved would silently
// insert some other shade instead of failing loudly. `brands` is the live catalog from
// usePalette() (buildBrandCatalog, engine/paletteOverrides.ts), which already has
// discontinued shades removed -- so a discontinued shade's code is genuinely absent from
// `brand.shades`, exactly like a shade that never existed.
export function checkFavoriteAvailability(recipe: FavoriteFormulaRecipe, brands: Record<BrandId, Brand>): FavoriteAvailability {
  const brand = brands[recipe.brandId];
  if (brand === undefined) return { kind: "brand-missing" };
  const pool = brand.shades.filter(s => (s.line ?? null) === recipe.line);
  const codesToCheck = [recipe.targetShadeCode, recipe.additionalShadeCode, recipe.additionalShade2Code, recipe.blendShadeACode, recipe.blendShadeBCode];
  const missing: string[] = [];
  for (const code of codesToCheck) {
    if (code === null) continue;
    if (pool.some(s => s.code === code)) continue;
    if (!missing.includes(code)) missing.push(code);
  }
  return missing.length > 0 ? { kind: "shades-missing", codes: missing } : { kind: "available" };
}

// A sensible starting name for the "Save current formula" dialog -- e.g. "Wella Koleston
// Perfect 7/1" or, with an additional shade, "Wella Koleston Perfect 7/1 + 7/3". Always
// editable before saving.
export function defaultFavoriteName(recipe: FavoriteFormulaRecipe, brands: Record<BrandId, Brand>): string {
  let name = `${formatBrandLineLabel(brands[recipe.brandId].name, recipe.line)} ${recipe.targetShadeCode}`;
  if (recipe.additionalShadeCode !== null) name += ` + ${recipe.additionalShadeCode}`;
  if (recipe.additionalShade2Code !== null) name += ` + ${recipe.additionalShade2Code}`;
  if (recipe.blendShadeACode !== null && recipe.blendShadeBCode !== null) {
    name += ` (${recipe.blendShadeACode} / ${recipe.blendShadeBCode})`;
  }
  return name;
}
