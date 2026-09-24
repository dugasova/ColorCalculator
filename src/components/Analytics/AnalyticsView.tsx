import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { subscribeToFormulaHistory, type FormulaHistoryEntry } from "../../history";
import { computeSalonAnalytics } from "../../analytics";
import { formatBrandLineLabel } from "../../engine/formatLineLabel";
import "../FormulaCalculator/FormulaCalculator.css";
import "./AnalyticsView.css";

const TOP_SHADES_LIMIT = 8;

export interface AnalyticsViewProps {
  isAdmin: boolean;
  currentUserEmail: string;
}

export function AnalyticsView({ isAdmin, currentUserEmail }: AnalyticsViewProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<FormulaHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToFormulaHistory({ isAdmin, currentUserEmail }, entries => {
      setEntries(entries);
      setError(null);
      setIsLoading(false);
    }, () => {
      setError(t("analytics.loadError"));
      setIsLoading(false);
    });
  }, [t, isAdmin, currentUserEmail]);

  const stats = computeSalonAnalytics(entries);
  const topShades = stats.popularShades.slice(0, TOP_SHADES_LIMIT);

  return (
    <div className="calculator">
      <h1 className="calculator__title">{t("analytics.titlePrefix")} <span className="calculator__title-accent">{t("analytics.titleAccent")}</span></h1>

      {isLoading && <p className="history__status" aria-live="polite">{t("analytics.loading")}</p>}
      {error !== null && <p className="warning" role="alert">{error}</p>}

      {!isLoading && error === null && stats.totalVisits === 0 && (
        <p className="history__status" aria-live="polite">{t("analytics.empty")}</p>
      )}

      {!isLoading && error === null && stats.totalVisits > 0 && (
        <>
          <div className="analytics__kpis">
            <div className="analytics__kpi">
              <span className="analytics__kpi-value">{stats.totalVisits}</span>
              <span className="analytics__kpi-label">{t("analytics.totalVisits")}</span>
            </div>
            <div className="analytics__kpi">
              <span className="analytics__kpi-value">{stats.uniqueClients}</span>
              <span className="analytics__kpi-label">{t("analytics.uniqueClients")}</span>
            </div>
            <div className="analytics__kpi">
              <span className="analytics__kpi-value">{Math.round(stats.retentionRate * 100)}%</span>
              <span className="analytics__kpi-label">{t("analytics.retentionRate")}</span>
            </div>
            <div className="analytics__kpi">
              <span className="analytics__kpi-value">{stats.averageColorGrams !== null ? stats.averageColorGrams.toFixed(1) : "—"}</span>
              <span className="analytics__kpi-label">{t("analytics.averageColorGrams")}</span>
            </div>
            <div className="analytics__kpi">
              <span className="analytics__kpi-value">{stats.averageProductCost !== null ? stats.averageProductCost.toFixed(2) : "—"}</span>
              <span className="analytics__kpi-label">{t("analytics.averageProductCost")}</span>
            </div>
            <div className="analytics__kpi">
              <span className="analytics__kpi-value">{stats.averageActualColorGrams !== null ? stats.averageActualColorGrams.toFixed(1) : "—"}</span>
              <span className="analytics__kpi-label">{t("analytics.averageActualColorGrams")}</span>
            </div>
            <div className="analytics__kpi">
              <span className="analytics__kpi-value">{stats.actualVsComputedRatio !== null ? `${Math.round(stats.actualVsComputedRatio * 100)}%` : "—"}</span>
              <span className="analytics__kpi-label">{t("analytics.actualVsComputedRatio")}</span>
            </div>
          </div>

          <h2 className="analytics__section-title">{t("analytics.popularShadesTitle")}</h2>
          {topShades.length === 0 ? (
            <p className="history__status" aria-live="polite">{t("analytics.noShades")}</p>
          ) : (
            <ol className="analytics__shade-list">
              {topShades.map(shade => (
                <li key={`${shade.brandName}|${shade.line ?? ""}|${shade.shadeCode}`} className="analytics__shade-row">
                  <span className="analytics__shade-name">
                    {formatBrandLineLabel(shade.brandName, shade.line ?? null)} — {shade.shadeCode}
                  </span>
                  <span className="analytics__shade-count">{t("analytics.shadeUsedCount", { count: shade.count })}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
