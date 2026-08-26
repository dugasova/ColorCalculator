import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildRepeatFormulaRequest, fetchFormulaHistory, type FormulaHistoryEntry } from "../../history";
import { formatSessionText } from "../../formatSession";
import { planClientRevisits, getRevisitStatus } from "../../revisit";
import { usePalette } from "../../palette";
import "../FormulaCalculator/FormulaCalculator.css";
import "./HistoryView.css";

export interface HistoryViewProps {
  onRepeat: (entry: FormulaHistoryEntry) => void;
}

export function HistoryView({ onRepeat }: HistoryViewProps) {
  const { t } = useTranslation();
  const brands = usePalette();
  const [entries, setEntries] = useState<FormulaHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [nowMs] = useState(() => Date.now());
  const revisitPlans = useMemo(() => planClientRevisits(entries), [entries]);

  useEffect(() => {
    fetchFormulaHistory()
      .then(setEntries)
      .catch(() => setError(t('history.loadError')))
      .finally(() => setIsLoading(false));
  }, [t]);

  const filtered = entries.filter(entry =>
    entry.clientName.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="calculator">
      <h1 className="calculator__title">{t('history.titlePrefix')} <span className="calculator__title-accent">{t('history.titleAccent')}</span></h1>

      {!isLoading && error === null && revisitPlans.length > 0 && (
        <section className="history__reminders">
          <h2 className="history__reminders-title">{t('history.remindersTitle')}</h2>
          <ul className="history__reminders-list">
            {revisitPlans.map(plan => {
              const status = getRevisitStatus(plan.recommendedDate, new Date(nowMs));
              const weeks = Math.round(plan.intervalDays / 7);
              return (
                <li key={plan.clientKey} className={`history__reminder history__reminder--${status}`}>
                  <span className="history__reminder-client">{plan.clientName}</span>
                  <span className="history__reminder-detail">
                    {t('history.reminderDetail', { weeks, date: plan.recommendedDate.toLocaleDateString() })}
                  </span>
                  <span className="history__reminder-status">{t(`history.reminderStatus.${status}`)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="field">
        <label htmlFor="historySearch">{t('history.searchLabel')}</label>
        <input
          id="historySearch"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('history.searchPlaceholder')}
        />
      </div>

      {isLoading && <p className="history__status">{t('history.loading')}</p>}
      {error !== null && <p className="warning">{error}</p>}
      {!isLoading && error === null && filtered.length === 0 && (
        <p className="history__status">{t('history.empty')}</p>
      )}

      <ul className="history__list">
        {filtered.map(entry => {
          const repeatRequest = buildRepeatFormulaRequest(entry, brands);
          return (
            <li key={entry.id} className="history__entry">
              <div className="history__entry-header">
                <strong>{entry.clientName}</strong>
                <span className="history__entry-date">
                  {entry.appliedAt ? entry.appliedAt.toDate().toLocaleDateString() : ''}
                </span>
              </div>
              <pre className="history__entry-text">
                {formatSessionText(entry.steps)}
              </pre>
              {(entry.productCost != null || entry.servicePrice != null) && (
                <div className="history__entry-pricing">
                  {entry.productCost != null && <span>{t('results.productCost')}: {entry.productCost.toFixed(2)}</span>}
                  {entry.servicePrice != null && <span>{t('results.servicePrice')}: {entry.servicePrice.toFixed(2)}</span>}
                </div>
              )}
              {entry.note && <p className="history__entry-note">{entry.note}</p>}
              {(entry.patchTestDate || entry.allergyNotes) && (
                <p className="history__entry-patch-test">
                  {entry.patchTestDate && t('history.patchTestOn', { date: new Date(entry.patchTestDate).toLocaleString() })}
                  {entry.patchTestDate && entry.allergyNotes && ' — '}
                  {entry.allergyNotes}
                </p>
              )}
              {(entry.beforePhotoUrl || entry.afterPhotoUrl) && (
                <div className="history__entry-photos">
                  {entry.beforePhotoUrl && <img src={entry.beforePhotoUrl} alt={t('results.beforePhotoLabel')} />}
                  {entry.afterPhotoUrl && <img src={entry.afterPhotoUrl} alt={t('results.afterPhotoLabel')} />}
                </div>
              )}
              <div className="history__entry-footer">
                <span>{t('history.appliedBy', { name: entry.appliedBy })}</span>
                {repeatRequest !== null && (
                  <button type="button" className="button button--secondary history__entry-repeat" onClick={() => onRepeat(entry)}>
                    {t('history.repeat')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
