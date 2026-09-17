import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildRepeatFormulaRequest, type FormulaHistoryEntry } from "../../history";
import { formatSessionText, formatSessionSummary } from "../../formatSession";
import { planClientRevisits, getRevisitStatus } from "../../revisit";
import { buildRevisitReminderText, buildWhatsAppReminderUrl, buildTelegramReminderUrl } from "../../reminder";
import { usePalette } from "../../palette";
import { useActualGramsEditor } from "./useActualGramsEditor";
import { useHistoryData } from "./useHistoryData";
import { Modal } from "../common/Modal";
import "../FormulaCalculator/FormulaCalculator.css";
import "./HistoryView.css";

export interface HistoryViewProps {
  onRepeat: (entry: FormulaHistoryEntry) => void;
  isAdmin: boolean;
  currentUserEmail: string;
}

function FormattedSessionText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <pre className="history__entry-text">
      {lines.map((line, i) => {
        const isMix = /^(Mix|Суміш|Микс)/.test(line) || /^\d+(\.\d+)?\s*(g|г)\s+(bleach|освітлювального|обесцвечивающего)/.test(line);
        return (
          <span key={i}>
            {isMix ? <strong className="history__entry-mix">{line}</strong> : line}
            {i < lines.length - 1 && "\n"}
          </span>
        );
      })}
    </pre>
  );
}

export function HistoryView({ onRepeat, isAdmin, currentUserEmail }: HistoryViewProps) {
  const { t } = useTranslation();
  const brands = usePalette();
  const [search, setSearch] = useState("");
  const [nowMs] = useState(() => Date.now());
  // The one client card currently expanded into a modal -- null means every card is
  // collapsed. A client's full visit list (formula, pricing, photos, ...) needs real
  // screen space to stay readable, so it opens in a Modal instead of an inline accordion.
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const { entries, setEntries, isLoading, error, filtered, groups, profilesByClientKey } =
    useHistoryData({ isAdmin, currentUserEmail, search });
  const { gramsDrafts, savingGramsKey, gramsError, handleActualGramsChange, handleActualGramsBlur } =
    useActualGramsEditor(setEntries);
  const revisitPlans = useMemo(() => planClientRevisits(entries), [entries]);

  const openGroup = groups.find(g => g.key === openGroupKey) ?? null;

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
              const phone = profilesByClientKey.get(plan.clientKey)?.phone ?? null;
              const reminderText = buildRevisitReminderText(plan);
              return (
                <li key={plan.clientKey} className={`history__reminder history__reminder--${status}`}>
                  <span className="history__reminder-client">{plan.clientName}</span>
                  <span className="history__reminder-detail">
                    {t("history.reminderDetail", { weeks, date: plan.recommendedDate.toLocaleDateString() })}
                  </span>
                  <span className="history__reminder-status">{t(`history.reminderStatus.${status}`)}</span>
                  <span className="history__reminder-actions">
                    <button
                      type="button"
                      className="button button--share button--whatsapp history__reminder-remind"
                      onClick={() => window.open(buildWhatsAppReminderUrl(phone, reminderText), "_blank", "noopener,noreferrer")}
                    >
                      {t("history.remindWhatsApp")}
                    </button>
                    <button
                      type="button"
                      className="button button--share button--telegram history__reminder-remind"
                      onClick={() => window.open(buildTelegramReminderUrl(reminderText), "_blank", "noopener,noreferrer")}
                    >
                      {t("history.remindTelegram")}
                    </button>
                  </span>
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
      {gramsError !== null && <p className="warning" role="alert">{gramsError}</p>}
      {!isLoading && error === null && filtered.length === 0 && (
        <p className="history__status" aria-live="polite">{t("history.empty")}</p>
      )}

      <ul className="history__list">
        {groups.map(group => (
          <li key={group.key}>
            <div className="history__client-group">
              <button
                type="button"
                className="history__client-group-summary"
                onClick={() => setOpenGroupKey(group.key)}
                aria-haspopup="dialog"
              >
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
              </button>
            </div>
          </li>
        ))}
      </ul>

      {openGroup !== null && (
        <Modal title={openGroup.displayName} onClose={() => setOpenGroupKey(null)} size="large">
          <ul className="history__entry-list">
            {openGroup.entries.map(entry => {
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
                  <FormattedSessionText text={formatSessionText(entry.steps)} />
                  {entry.steps.map((step, index) => {
                    if (step.kind !== "color") return null;
                    const key = `${entry.id}::${index}`;
                    const computed = step.result.grams?.colorGrams ?? null;
                    const persisted = typeof step.actualColorGrams === "number" ? String(step.actualColorGrams) : "";
                    return (
                      <div className="history__entry-actual" key={key}>
                        <label htmlFor={`actualGrams-${key}`}>
                          {t("history.actualColorGrams", { code: step.targetShade.code })}
                        </label>
                        <input
                          id={`actualGrams-${key}`}
                          type="number"
                          min={0}
                          step={1}
                          value={gramsDrafts[key] ?? persisted}
                          disabled={savingGramsKey === key}
                          onChange={e => handleActualGramsChange(key, e.target.value)}
                          onBlur={() => { void handleActualGramsBlur(entry, index); }}
                        />
                        {computed !== null && (
                          <span className="history__entry-actual-hint">
                            {t("history.computedColorGrams", { grams: computed.toFixed(1) })}
                          </span>
                        )}
                      </div>
                    );
                  })}
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
        </Modal>
      )}
    </div>
  );
}
