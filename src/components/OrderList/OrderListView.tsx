import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { usePalette, useStock } from "../../palette";
import { buildReorderList, type ReorderItem } from "../../stock";
import { formatLineLabel } from "../../engine/formatLineLabel";
import { buildWhatsAppReminderUrl, buildTelegramReminderUrl } from "../../reminder";
import { Select } from "../common/Select";
import "../FormulaCalculator/FormulaCalculator.css";
import "../PaletteAdmin/PaletteAdminView.css";

const COPIED_FEEDBACK_MS = 1500;

// Admin-only reorder list: every tracked product (any brand) at "low" or "out" stock,
// with an editable suggested quantity, copyable/shareable as one WhatsApp/Telegram-ready
// message -- nothing here is persisted, it's derived live from the same `dyeStock`
// subscription Palette's own BrandStockList reads (see stock.ts's buildReorderList).
// Restocking itself still happens in Palette; this view is order-drafting only.
export function OrderListView() {
  const { t } = useTranslation();
  const brands = usePalette();
  const items = buildReorderList(brands, useStock());
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  // Plain setTimeout fired from an event handler, not tied to a render's dependencies --
  // tracked in a ref purely so the unmount cleanup below can cancel a still-pending one.
  // Same pattern as SessionDetailsPanel's own copy-feedback timer.
  const copyFeedbackTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(copyFeedbackTimeoutRef.current);
  }, []);

  // An item's effective order quantity: the suggested figure until the admin edits it.
  // A blank or invalid draft (including a negative typed value) means "leave this one
  // out" (0), same semantics as a blank stock field meaning "don't track" elsewhere.
  const qtyOf = (item: ReorderItem): number => {
    const raw = qtyDrafts[item.id];
    if (raw === undefined) return item.suggestedPacks;
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  };

  const labelOf = (item: ReorderItem): string => {
    if (item.kind === "shade") return item.line !== null ? `${item.code} · ${formatLineLabel(item.line)}` : item.code;
    const volumeLabel = t("format.developerVolume", { value: item.volume });
    return item.line !== null ? `${volumeLabel} · ${formatLineLabel(item.line)}` : volumeLabel;
  };

  // `items` is already grouped contiguously by brand (buildReorderList's own iteration
  // order) -- just splits it back into per-brand groups. Shown one brand at a time (the
  // picker below) rather than one combined list/message for every brand at once, since a
  // salon typically orders each brand from a different supplier.
  const groups: { brandId: string; items: ReorderItem[] }[] = [];
  for (const item of items) {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup !== undefined && currentGroup.brandId === item.brandId) {
      currentGroup.items.push(item);
    } else {
      groups.push({ brandId: item.brandId, items: [item] });
    }
  }

  // Falls back to the first brand with something to order when nothing is selected yet,
  // or the previously selected brand no longer has anything low/out (e.g. it was just
  // restocked in Palette) -- same fallback pattern as PaletteAdminView's own
  // `effectiveSelectedBrandId`.
  const effectiveSelectedBrandId = groups.some(group => group.brandId === selectedBrandId)
    ? selectedBrandId
    : (groups[0]?.brandId ?? null);
  const selectedGroup = groups.find(group => group.brandId === effectiveSelectedBrandId) ?? null;

  const orderLines = selectedGroup === null
    ? []
    : selectedGroup.items
        .filter(item => qtyOf(item) > 0)
        .map(item => t(item.unit === "bottle" ? "orders.textBottleLine" : "orders.textTubeLine", {
          label: labelOf(item), qty: qtyOf(item), grams: item.packGrams,
        }));
  const orderText = selectedGroup === null || orderLines.length === 0
    ? null
    : [
        t("orders.textTitle", { date: new Date().toLocaleDateString() }),
        `${brands[selectedGroup.brandId].name}\n${orderLines.join("\n")}`,
      ].join("\n\n");

  const handleCopy = async () => {
    if (orderText === null) return;
    await navigator.clipboard.writeText(orderText);
    setIsCopied(true);
    clearTimeout(copyFeedbackTimeoutRef.current);
    copyFeedbackTimeoutRef.current = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  };

  const handleShareWhatsApp = () => {
    if (orderText === null) return;
    window.open(buildWhatsAppReminderUrl(null, orderText), "_blank", "noopener,noreferrer");
  };

  const handleShareTelegram = () => {
    if (orderText === null) return;
    window.open(buildTelegramReminderUrl(orderText), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="calculator">
      <h1 className="calculator__title">{t("orders.titlePrefix")} <span className="calculator__title-accent">{t("orders.titleAccent")}</span></h1>
      <p className="palette-admin__hint">{t("orders.hint")}</p>

      {items.length === 0 ? (
        <p className="palette-admin__hint">{t("orders.empty")}</p>
      ) : (
        <>
          <div className="field">
            <label htmlFor="orderListSelectedBrand">{t("orders.selectBrandLabel")}</label>
            <Select
              id="orderListSelectedBrand"
              value={effectiveSelectedBrandId ?? ""}
              onChange={setSelectedBrandId}
              options={groups.map(group => ({ value: group.brandId, label: brands[group.brandId].name }))}
            />
          </div>

          {selectedGroup !== null && (
            <section className="palette-admin__section">
              <h2 className="results__section-heading">{brands[selectedGroup.brandId].name}</h2>
              <ul className="palette-admin__stock-list">
                {selectedGroup.items.map(item => {
                  const label = labelOf(item);
                  return (
                    <li key={item.id} className={clsx("palette-admin__stock-row", item.status === "out" && "palette-admin__stock-row--out")}>
                      <span className="palette-admin__stock-label">{label}</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        aria-label={t("orders.qtyFor", { label })}
                        value={qtyDrafts[item.id] ?? String(item.suggestedPacks)}
                        onChange={e => setQtyDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                      />
                      <span>
                        {t(item.unit === "bottle" ? "orders.bottleDetail" : "orders.tubeDetail", {
                          grams: item.packGrams, remaining: Math.round(item.remainingGrams),
                        })}
                      </span>
                      <span className="palette-admin__stock-badge">
                        {t(item.status === "out" ? "palette.stockOut" : "palette.stockLow")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="results__actions">
            <button type="button" className="button" disabled={orderText === null} onClick={handleCopy}>
              {isCopied ? t("orders.copied") : t("orders.copy")}
            </button>
          </div>

          <div className="results__share">
            <button type="button" className="button button--share button--whatsapp" disabled={orderText === null} onClick={handleShareWhatsApp}>
              {t("results.shareWhatsApp")}
            </button>
            <button type="button" className="button button--share button--telegram" disabled={orderText === null} onClick={handleShareTelegram}>
              {t("results.shareTelegram")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
