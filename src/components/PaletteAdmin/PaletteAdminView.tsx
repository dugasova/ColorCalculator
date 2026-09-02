import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { addCustomBrand, addShadeToBrand, setShadeDisabled, usePaletteAdmin } from "../../palette";
import { BRANDS, getDisabledShadeKeys, getFullBrandShades, shadeKey, type MixingRatioConfig } from "../../engine/brands";
import type { Level } from "../../engine/levels";
import type { Shade, ToneFamily } from "../../engine/shades";
import { shadeToHexColor } from "../../engine/color";
import { Select } from "../common/Select";
import "../FormulaCalculator/FormulaCalculator.css";
import "./PaletteAdminView.css";

const LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TONE_FAMILIES: ToneFamily[] = ['natural', 'ash', 'cendré', 'matt', 'gold', 'copper', 'red', 'violet', 'chocolate', 'pearl', 'slate-grey', 'mahogany'];

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type SubmitStatus = 'idle' | 'saving' | 'saved' | 'error';

export function PaletteAdminView() {
  const { t } = useTranslation();
  const { brands, customBrands, overrides } = usePaletteAdmin();
  const brandIds = Object.keys(brands).sort((a, b) => brands[a].name.localeCompare(brands[b].name));

  const [brandName, setBrandName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [brandIdTouched, setBrandIdTouched] = useState(false);
  const [pricePerGram, setPricePerGram] = useState(0.15);
  const [mixingKind, setMixingKind] = useState<MixingRatioConfig['kind']>('fixed');
  const [colorParts, setColorParts] = useState(1);
  const [developerParts, setDeveloperParts] = useState(1);
  const [brandStatus, setBrandStatus] = useState<SubmitStatus>('idle');
  const [brandError, setBrandError] = useState<string | null>(null);

  const [selectedBrandId, setSelectedBrandId] = useState(brandIds[0] ?? 'generic');
  const [pendingShadeKeys, setPendingShadeKeys] = useState<Set<string>>(new Set());

  const [shadeCode, setShadeCode] = useState('');
  const [shadeLevel, setShadeLevel] = useState<Level>(6);
  const [shadeTone, setShadeTone] = useState<ToneFamily>('natural');
  const [shadeSecondaryTone, setShadeSecondaryTone] = useState<ToneFamily | ''>('');
  const [shadeName, setShadeName] = useState('');
  const [shadeLine, setShadeLine] = useState('');
  const [shadeStatus, setShadeStatus] = useState<SubmitStatus>('idle');
  const [shadeError, setShadeError] = useState<string | null>(null);

  const effectiveSelectedBrandId = brands[selectedBrandId] !== undefined ? selectedBrandId : (brandIds[0] ?? 'generic');
  const fullShades = getFullBrandShades(BRANDS, customBrands, overrides, effectiveSelectedBrandId)
    .slice()
    .sort((a, b) => a.level - b.level || a.code.localeCompare(b.code));
  const disabledKeys = getDisabledShadeKeys(overrides, effectiveSelectedBrandId);

  const handleBrandNameChange = (name: string) => {
    setBrandName(name);
    if (!brandIdTouched) {
      setBrandId(slugify(name));
    }
  };

  const handleAddBrand = async (e: FormEvent) => {
    e.preventDefault();
    setBrandError(null);

    const trimmedName = brandName.trim();
    const id = brandId.trim();
    if (trimmedName === '' || id === '') {
      setBrandError(t('palette.brandFieldsRequired'));
      return;
    }
    if (!/^[a-z0-9-]+$/.test(id)) {
      setBrandError(t('palette.brandIdInvalid'));
      return;
    }
    if (brands[id] !== undefined) {
      setBrandError(t('palette.brandIdTaken'));
      return;
    }

    const mixingRatioConfig: MixingRatioConfig = mixingKind === 'fixed'
      ? { kind: 'fixed', fixedRatio: { colorParts, developerParts } }
      : { kind: 'generic' };

    setBrandStatus('saving');
    try {
      await addCustomBrand({ id, name: trimmedName, pricePerGram, mixingRatioConfig });
      setBrandStatus('saved');
      setBrandName('');
      setBrandId('');
      setBrandIdTouched(false);
      setPricePerGram(0.15);
      setMixingKind('fixed');
      setColorParts(1);
      setDeveloperParts(1);
      setSelectedBrandId(id);
    } catch {
      setBrandStatus('error');
      setBrandError(t('palette.saveError'));
    }
  };

  const handleAddShade = async (e: FormEvent) => {
    e.preventDefault();
    setShadeError(null);

    const code = shadeCode.trim();
    if (code === '') {
      setShadeError(t('palette.shadeCodeRequired'));
      return;
    }
    if (fullShades.some(s => shadeKey(s) === shadeKey({ code, line: shadeLine.trim() || undefined }))) {
      setShadeError(t('palette.shadeCodeTaken'));
      return;
    }

    const shade: Shade = {
      code,
      level: shadeLevel,
      tone: shadeTone,
      ...(shadeSecondaryTone !== '' ? { secondaryTone: shadeSecondaryTone } : {}),
      ...(shadeName.trim() !== '' ? { name: shadeName.trim() } : {}),
      ...(shadeLine.trim() !== '' ? { line: shadeLine.trim() } : {}),
    };

    setShadeStatus('saving');
    try {
      await addShadeToBrand(effectiveSelectedBrandId, shade);
      setShadeStatus('saved');
      setShadeCode('');
      setShadeLine('');
      setShadeSecondaryTone('');
      setShadeName('');
    } catch {
      setShadeStatus('error');
      setShadeError(t('palette.saveError'));
    }
  };

  const handleToggleDisabled = async (shade: Shade, disabled: boolean) => {
    const key = shadeKey(shade);
    setPendingShadeKeys(prev => new Set(prev).add(key));
    try {
      await setShadeDisabled(effectiveSelectedBrandId, shade.line ?? null, shade.code, disabled);
    } finally {
      setPendingShadeKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="calculator calculator--wide">
      <h1 className="calculator__title">{t('palette.titlePrefix')} <span className="calculator__title-accent">{t('palette.titleAccent')}</span></h1>

      <section className="palette-admin__section">
        <h2 className="results__section-heading">{t('palette.addBrandTitle')}</h2>
        <form className="calculator__form" onSubmit={handleAddBrand}>
          <div className="field">
            <label htmlFor="paletteBrandName">{t('palette.brandName')}</label>
            <input id="paletteBrandName" type="text" value={brandName} onChange={e => handleBrandNameChange(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="paletteBrandId">{t('palette.brandId')}</label>
            <input
              id="paletteBrandId"
              type="text"
              value={brandId}
              onChange={e => { setBrandId(e.target.value); setBrandIdTouched(true); }}
              required
            />
            <small>{t('palette.brandIdHint')}</small>
          </div>
          <div className="field">
            <label htmlFor="paletteBrandPrice">{t('palette.pricePerGram')}</label>
            <input
              id="paletteBrandPrice"
              type="number"
              min={0}
              step={0.01}
              value={pricePerGram}
              onChange={e => setPricePerGram(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="paletteMixingKind">{t('palette.mixingRatioKind')}</label>
            <Select
              id="paletteMixingKind"
              value={mixingKind}
              onChange={value => setMixingKind(value as MixingRatioConfig['kind'])}
              options={[
                { value: 'fixed', label: t('palette.mixingRatioFixed') },
                { value: 'generic', label: t('palette.mixingRatioGeneric') },
              ]}
            />
          </div>
          {mixingKind === 'fixed' && (
            <>
              <div className="field">
                <label htmlFor="paletteColorParts">{t('palette.colorParts')}</label>
                <input id="paletteColorParts" type="number" min={1} value={colorParts} onChange={e => setColorParts(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="paletteDeveloperParts">{t('palette.developerParts')}</label>
                <input id="paletteDeveloperParts" type="number" min={1} value={developerParts} onChange={e => setDeveloperParts(Number(e.target.value))} />
              </div>
            </>
          )}
          {brandError !== null && <p className="warning" role="alert">{brandError}</p>}
          <button type="submit" className="button" disabled={brandStatus === 'saving'}>
            {brandStatus === 'saving' ? t('palette.saving') : t('palette.addBrand')}
          </button>
          {brandStatus === 'saved' && <span className="palette-admin__status" role="status">{t('palette.brandAdded')}</span>}
        </form>
      </section>

      <section className="palette-admin__section">
        <h2 className="results__section-heading">{t('palette.shadesTitle')}</h2>
        <div className="field">
          <label htmlFor="paletteSelectedBrand">{t('palette.selectBrandLabel')}</label>
          <Select
            id="paletteSelectedBrand"
            value={effectiveSelectedBrandId}
            onChange={setSelectedBrandId}
            options={brandIds.map(id => ({ value: id, label: brands[id].name }))}
          />
        </div>

        {fullShades.length === 0 ? (
          <p className="history__status" aria-live="polite">{t('palette.noShades')}</p>
        ) : (
          <ul className="palette-admin__shade-list">
            {fullShades.map(shade => (
              <li key={shadeKey(shade)} className={clsx('palette-admin__shade-row', disabledKeys.has(shadeKey(shade)) && 'palette-admin__shade-row--disabled')}>
                <span className="shade-swatch" style={{ backgroundColor: shadeToHexColor(shade) }} />
                <span className="palette-admin__shade-code">{shade.code}{shade.name !== undefined ? ` "${shade.name}"` : ''}</span>
                <span className="palette-admin__shade-detail">
                  {t('palette.level')} {shade.level} · {t(`palette.toneFamily.${shade.tone}`)}
                  {shade.secondaryTone ? ` / ${t(`palette.toneFamily.${shade.secondaryTone}`)}` : ''}
                  {shade.line ? ` · ${shade.line}` : ''}
                </span>
                <label className="palette-admin__discontinued">
                  <input
                    type="checkbox"
                    checked={disabledKeys.has(shadeKey(shade))}
                    disabled={pendingShadeKeys.has(shadeKey(shade))}
                    onChange={e => handleToggleDisabled(shade, e.target.checked)}
                  />
                  {t('palette.discontinued')}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="palette-admin__section">
        <h2 className="results__section-heading">{t('palette.addShadeTitle')}</h2>
        <form className="calculator__form" onSubmit={handleAddShade}>
          <div className="field">
            <label htmlFor="paletteShadeCode">{t('palette.shadeCode')}</label>
            <input id="paletteShadeCode" type="text" value={shadeCode} onChange={e => setShadeCode(e.target.value)} required />
            <small>{t('palette.shadeCodeHint')}</small>
          </div>
          <div className="field">
            <label htmlFor="paletteShadeLevel">{t('palette.level')}</label>
            <Select
              id="paletteShadeLevel"
              value={String(shadeLevel)}
              onChange={value => setShadeLevel(Number(value) as Level)}
              options={LEVELS.map(level => ({ value: String(level), label: String(level) }))}
            />
          </div>
          <div className="field">
            <label htmlFor="paletteShadeTone">{t('palette.tone')}</label>
            <Select
              id="paletteShadeTone"
              value={shadeTone}
              onChange={value => setShadeTone(value as ToneFamily)}
              options={TONE_FAMILIES.map(tone => ({ value: tone, label: t(`palette.toneFamily.${tone}`) }))}
            />
          </div>
          <div className="field">
            <label htmlFor="paletteShadeSecondaryTone">{t('palette.secondaryTone')}</label>
            <Select
              id="paletteShadeSecondaryTone"
              value={shadeSecondaryTone}
              onChange={value => setShadeSecondaryTone(value as ToneFamily | '')}
              options={[
                { value: '', label: t('palette.secondaryToneNone') },
                ...TONE_FAMILIES.map(tone => ({ value: tone, label: t(`palette.toneFamily.${tone}`) })),
              ]}
            />
          </div>
          <div className="field">
            <label htmlFor="paletteShadeName">{t('palette.shadeName')}</label>
            <input id="paletteShadeName" type="text" value={shadeName} onChange={e => setShadeName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="paletteShadeLine">{t('palette.line')}</label>
            <input id="paletteShadeLine" type="text" value={shadeLine} onChange={e => setShadeLine(e.target.value)} />
          </div>
          {shadeError !== null && <p className="warning" role="alert">{shadeError}</p>}
          <button type="submit" className="button" disabled={shadeStatus === 'saving'}>
            {shadeStatus === 'saving' ? t('palette.saving') : t('palette.addShade')}
          </button>
          {shadeStatus === 'saved' && <span className="palette-admin__status" role="status">{t('palette.shadeAdded')}</span>}
        </form>
      </section>
    </div>
  );
}
