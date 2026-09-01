import { describe, it, expect } from 'vitest';
import {
  buildBrandCatalog, customBrandRecordSchema, getDisabledShadeKeys, getFullBrandShades,
  paletteOverrideSchema, resolveMixingRatio, shadeKey,
  type Brand, type CustomBrandRecord, type PaletteOverride,
} from './brands';
import { getMixingRatio } from './formula';
import type { Shade } from './shades';

const baseBrands: Record<string, Brand> = {
  generic: {
    id: 'generic',
    name: 'Generic',
    shades: [
      { code: '7.1', level: 7, tone: 'ash' },
      { code: '7.3', level: 7, tone: 'gold' },
    ],
    mixingRatio: getMixingRatio,
    pricePerGram: 0.1,
  },
};

// Mirrors a real-world case: L'Oréal's Majirel and Inoa lines (and Wella's Koleston
// Perfect and Color Touch) both reuse the same numeric codes for their own shades.
const multiLineBrand: Record<string, Brand> = {
  loreal: {
    id: 'loreal',
    name: "L'Oréal",
    shades: [
      { code: '7.1', level: 7, tone: 'ash', line: 'majirel' },
      { code: '7.1', level: 7, tone: 'ash', line: 'inoa' },
    ],
    mixingRatio: getMixingRatio,
    pricePerGram: 0.2,
  },
};

describe('resolveMixingRatio', () => {
  it('returns a constant ratio for a fixed config', () => {
    const strategy = resolveMixingRatio({ kind: 'fixed', fixedRatio: { colorParts: 1, developerParts: 2 } });
    expect(strategy(5, 9)).toEqual({ colorParts: 1, developerParts: 2 });
  });

  it('defaults a fixed config with no ratio to 1:1', () => {
    const strategy = resolveMixingRatio({ kind: 'fixed' });
    expect(strategy(5, 9)).toEqual({ colorParts: 1, developerParts: 1 });
  });

  it('delegates to the generic level-difference strategy for a generic config', () => {
    const strategy = resolveMixingRatio({ kind: 'generic' });
    expect(strategy(5, 9)).toEqual(getMixingRatio(5, 9));
  });
});

describe('shadeKey', () => {
  it('distinguishes shades that share a code but belong to different lines', () => {
    expect(shadeKey({ code: '7.1', line: 'majirel' })).not.toBe(shadeKey({ code: '7.1', line: 'inoa' }));
  });

  it('treats a missing line as its own identity, distinct from any named line', () => {
    expect(shadeKey({ code: '7.1' })).not.toBe(shadeKey({ code: '7.1', line: 'inoa' }));
  });
});

describe('getFullBrandShades / getDisabledShadeKeys', () => {
  const overrides: PaletteOverride[] = [
    { id: 'o1', kind: 'add', brandId: 'generic', shade: { code: '7.45', level: 7, tone: 'red' } },
    { id: 'o2', kind: 'disable', brandId: 'generic', line: null, code: '7.3' },
  ];

  it('includes both built-in and admin-added shades, discontinued or not', () => {
    const shades = getFullBrandShades(baseBrands, [], overrides, 'generic');
    expect(shades.map(s => s.code)).toEqual(['7.1', '7.3', '7.45']);
  });

  it('collects only the disabled keys for the requested brand', () => {
    expect(getDisabledShadeKeys(overrides, 'generic')).toEqual(new Set([shadeKey({ code: '7.3' })]));
    expect(getDisabledShadeKeys(overrides, 'wella')).toEqual(new Set());
  });

  it('lets a migrated add-override with the same (line, code) replace the hard-coded base shade instead of duplicating it', () => {
    // Simulates scripts/migrateBuiltInPalette.ts writing every base shade as an
    // 'add' override — the base and override copies of '7.1' must collapse to one row.
    const migrated: PaletteOverride[] = [
      { id: 'm1', kind: 'add', brandId: 'generic', shade: { code: '7.1', level: 7, tone: 'ash' } },
      { id: 'm2', kind: 'add', brandId: 'generic', shade: { code: '7.3', level: 7, tone: 'gold' } },
    ];
    const shades = getFullBrandShades(baseBrands, [], migrated, 'generic');
    expect(shades.map(s => s.code)).toEqual(['7.1', '7.3']);
  });

  it('never collapses same-coded shades that belong to different lines', () => {
    // Regression: Wella and L'Oréal both reuse numeric codes across lines (e.g. Majirel
    // and Inoa each have their own '7.1'). Migrating one line's shade must not shadow
    // another line's shade sharing the same code.
    const migrated: PaletteOverride[] = [
      { id: 'm1', kind: 'add', brandId: 'loreal', shade: { code: '7.1', level: 7, tone: 'ash', line: 'majirel' } },
    ];
    const shades = getFullBrandShades(multiLineBrand, [], migrated, 'loreal');
    expect(shades).toHaveLength(2);
    expect(shades.map(s => s.line).sort()).toEqual(['inoa', 'majirel']);
  });

  it('disabling a shade in one line leaves the same code active in a different line', () => {
    const overridesForMultiLine: PaletteOverride[] = [
      { id: 'd1', kind: 'disable', brandId: 'loreal', line: 'majirel', code: '7.1' },
    ];
    const disabled = getDisabledShadeKeys(overridesForMultiLine, 'loreal');
    const remaining = multiLineBrand.loreal.shades.filter(s => !disabled.has(shadeKey(s)));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].line).toBe('inoa');
  });
});

