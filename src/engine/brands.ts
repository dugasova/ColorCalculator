import type { Level } from './levels';
import { type MixingRatio, type Shade } from './shades';
import { GENERIC_SHADE_CHART } from './shades';
import { WELLA_SHADE_CHART, WELLA_COLOR_TOUCH_CHART } from './brands/wella';
import { LOREAL_MAJIREL_CHART, LOREAL_INOA_CHART, LOREAL_DIA_LIGHT_CHART, LOREAL_DIA_RICHESSE_CHART } from './brands/loreal';
import { getMixingRatio } from './formula';

// A plain string, not a closed union: built-in ids ('generic' | 'wella' | 'loreal')
// plus whatever id an admin assigns a custom dye line (see `CustomBrandRecord`).
export type BrandId = string;

export interface Brand {
    id: BrandId;
    name: string;
    shades: Shade[];
    mixingRatio: (startLevel: Level, targetLevel: Level) => MixingRatio;
    // Rough estimated product cost per gram of mixed color, in whatever currency the
    // salon uses — a starting point for the service-pricing calculator, not a real
    // supplier price. Fully editable in the results panel.
    pricePerGram: number;
}

// Koleston Perfect mixes 1:1 with developer across the whole range. The "12"
// (Special Blonde) series is the one exception, mixing 1:2 — that override
// lives on the shade itself (see `fixedMixingRatio` in WELLA_SHADE_CHART),
// not here, since it applies to a subset of shades rather than the whole brand.
function wellaMixingRatio(): MixingRatio {
    return { colorParts: 1, developerParts: 1 };
}

export const BRANDS: Record<BrandId, Brand> = {
    generic: { id: 'generic', name: 'Generic', shades: GENERIC_SHADE_CHART, mixingRatio: getMixingRatio, pricePerGram: 0.10 },
    wella: { id: 'wella', name: 'Wella', shades: [...WELLA_SHADE_CHART, ...WELLA_COLOR_TOUCH_CHART], mixingRatio: wellaMixingRatio, pricePerGram: 0.18 },
    loreal: { id: 'loreal', name: "L'Oréal", shades: [...LOREAL_MAJIREL_CHART, ...LOREAL_INOA_CHART, ...LOREAL_DIA_LIGHT_CHART, ...LOREAL_DIA_RICHESSE_CHART], mixingRatio: getMixingRatio, pricePerGram: 0.20 },
};

// A dye line an admin added at runtime (see PaletteAdminView), persisted in the
// `customBrands` Firestore collection with `id` as the document id. Unlike built-in
// brands, its mixing ratio can't be an arbitrary function (Firestore can't store
// functions), so it's described data-first via `MixingRatioConfig` and resolved to a
// real strategy function with `resolveMixingRatio`.
export interface MixingRatioConfig {
    kind: 'fixed' | 'generic';
    // Required when kind is 'fixed'; ignored otherwise.
    fixedRatio?: MixingRatio;
}

export function resolveMixingRatio(config: MixingRatioConfig): (startLevel: Level, targetLevel: Level) => MixingRatio {
    if (config.kind === 'fixed') {
        const ratio = config.fixedRatio ?? { colorParts: 1, developerParts: 1 };
        return () => ratio;
    }
    return getMixingRatio;
}

export interface CustomBrandRecord {
    id: string;
    name: string;
    pricePerGram: number;
    mixingRatioConfig: MixingRatioConfig;
}

// A single correction an admin makes to a brand's shade chart at runtime, persisted in
// the `paletteOverrides` Firestore collection. `add` covers both "add a shade to an
// existing line" and "add the first shades to a brand-new custom line" (custom brands
// start with an empty shade list). `disable` is a soft delete — it hides a shade a
// manufacturer discontinued from new formulas without touching Firestore history
// entries that already reference it (those store a denormalized snapshot of the shade,
// see `history.ts`). `code` alone isn't a unique shade identity within a brand — e.g.
// Wella's Koleston Perfect and Color Touch reuse the same numeric codes, as do several
// L'Oréal lines (Majirel/Inoa/Dia Light/Dia Richesse) — so `disable` carries `line`
// alongside `code` to target exactly one shade.
export type PaletteOverride =
    | { id: string; kind: 'add'; brandId: BrandId; shade: Shade }
    | { id: string; kind: 'disable'; brandId: BrandId; line: string | null; code: string };

