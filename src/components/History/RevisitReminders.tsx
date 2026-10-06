import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ClientRevisitPlan, RevisitStatus } from "../../revisit";
import { getRevisitStatus } from "../../revisit";
import { buildRevisitReminderText, buildWhatsAppReminderUrl, buildTelegramReminderUrl } from "../../reminder";
import type { ClientProfile } from "../../clients";

export interface RevisitRemindersProps {
  revisitPlans: ClientRevisitPlan[];
  profilesByClientKey: Map<string, ClientProfile>;
  nowMs: number;
}

// Rows shown before the "Show all" toggle kicks in. revisitPlans is sorted most-urgent
// first (see planClientRevisits), so the collapsed view is already the 5 reminders that
// matter most.
const COLLAPSED_LIMIT = 5;

const STATUS_ORDER: RevisitStatus[] = ["overdue", "due-soon", "upcoming"];

// "Client is due for a revisit" reminders, one per client who has a computed
// ClientRevisitPlan (see planClientRevisits) -- separate from the per-client visit
// history list below it, since a reminder is actionable *now* (nudge the client to
// rebook) rather than something the colorist opens to review later.
export function RevisitReminders({ revisitPlans, profilesByClientKey, nowMs }: RevisitRemindersProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  if (revisitPlans.length === 0) return null;

  const now = new Date(nowMs);
  const rows = revisitPlans.map(plan => ({ plan, status: getRevisitStatus(plan.recommendedDate, now) }));
  const counts = STATUS_ORDER.map(status => ({ status, count: rows.filter(r => r.status === status).length })).filter(c => c.count > 0);
  const isCollapsible = rows.length > COLLAPSED_LIMIT;
  const visibleRows = showAll || !isCollapsible ? rows : rows.slice(0, COLLAPSED_LIMIT);

  return (
    <section className="history__reminders">
      <div className="history__reminders-header">
        <h2 className="history__reminders-title">{t("history.remindersTitle")}</h2>
        <p className="history__reminders-summary">
          {counts.map(({ status, count }) => (
            <span key={status} className={`history__reminders-count history__reminders-count--${status}`}>
              {t(`history.reminderSummary.${status}`, { count })}
            </span>
          ))}
        </p>
      </div>
      <ul className="history__reminders-list" id="historyRemindersList">
        {visibleRows.map(({ plan, status }) => {
          const weeks = Math.round(plan.intervalDays / 7);
          const phone = profilesByClientKey.get(plan.clientKey)?.phone ?? null;
          const reminderText = buildRevisitReminderText(plan);
          const reason = plan.intervalBasis === "history"
            ? t("history.reminderReasonHistory")
            : t(`history.reminderReason.${plan.driver}`);
          // drivers are ascending, so the first one further out than the chosen interval is
          // the next service due after this one (e.g. toner refresh now, full balayage later).
          const nextDriver = plan.intervalBasis === "service"
            ? plan.drivers.find(d => d.intervalDays > plan.intervalDays)
            : undefined;
          const reasonText = nextDriver === undefined
            ? reason
            : `${reason} · ${t("history.reminderNextService", { reason: t(`history.reminderReason.${nextDriver.kind}`), weeks: Math.round(nextDriver.intervalDays / 7) })}`;
          return (
            <li key={plan.clientKey} className={`history__reminder history__reminder--${status}`}>
              <span className="history__reminder-client">{plan.clientName}</span>
              <span className="history__reminder-detail">
                {t("history.reminderDetail", { weeks, date: plan.recommendedDate.toLocaleDateString() })}
              </span>
              <span className="history__reminder-status">{t(`history.reminderStatus.${status}`)}</span>
              <span className="history__reminder-reason">{reasonText}</span>
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
      {isCollapsible && (
        <button
          type="button"
          className="button button--secondary history__reminders-toggle"
          aria-expanded={showAll}
          aria-controls="historyRemindersList"
          onClick={() => setShowAll(value => !value)}
        >
          {showAll ? t("history.remindersShowLess") : t("history.remindersShowAll", { count: rows.length })}
        </button>
      )}
    </section>
  );
}
