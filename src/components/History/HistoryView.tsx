import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildRepeatFormulaRequest, fetchFormulaHistory, type FormulaHistoryEntry } from "../../history";
import { formatSessionText, formatSessionSummary } from "../../formatSession";
import { planClientRevisits, getRevisitStatus, getClientGroupKey, normalizeClientKey } from "../../revisit";
import { fetchClients, type ClientProfile } from "../../clients";
import { usePalette } from "../../palette";
import "../FormulaCalculator/FormulaCalculator.css";
import "./HistoryView.css";

export interface HistoryViewProps {
  onRepeat: (entry: FormulaHistoryEntry) => void;
  isAdmin: boolean;
  currentUserEmail: string;
}

// One client's full visit timeline, grouped from the flat (already date-sorted-desc)
// `entries` fetch -- lets the list read as "N visits for Anna K." instead of Anna's
// visits interleaved with everyone else's. `profile` is the saved-client record (see
// clients.ts) for the signed-in stylist's own book -- an admin browsing another
// stylist's clients simply won't have a match (that profile is private to its owner,
// same boundary firestore.rules enforces), so `profile` stays null there.
interface ClientHistoryGroup {
  key: string;
  displayName: string;
  entries: FormulaHistoryEntry[];
  profile: ClientProfile | null;
}

