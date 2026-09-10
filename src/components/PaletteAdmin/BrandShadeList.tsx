import { useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { setShadeDisabled } from "../../palette";
import type { Brand, BrandId } from "../../engine/brands";
import { shadeKey } from "../../engine/paletteOverrides";
import type { Shade } from "../../engine/shades";
import { shadeToHexColor } from "../../engine/color";
import { Select } from "../common/Select";

export interface BrandShadeListProps {
  brands: Record<BrandId, Brand>;
  brandIds: BrandId[];
  // Already resolved to a brand that actually exists (falls back to the first
  // available brand when the previously selected one was renamed/removed) — see
  // PaletteAdminView's `effectiveSelectedBrandId`.
  selectedBrandId: BrandId;
  onSelectBrand: (id: BrandId) => void;
  shades: Shade[];
  disabledKeys: Set<string>;
}

// Brand selector plus that brand's full shade list (including discontinued shades, so
// an admin can re-enable one) with a per-shade discontinued toggle.
export function BrandShadeList({ brands, brandIds, selectedBrandId, onSelectBrand, shades, disabledKeys }: BrandShadeListProps) {
  const { t } = useTranslation();
  const [pendingShadeKeys, setPendingShadeKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleToggleDisabled = async (shade: Shade, disabled: boolean) => {
    const key = shadeKey(shade);
    setError(null);
    setPendingShadeKeys(prev => new Set(prev).add(key));
    try {
      await setShadeDisabled(selectedBrandId, shade.line ?? null, shade.code, disabled);
    } catch {
      // The checkbox itself already reverts to its pre-toggle state on its own, since it's
      // driven by the unchanged `disabledKeys` prop once this write fails -- but without
      // this, an admin trying to urgently discontinue a recalled/out-of-stock shade would
      // get no indication the write never went through and could walk away believing it
      // succeeded.
      setError(t("palette.saveError"));
    } finally {
      setPendingShadeKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <section className="palette-admin__section">
      <h2 className="results__section-heading">{t("palette.shadesTitle")}</h2>
      <div className="field">
        <label htmlFor="paletteSelectedBrand">{t("palette.selectBrandLabel")}</label>
        <Select
          id="paletteSelectedBrand"
          value={selectedBrandId}
          onChange={onSelectBrand}
          options={brandIds.map(id => ({ value: id, label: brands[id].name }))}
        />
      </div>
      {error !== null && <p className="warning" role="alert">{error}</p>}

      {shades.length === 0 ? (
        <p className="history__status" aria-live="polite">{t("palette.noShades")}</p>
      ) : (
        <ul className="palette-admin__shade-list">
          {shades.map(shade => (
            <li key={shadeKey(shade)} className={clsx("palette-admin__shade-row", disabledKeys.has(shadeKey(shade)) && "palette-admin__shade-row--disabled")}>
              <span className="shade-swatch" style={{ backgroundColor: shadeToHexColor(shade) }} />
              <span className="palette-admin__shade-code">{shade.code}{shade.name !== undefined ? ` "${shade.name}"` : ""}</span>
              <span className="palette-admin__shade-detail">
                {t("palette.level")} {shade.level} · {t(`palette.toneFamily.${shade.tone}`)}
                {shade.secondaryTone ? ` / ${t(`palette.toneFamily.${shade.secondaryTone}`)}` : ""}
                {shade.line ? ` · ${shade.line}` : ""}
              </span>
              <label className="palette-admin__discontinued">
                <input
                  type="checkbox"
                  checked={disabledKeys.has(shadeKey(shade))}
                  disabled={pendingShadeKeys.has(shadeKey(shade))}
                  onChange={e => handleToggleDisabled(shade, e.target.checked)}
                />
                {t("palette.discontinued")}
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
