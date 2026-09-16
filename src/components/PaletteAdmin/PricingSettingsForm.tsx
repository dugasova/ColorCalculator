import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSalonMarkupMultiplier } from "../../palette";
import { setSalonMarkupMultiplier } from "../../salonSettings";

// Admin-editable salon-wide markup default (src/salonSettings.ts) -- seeds every new
// calculator's starting markup; a stylist can still override it for one session. Copies
// BrandStockList's draft-state/onBlur-commit/pending/error idiom, the in-repo convention
// for "edit a persisted number in a list row" -- an empty draft here is rejected rather
// than treated as "stop tracking" (BrandStockList's blank-means-untrack semantics don't
// apply: a markup always has a value).
export function PricingSettingsForm() {
  const { t } = useTranslation();
  const markupMultiplier = useSalonMarkupMultiplier();
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBlur = async () => {
    if (draft === null) return;
    const trimmed = draft.trim();
    const value = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(value) || value <= 0) {
      setError(t("palette.markupInvalid"));
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await setSalonMarkupMultiplier(value);
      setDraft(null);
    } catch {
      setError(t("palette.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="palette-admin__section">
      <h2 className="results__section-heading">{t("palette.pricingTitle")}</h2>
      <p className="palette-admin__hint">{t("palette.markupHint")}</p>
      <div className="field">
        <label htmlFor="salonMarkupMultiplier">{t("palette.markupLabel")}</label>
        <input
          id="salonMarkupMultiplier"
          type="number"
          min={1}
          step={0.1}
          value={draft ?? String(markupMultiplier)}
          disabled={isSaving}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { void handleBlur(); }}
        />
      </div>
      {isSaving && <span className="palette-admin__status" role="status">{t("palette.saving")}</span>}
      {error !== null && <p className="warning" role="alert">{error}</p>}
    </section>
  );
}
