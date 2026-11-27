import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePaletteAdmin } from "../../palette";
import { BRANDS } from "../../engine/brands";
import { setBrandPricePerGram } from "../../salonSettings";

// A price as the admin types it: a decimal comma (the Ukrainian keyboard's) reads as a point.
function parsePrice(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  const value = Number(trimmed);
  return trimmed !== "" && Number.isFinite(value) && value > 0 ? value : null;
}

// Every brand's price per gram, editable: what a new calculation starts from for that
// brand (a stylist can still change it for one formula). Saved on blur, like the markup
// above; "Default" drops the salon's price so the brand goes back to its own.
export function BrandPriceList() {
  const { t } = useTranslation();
  const { brands, customBrands, pricingSettings } = usePaletteAdmin();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const brandIds = Object.keys(brands).sort((a, b) => brands[a].name.localeCompare(brands[b].name));

  const defaultPriceOf = (brandId: string): number =>
    customBrands.find(custom => custom.id === brandId)?.pricePerGram ?? BRANDS[brandId]?.pricePerGram ?? 0;

  const save = async (brandId: string, price: number | null) => {
    setError(null);
    setPendingId(brandId);
    try {
      await setBrandPricePerGram(brandId, price);
      setDrafts(prev => {
        const next = { ...prev };
        delete next[brandId];
        return next;
      });
    } catch {
      setError(t("palette.saveError"));
    } finally {
      setPendingId(null);
    }
  };

  const handleBlur = (brandId: string) => {
    const raw = drafts[brandId];
    if (raw === undefined) return;
    const price = parsePrice(raw);
    if (price === null) {
      setError(t("palette.brandPriceInvalid"));
      return;
    }
    if (price === brands[brandId].pricePerGram) {
      setDrafts(prev => {
        const next = { ...prev };
        delete next[brandId];
        return next;
      });
      return;
    }
    void save(brandId, price);
  };

  return (
    <div className="palette-admin__brand-prices">
      <h3 className="palette-admin__stock-subheading">{t("palette.brandPricesTitle")}</h3>
      <p className="palette-admin__hint">{t("palette.brandPricesHint")}</p>
      {error !== null && (
        <p className="warning" role="alert">
          {error}
        </p>
      )}
      <ul className="palette-admin__stock-list">
        {brandIds.map(brandId => {
          const isCustomPrice = pricingSettings.brandPricesPerGram[brandId] !== undefined;
          const defaultPrice = defaultPriceOf(brandId);
          return (
            <li key={brandId} className="palette-admin__price-row">
              <label htmlFor={`brandPrice-${brandId}`} className="palette-admin__stock-label">
                {brands[brandId].name}
              </label>
              <input
                id={`brandPrice-${brandId}`}
                type="text"
                inputMode="decimal"
                value={drafts[brandId] ?? String(brands[brandId].pricePerGram)}
                disabled={pendingId === brandId}
                onFocus={e => e.target.select()}
                onChange={e => setDrafts(prev => ({ ...prev, [brandId]: e.target.value }))}
                onBlur={() => handleBlur(brandId)}
              />
              {isCustomPrice ? (
                <button
                  type="button"
                  className="button button--secondary palette-admin__stock-restock"
                  disabled={pendingId === brandId}
                  onClick={() => void save(brandId, null)}
                >
                  {t("palette.brandPriceReset", { price: defaultPrice })}
                </button>
              ) : (
                <span className="palette-admin__price-default">{t("palette.brandPriceDefault")}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
