import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { subscribeToFormulaHistory, type FormulaHistoryEntry } from "../../history";
import { computeSalonAnalytics, computeStylistStats, filterEntriesByPeriod, ANALYTICS_PERIODS, type AnalyticsPeriod } from "../../analytics";
import { formatBrandLineLabel } from "../../engine/formatLineLabel";
import { Select } from "../common/Select";
import "../FormulaCalculator/FormulaCalculator.css";
import "./AnalyticsView.css";

const TOP_SHADES_LIMIT = 8;
const PERIOD_LABEL_KEYS: Record<AnalyticsPeriod, string> = {
  all: "analytics.periodAll",
  last30Days: "analytics.periodLast30Days",
  thisMonth: "analytics.periodThisMonth",
};

export interface AnalyticsViewProps {
  isAdmin: boolean;
  currentUserEmail: string;
}

export function AnalyticsView({ isAdmin, currentUserEmail }: AnalyticsViewProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<FormulaHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>("all");
  const [nowMs] = useState(() => Date.now());

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

  const periodEntries = filterEntriesByPeriod(entries, period, new Date(nowMs));
  const stats = computeSalonAnalytics(periodEntries);
  const stylistStats = isAdmin ? computeStylistStats(periodEntries) : [];
  const topShades = stats.popularShades.slice(0, TOP_SHADES_LIMIT);
  return (
    <div className="calculator">
      <h1 className="calculator__title">{t("analytics.titlePrefix")} <span className="calculator__title-accent">{t("analytics.titleAccent")}</span></h1>

      {isLoading && <p className="history__status" aria-live="polite">{t("analytics.loading")}</p>}
      {error !== null && <p className="warning" role="alert">{error}</p>}

      {!isLoading && error === null && entries.length === 0 && (
        <p className="history__status" aria-live="polite">{t("analytics.empty")}</p>
      )}

      {!isLoading && error === null && entries.length > 0 && (
        <>
          <div className="field analytics__period">
            <label htmlFor="analyticsPeriod">{t("analytics.periodLabel")}</label>
            <Select
              id="analyticsPeriod"
              value={period}
              onChange={value => setPeriod(value as AnalyticsPeriod)}
              options={ANALYTICS_PERIODS.map(p => ({ value: p, label: t(PERIOD_LABEL_KEYS[p]) }))}
            />
          </div>

          {stats.totalVisits === 0 ? (
            <p className="history__status" aria-live="polite">{t("analytics.emptyPeriod")}</p>
          ) : (
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
                  <span className="analytics__kpi-hint">{t("analytics.retentionRateHint")}</span>
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
                  <span className="analytics__kpi-hint">{t("analytics.actualVsComputedRatioHint")}</span>
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

              {isAdmin && stylistStats.length > 0 && (
                <>
                  <h2 className="analytics__section-title analytics__section-title--spaced">{t("analytics.stylistsTitle")}</h2>
                  <ul className="analytics__stylist-list">
                    {stylistStats.map(s => (
                      <li key={s.stylist} className="analytics__stylist-card">
                        <h3 className="analytics__stylist-name">{s.stylist}</h3>
                        {s.lastVisitAt !== null && (
                          <p className="analytics__kpi-hint">{t("analytics.stylistLastVisit", { date: s.lastVisitAt.toLocaleDateString() })}</p>
                        )}
                        <dl className="analytics__stylist-metrics">
                          <div>
                            <dt>{t("analytics.stylistVisits")}</dt>
                            <dd>{s.visits}</dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistUniqueClients")}</dt>
                            <dd>{s.uniqueClients}</dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistReturningClients")}</dt>
                            <dd>{`${s.returningClients} (${Math.round(s.retentionRate * 100)}%)`}</dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistDyeGrams")}</dt>
                            <dd>{Math.round(s.dyeGrams)}</dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistBleachGrams")}</dt>
                            <dd>{Math.round(s.bleachPowderGrams)}</dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistRevenue")}</dt>
                            <dd>
                              {s.revenue.toFixed(2)}
                              {s.visits - s.pricedVisits > 0 && (
                                <span className="analytics__kpi-hint">
                                  {t("analytics.stylistUnpricedVisits", { count: s.visits - s.pricedVisits })}
                                </span>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistProductCost")}</dt>
                            <dd>{s.productCost.toFixed(2)}</dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistGrossProfit")}</dt>
                            <dd>{s.grossProfit !== null ? s.grossProfit.toFixed(2) : "—"}</dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistAverageTicket")}</dt>
                            <dd>{s.averageTicket !== null ? s.averageTicket.toFixed(2) : "—"}</dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistProcessingHours")}</dt>
                            <dd>{(s.processingMinutes / 60).toFixed(1)}</dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistAverageProcessingMinutes")}</dt>
                            <dd>{s.averageProcessingMinutes !== null ? Math.round(s.averageProcessingMinutes) : "—"}</dd>
                          </div>
                          <div>
                            <dt>{t("analytics.stylistTopShade")}</dt>
                            <dd>
                              {s.topShade !== null
                                ? `${formatBrandLineLabel(s.topShade.brandName, s.topShade.line ?? null)} — ${s.topShade.shadeCode}`
                                : "—"}
                            </dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