describe('buildBrandCatalog', () => {
  it('passes a brand through unchanged when there are no overrides', () => {
    const catalog = buildBrandCatalog(baseBrands, [], []);
    expect(catalog.generic.shades).toEqual(baseBrands.generic.shades);
  });

  it('adds an admin-added shade to an existing brand', () => {
    const added: Shade = { code: '7.45', level: 7, tone: 'red' };
    const catalog = buildBrandCatalog(baseBrands, [], [{ id: 'o1', kind: 'add', brandId: 'generic', shade: added }]);
    expect(catalog.generic.shades.map(s => s.code)).toEqual(['7.1', '7.3', '7.45']);
  });

  it('removes a discontinued shade from the calculator-facing catalog', () => {
    const catalog = buildBrandCatalog(baseBrands, [], [{ id: 'o1', kind: 'disable', brandId: 'generic', line: null, code: '7.3' }]);
    expect(catalog.generic.shades.map(s => s.code)).toEqual(['7.1']);
  });

  it('re-enables a shade once its disable override is gone', () => {
    const catalog = buildBrandCatalog(baseBrands, [], []);
    expect(catalog.generic.shades.map(s => s.code)).toEqual(['7.1', '7.3']);
  });

  it('disabling one line\'s shade does not remove another line\'s shade sharing the same code', () => {
    const catalog = buildBrandCatalog(multiLineBrand, [], [{ id: 'd1', kind: 'disable', brandId: 'loreal', line: 'majirel', code: '7.1' }]);
    expect(catalog.loreal.shades).toHaveLength(1);
    expect(catalog.loreal.shades[0].line).toBe('inoa');
  });

  it('materializes a brand-new custom line with a fixed mixing ratio and its own shades', () => {
    const customBrands: CustomBrandRecord[] = [{
      id: 'my-salon-line',
      name: 'Salon Exclusive',
      pricePerGram: 0.25,
      mixingRatioConfig: { kind: 'fixed', fixedRatio: { colorParts: 1, developerParts: 1.5 } },
    }];
    const overrides: PaletteOverride[] = [
      { id: 'o1', kind: 'add', brandId: 'my-salon-line', shade: { code: 'SE-1', level: 6, tone: 'natural' } },
    ];
    const catalog = buildBrandCatalog(baseBrands, customBrands, overrides);

    expect(catalog['my-salon-line'].name).toBe('Salon Exclusive');
    expect(catalog['my-salon-line'].pricePerGram).toBe(0.25);
    expect(catalog['my-salon-line'].shades.map(s => s.code)).toEqual(['SE-1']);
    expect(catalog['my-salon-line'].mixingRatio(5, 9)).toEqual({ colorParts: 1, developerParts: 1.5 });
  });

  it('leaves a custom brand with no add overrides yet with an empty shade list', () => {
    const customBrands: CustomBrandRecord[] = [{
      id: 'empty-line',
      name: 'Not Populated Yet',
      pricePerGram: 0.15,
      mixingRatioConfig: { kind: 'generic' },
    }];
    const catalog = buildBrandCatalog(baseBrands, customBrands, []);
    expect(catalog['empty-line'].shades).toEqual([]);
  });
});

// Firestore documents are untrusted input: a hand edit in the console, or a future
// schema change read by an old client, shouldn't crash deep inside the formula engine.
// See palette.ts's subscribeToCustomBrands/subscribeToPaletteOverrides, which safeParse
// against these before merging a document into the live catalog.
describe('customBrandRecordSchema', () => {
  it('accepts a well-formed customBrands document payload', () => {
    const result = customBrandRecordSchema.safeParse({
      name: 'Acme Color', pricePerGram: 0.22, mixingRatioConfig: { kind: 'fixed', fixedRatio: { colorParts: 1, developerParts: 1.5 } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a document missing a required field', () => {
    const result = customBrandRecordSchema.safeParse({ name: 'Acme Color', mixingRatioConfig: { kind: 'generic' } });
    expect(result.success).toBe(false);
  });

  it('rejects a document whose field has the wrong type', () => {
    const result = customBrandRecordSchema.safeParse({ name: 'Acme Color', pricePerGram: '0.22', mixingRatioConfig: { kind: 'generic' } });
    expect(result.success).toBe(false);
  });
});

describe('paletteOverrideSchema', () => {
  it('accepts a well-formed "add" override, including its nested shade', () => {
    const result = paletteOverrideSchema.safeParse({
      kind: 'add', brandId: 'wella', shade: { code: '8/38', level: 8, tone: 'gold', secondaryTone: 'pearl', line: 'koleston-perfect' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a well-formed "disable" override with a null line', () => {
    const result = paletteOverrideSchema.safeParse({ kind: 'disable', brandId: 'generic', line: null, code: '7.1' });
    expect(result.success).toBe(true);
  });

  it('rejects an "add" override whose nested shade has an out-of-range level', () => {
    const result = paletteOverrideSchema.safeParse({
      kind: 'add', brandId: 'wella', shade: { code: '13/0', level: 13, tone: 'natural' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a document whose kind matches neither branch', () => {
    const result = paletteOverrideSchema.safeParse({ kind: 'rename', brandId: 'wella', newName: 'Wella Pro' });
    expect(result.success).toBe(false);
  });
});
