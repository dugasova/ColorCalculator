import { useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { BrandId } from "../../engine/brands";
import type { Shade } from "../../engine/shades";
import { shadeKey } from "../../engine/paletteOverrides";
import { formatLineLabel } from "../../engine/formatLineLabel";
import { ALL_DEVELOPER_VOLUMES } from "../../engine/levels";
import { useStock } from "../../palette";
import {
  developerStockId, DEVELOPER_BOTTLE_SIZE_GRAMS, getShadeTubeSizeGrams, getStockStatus, restockOneTube,
  setDeveloperStockGrams, setShadeStockGrams, shadeStockId, stockById, stopTrackingStock, LOW_STOCK_THRESHOLD_GRAMS,
} from "../../stock";

export interface BrandStockListProps {
  brandId: BrandId;
  // PaletteAdminView's already level/code-sorted `fullShades` -- discontinued shades
  // (present in `disabledKeys`) aren't offered a stock row, since they're no longer
  // used in new formulas.
  shades: Shade[];
  disabledKeys: Set<string>;
}

// Remaining-grams editor for one brand's shades plus every developer volume: a plain
// number input per row, live-synced from src/stock.ts's Firestore-backed subscription.
// Blank means "don't track this product" -- distinct from 0, which still shows "Out".
export function BrandStockList({ brandId, shades, disabledKeys }: BrandStockListProps) {
  const { t } = useTranslation();
  const stockMap = stockById(useStock());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const activeShades = shades.filter(shade => !disabledKeys.has(shadeKey(shade)));
  // `thresholdGrams` drives the low-stock badge (one service's worth left); `restockGrams`
  // is the amount the "+1" button below adds and is sized to how the product is actually
  // sold -- a shade's tube (60 g, or 50 g for Majirel/Dia Light/Dia Richesse) vs. a
  // developer's 1000 g/ml bottle. The two differ for developer: a bottle is drawn down
  // gradually, so it still goes "low" at 60 g left even though restocking adds 1000 g back.
  const rows: {
    id: string; label: string; thresholdGrams: number; restockGrams: number; unit: "tube" | "bottle";
    commit: (grams: number) => Promise<void>;
  }[] = [
    ...activeShades.map(shade => {
      const tubeGrams = getShadeTubeSizeGrams(brandId, shade.line ?? null);
      return {
        id: shadeStockId(brandId, shade.line ?? null, shade.code),
        // Several lines legitimately reuse the same numeric code (e.g. L'Oréal's Majirel,
        // Dia Light, and Dia Richesse all have a "7.1") -- shade.code alone would show two
        // indistinguishable rows, so the line name (when the shade has one) is appended,
        // same disambiguation BrandShadeList already shows in its own detail line.
        label: shade.line !== undefined ? `${shade.code} · ${formatLineLabel(shade.line)}` : shade.code,
        thresholdGrams: tubeGrams,
        restockGrams: tubeGrams,
        unit: "tube" as const,
        commit: (grams: number) => setShadeStockGrams(brandId, shade.line ?? null, shade.code, grams),
      };
    }),
    ...ALL_DEVELOPER_VOLUMES.map(volume => ({
      id: developerStockId(brandId, volume),
      label: t("format.developerVolume", { value: volume }),
      thresholdGrams: LOW_STOCK_THRESHOLD_GRAMS,
      restockGrams: DEVELOPER_BOTTLE_SIZE_GRAMS,
      unit: "bottle" as const,
      commit: (grams: number) => setDeveloperStockGrams(brandId, volume, grams),
    })),
  ];

  const lowOrOutCount = rows
    .filter(row => {
      const record = stockMap.get(row.id);
      return record !== undefined && getStockStatus(record.remainingGrams, row.thresholdGrams) !== "ok";
    })
    .length;

  const handleBlur = async (id: string, commit: (grams: number) => Promise<void>) => {
    const raw = drafts[id];
    if (raw === undefined) return;
    const trimmed = raw.trim();
    setError(null);
    setPendingIds(prev => new Set(prev).add(id));
    try {
      if (trimmed === "") {
        if (stockMap.has(id)) await stopTrackingStock(id);
      } else {
        const grams = Number(trimmed);
        if (!Number.isFinite(grams) || grams < 0) {
          setError(t("palette.stockInvalid"));
          return;
        }
        await commit(grams);
      }
      setDrafts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      setError(t("palette.saveError"));
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // An admin's one-click restock, sized to the row's own restock amount (a smaller-tube
  // shade line like Majirel restocks by 50 g, most shades by 60 g, and every developer by
  // a full 1000 g/ml bottle) -- reuses the pending-id/error machinery above instead of
  // duplicating it.
  const handleRestock = async (id: string, tubeGrams: number) => {
    setError(null);
    setPendingIds(prev => new Set(prev).add(id));
    try {
      await restockOneTube(id, tubeGrams);
    } catch {
      setError(t("palette.saveError"));
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const renderRow = (row: {
    id: string; label: string; thresholdGrams: number; restockGrams: number; unit: "tube" | "bottle";
    commit: (grams: number) => Promise<void>;
  }) => {
    const record = stockMap.get(row.id);
    const status = record !== undefined ? getStockStatus(record.remainingGrams, row.thresholdGrams) : "ok";
    const value = drafts[row.id] ?? (record !== undefined ? String(record.remainingGrams) : "");
    const isPending = pendingIds.has(row.id);
    return (
      <li key={row.id} className={clsx("palette-admin__stock-row", status === "out" && "palette-admin__stock-row--out")}>
        <span className="palette-admin__stock-label">{row.label}</span>
        <input
          type="number"
          min={0}
          step={1}
          aria-label={t("palette.stockGramsFor", { code: row.label })}
          value={value}
          disabled={isPending}
          onChange={e => setDrafts(prev => ({ ...prev, [row.id]: e.target.value }))}
          onBlur={() => handleBlur(row.id, row.commit)}
        />
        <button
          type="button"
          className="button button--secondary palette-admin__stock-restock"
          disabled={record === undefined || isPending}
          onClick={() => handleRestock(row.id, row.restockGrams)}
        >
          {t(row.unit === "bottle" ? "palette.restockOneBottle" : "palette.restockOneTube", { grams: row.restockGrams })}
        </button>
        {status !== "ok" && (
          <span className="palette-admin__stock-badge">
            {t(status === "out" ? "palette.stockOut" : "palette.stockLow")}
          </span>
        )}
      </li>
    );
  };

  return (
    <section className="palette-admin__section">
      <h2 className="results__section-heading">
        {t("palette.stockTitle")}
        {lowOrOutCount > 0 && ` — ${t("palette.stockLowSummary", { count: lowOrOutCount })}`}
      </h2>
      <p className="palette-admin__hint">{t("palette.stockHint")}</p>
      {error !== null && <p className="warning" role="alert">{error}</p>}

      <ul className="palette-admin__stock-list">
        {rows.slice(0, activeShades.length).map(renderRow)}
      </ul>

      <h3 className="palette-admin__stock-subheading">{t("palette.stockDevelopersTitle")}</h3>
      <ul className="palette-admin__stock-list">
        {rows.slice(activeShades.length).map(renderRow)}
      </ul>
    </section>
  );
}
