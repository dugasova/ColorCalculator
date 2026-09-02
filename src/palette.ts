import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { createContext, useContext } from "react";
import { db } from "./firebase";
import { sanitizeForFirestore } from "./history";
import { BRANDS, type Brand, type BrandId, type CustomBrandRecord, type MixingRatioConfig, type PaletteOverride, customBrandRecordSchema, paletteOverrideSchema } from "./engine/brands";
import type { Shade } from "./engine/shades";

export interface PaletteState {
  // Built-ins merged with every admin-added custom brand/shade, discontinued shades
  // removed — what calculators (FormulaCalculator, ComplexColoring, BrandField) use.
  brands: Record<BrandId, Brand>;
  // Raw Firestore-backed state, exposed for PaletteAdminView, which needs to show
  // discontinued shades too (to let an admin re-enable them) — see `getFullBrandShades`.
  customBrands: CustomBrandRecord[];
  overrides: PaletteOverride[];
}

// Lives here (not in PaletteContext.tsx) so that file can export nothing but the
// `PaletteProvider` component — mixing hook/context exports into a component file breaks
// React Fast Refresh.
export const PaletteReactContext = createContext<PaletteState>({ brands: BRANDS, customBrands: [], overrides: [] });

// The merged, calculator-facing brand catalog. Live: updates the moment an admin adds a
// shade, discontinues one, or adds a new dye line, in every open session.
export function usePalette(): Record<BrandId, Brand> {
  return useContext(PaletteReactContext).brands;
}

// Full raw state for PaletteAdminView — includes discontinued shades and lets it target
// overrides/custom-brand writes precisely.
export function usePaletteAdmin(): PaletteState {
  return useContext(PaletteReactContext);
}

const CUSTOM_BRANDS_COLLECTION = "customBrands";
const PALETTE_OVERRIDES_COLLECTION = "paletteOverrides";

// A disable override is keyed deterministically by brand+line+code (instead of an auto
// id) so re-disabling/re-enabling the same shade toggles one document instead of
// accumulating duplicates, and so a stale listener update can't briefly show a shade as
// both active and discontinued. `code` alone isn't unique within a brand — several Wella
// and L'Oréal lines reuse the same numeric codes — so `line` is part of the key too.
// Firestore document ids can't contain "/" — several Wella codes do (e.g. "5/41") — so
// every part is URI-encoded before joining.
function disableOverrideId(brandId: BrandId, line: string | null, code: string): string {
  return `${encodeURIComponent(brandId)}::${encodeURIComponent(line ?? '')}::${encodeURIComponent(code)}`;
}

// Malformed documents (a hand-edited Firestore console change, a future schema change
// read by an old client, ...) are skipped and logged rather than propagated: previously
// an unchecked `as` cast let one bad document produce garbage that would crash deep
// inside the formula engine, far from this read, with no clue which document caused it.
export function subscribeToCustomBrands(onChange: (brands: CustomBrandRecord[]) => void): Unsubscribe {
  return onSnapshot(collection(db, CUSTOM_BRANDS_COLLECTION), snapshot => {
    const brands: CustomBrandRecord[] = [];
    for (const d of snapshot.docs) {
      const result = customBrandRecordSchema.safeParse(d.data());
      if (!result.success) {
        console.error(`Skipping malformed custom brand document "${d.id}":`, result.error.issues);
        continue;
      }
      brands.push({ id: d.id, ...result.data });
    }
    onChange(brands);
  });
}

export function subscribeToPaletteOverrides(onChange: (overrides: PaletteOverride[]) => void): Unsubscribe {
  return onSnapshot(collection(db, PALETTE_OVERRIDES_COLLECTION), snapshot => {
    const overrides: PaletteOverride[] = [];
    for (const d of snapshot.docs) {
      const result = paletteOverrideSchema.safeParse(d.data());
      if (!result.success) {
        console.error(`Skipping malformed palette override document "${d.id}":`, result.error.issues);
        continue;
      }
      // TS collapses a discriminated union's members to their common fields when spread
      // into a new object literal -- the branch discrimination is still real, just not
      // something `{ ...result.data }` can prove statically. `result.data` already
      // conforms to the `kind`-matched branch of paletteOverrideSchema above.
      overrides.push({ id: d.id, ...result.data } as PaletteOverride);
    }
    onChange(overrides);
  });
}

export interface AddCustomBrandInput {
  id: string;
  name: string;
  pricePerGram: number;
  mixingRatioConfig: MixingRatioConfig;
}

// `input.id` becomes the document id (and therefore the brand's `BrandId`); the caller is
// responsible for picking one that doesn't collide with a built-in or existing custom brand
// — see PaletteAdminView's slug validation.
export async function addCustomBrand(input: AddCustomBrandInput): Promise<void> {
  await setDoc(doc(db, CUSTOM_BRANDS_COLLECTION, input.id), sanitizeForFirestore({
    name: input.name,
    pricePerGram: input.pricePerGram,
    mixingRatioConfig: input.mixingRatioConfig,
  }));
}

export async function addShadeToBrand(brandId: BrandId, shade: Shade): Promise<void> {
  await addDoc(collection(db, PALETTE_OVERRIDES_COLLECTION), sanitizeForFirestore({
    kind: 'add' as const,
    brandId,
    shade,
  }));
}

export async function setShadeDisabled(brandId: BrandId, line: string | null, code: string, disabled: boolean): Promise<void> {
  const overrideRef = doc(db, PALETTE_OVERRIDES_COLLECTION, disableOverrideId(brandId, line, code));
  if (disabled) {
    await setDoc(overrideRef, { kind: 'disable', brandId, line, code });
  } else {
    await deleteDoc(overrideRef);
  }
}