function addedShadesFor(overrides: PaletteOverride[], brandId: BrandId): Shade[] {
    return overrides
        .filter((o): o is Extract<PaletteOverride, { kind: 'add' }> => o.kind === 'add' && o.brandId === brandId)
        .map(o => o.shade);
}

// A shade's identity within a brand is (line, code), not code alone: several Wella and
// L'Oréal lines legitimately reuse the same numeric code across different product lines.
export function shadeKey(shade: { line?: string; code: string }): string {
    return `${shade.line ?? ''}|${shade.code}`;
}

export function getDisabledShadeKeys(overrides: PaletteOverride[], brandId: BrandId): Set<string> {
    return new Set(
        overrides
            .filter((o): o is Extract<PaletteOverride, { kind: 'disable' }> => o.kind === 'disable' && o.brandId === brandId)
            .map(o => shadeKey({ line: o.line ?? undefined, code: o.code }))
    );
}

// The shade chart PaletteAdminView edits: a brand's built-in/custom shades plus every
// admin-added shade, *including* discontinued ones (pair with `getDisabledShadeKeys` to
// tell which — keyed by `line`+`code`, not `code` alone). Calculators never see this —
// they use `buildBrandCatalog`'s filtered list.
//
// A base shade whose (line, code) also appears in an `add` override is dropped in favor
// of the override: this makes bulk-migrating a hard-coded chart into Firestore (see
// `scripts/migrateBuiltInPalette.ts`) idempotent and collision-safe — running it twice, or
// running it while a few of those shades were already added by hand, never produces a
// duplicate row. Keying by (line, code) instead of bare code matters here: two different
// lines legitimately share the same numeric code, and must not shadow each other.
export function getFullBrandShades(baseBrands: Record<BrandId, Brand>, customBrands: CustomBrandRecord[], overrides: PaletteOverride[], brandId: BrandId): Shade[] {
    void customBrands; // custom brands never ship their own shades; they only gain them through `add` overrides.
    const added = addedShadesFor(overrides, brandId);
    const addedKeys = new Set(added.map(shadeKey));
    const base = (baseBrands[brandId]?.shades ?? []).filter(s => !addedKeys.has(shadeKey(s)));
    return [...base, ...added];
}

// Merges built-in brands with admin-managed custom brands and overrides into the
// catalog the calculators use: discontinued shades removed, admin-added shades
// included, custom lines resolved to a real `Brand`. Pure and Firestore-agnostic so it
// can be unit tested without a backend — see `PaletteContext` for the live wiring.
export function buildBrandCatalog(baseBrands: Record<BrandId, Brand>, customBrands: CustomBrandRecord[], overrides: PaletteOverride[]): Record<BrandId, Brand> {
    const ids = new Set<BrandId>([...Object.keys(baseBrands), ...customBrands.map(c => c.id)]);
    const catalog: Record<BrandId, Brand> = {};
    for (const id of ids) {
        const base = baseBrands[id];
        const custom = customBrands.find(c => c.id === id);
        const disabled = getDisabledShadeKeys(overrides, id);
        const shades = getFullBrandShades(baseBrands, customBrands, overrides, id).filter(s => !disabled.has(shadeKey(s)));
        catalog[id] = {
            id,
            name: custom?.name ?? base!.name,
            shades,
            mixingRatio: custom ? resolveMixingRatio(custom.mixingRatioConfig) : base!.mixingRatio,
            pricePerGram: custom?.pricePerGram ?? base!.pricePerGram,
        };
    }
    return catalog;
}