export function HistoryView({ onRepeat, isAdmin, currentUserEmail }: HistoryViewProps) {
  const { t } = useTranslation();
  const brands = usePalette();
  const [entries, setEntries] = useState<FormulaHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [nowMs] = useState(() => Date.now());
  const [savedClients, setSavedClients] = useState<ClientProfile[]>([]);
  const revisitPlans = useMemo(() => planClientRevisits(entries), [entries]);

  useEffect(() => {
    fetchFormulaHistory({ isAdmin, currentUserEmail })
      .then(setEntries)
      .catch(() => setError(t("history.loadError")))
      .finally(() => setIsLoading(false));
  }, [t, isAdmin, currentUserEmail]);

  useEffect(() => {
    fetchClients(currentUserEmail)
      .then(setSavedClients)
      .catch(err => console.error("Failed to load saved clients:", err));
  }, [currentUserEmail]);

  const filtered = entries.filter(entry =>
    entry.clientName.toLowerCase().includes(search.trim().toLowerCase())
  );

  const groups = useMemo<ClientHistoryGroup[]>(() => {
    const map = new Map<string, ClientHistoryGroup>();
    for (const entry of filtered) {
      const key = getClientGroupKey(entry);
      const existing = map.get(key);
      if (existing !== undefined) {
        existing.entries.push(entry);
        continue;
      }
      // Prefer matching the saved-client profile by the entry's own real clientId --
      // falls back to a normalized-name match only for entries saved before clientId
      // existed, which carries the same "could be the wrong same-named person" risk the
      // rest of this feature exists to avoid, but there's no better signal to use for them.
      const profile = entry.clientId !== null
        ? savedClients.find(c => c.id === entry.clientId) ?? null
        : savedClients.find(c => normalizeClientKey(c.name) === normalizeClientKey(entry.clientName)) ?? null;
      map.set(key, { key, displayName: entry.clientName, entries: [entry], profile });
    }
    return Array.from(map.values());
  }, [filtered, savedClients]);

  return (
    <div className="calculator">
      <h1 className="calculator__title">{t("history.titlePrefix")} <span className="calculator__title-accent">{t("history.titleAccent")}</span></h1>

      {!isLoading && error === null && revisitPlans.length > 0 && (
        <section className="history__reminders">
          <h2 className="history__reminders-title">{t("history.remindersTitle")}</h2>
          <ul className="history__reminders-list">
            {revisitPlans.map(plan => {
              const status = getRevisitStatus(plan.recommendedDate, new Date(nowMs));
              const weeks = Math.round(plan.intervalDays / 7);
              return (
                <li key={plan.clientKey} className={`history__reminder history__reminder--${status}`}>
                  <span className="history__reminder-client">{plan.clientName}</span>
                  <span className="history__reminder-detail">
                    {t("history.reminderDetail", { weeks, date: plan.recommendedDate.toLocaleDateString() })}
                  </span>
                  <span className="history__reminder-status">{t(`history.reminderStatus.${status}`)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="field">
        <label htmlFor="historySearch">{t("history.searchLabel")}</label>
        <input
          id="historySearch"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("history.searchPlaceholder")}
        />
      </div>

      {isLoading && <p className="history__status" aria-live="polite">{t("history.loading")}</p>}
      {error !== null && <p className="warning" role="alert">{error}</p>}
      {!isLoading && error === null && filtered.length === 0 && (
        <p className="history__status" aria-live="polite">{t("history.empty")}</p>
      )}

      <ul className="history__list">
        {groups.map(group => (
          <li key={group.key}>
            <details className="history__client-group" open={groups.length === 1}>
              <summary className="history__client-group-summary">
                <span className="history__client-group-name">{group.displayName}</span>
                <span className="history__client-group-meta">
                  {t("history.visitCount", { count: group.entries.length })}
                  {group.entries[0].appliedAt &&
                    ` · ${t("history.lastVisit", { date: group.entries[0].appliedAt.toDate().toLocaleDateString() })}`}
                </span>
                {group.profile !== null && (group.profile.phone !== "" || group.profile.allergyNotes !== "") && (
                  <span className="history__client-group-contact">
                    {group.profile.phone !== "" && <span>{t("results.clientPhoneLabel")}: {group.profile.phone}</span>}
                    {group.profile.allergyNotes !== "" && <span>{t("results.allergyNotesLabel")}: {group.profile.allergyNotes}</span>}
                  </span>
                )}
              </summary>
              <ul className="history__entry-list">
                {group.entries.map(entry => {
                  const repeatRequest = buildRepeatFormulaRequest(entry, brands);
                  return (
                    <li key={entry.id} className="history__entry">
                      <div className="history__entry-header">
                        <strong>{entry.clientName}</strong>
                        <span className="history__entry-date">
                          {entry.appliedAt ? entry.appliedAt.toDate().toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="history__entry-summary">{formatSessionSummary(entry.steps)}</p>
                      <pre className="history__entry-text">
                        {formatSessionText(entry.steps)}
                      </pre>
                      {(entry.productCost != null || entry.servicePrice != null) && (
                        <div className="history__entry-pricing">
                          {entry.productCost != null && <span>{t("results.productCost")}: {entry.productCost.toFixed(2)}</span>}
                          {entry.servicePrice != null && <span>{t("results.servicePrice")}: {entry.servicePrice.toFixed(2)}</span>}
                        </div>
                      )}
                      {entry.note && <p className="history__entry-note">{entry.note}</p>}
                      {(entry.patchTestDate || entry.allergyNotes) && (
                        <p className="history__entry-patch-test">
                          {entry.patchTestDate && t("history.patchTestOn", { date: new Date(entry.patchTestDate).toLocaleString() })}
                          {entry.patchTestDate && entry.allergyNotes && " — "}
                          {entry.allergyNotes}
                        </p>
                      )}
                      {(entry.beforePhotoUrl || entry.afterPhotoUrl) && (
                        <div className="history__entry-photos">
                          {entry.beforePhotoUrl && <img src={entry.beforePhotoUrl} alt={t("results.beforePhotoLabel")} />}
                          {entry.afterPhotoUrl && <img src={entry.afterPhotoUrl} alt={t("results.afterPhotoLabel")} />}
                        </div>
                      )}
                      <div className="history__entry-footer">
                        <span>{t("history.appliedBy", { name: entry.appliedBy })}</span>
                        {repeatRequest !== null && (
                          <button type="button" className="button button--secondary history__entry-repeat" onClick={() => onRepeat(entry)}>
                            {t("history.repeat")}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
