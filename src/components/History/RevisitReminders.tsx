import { useTranslation } from "react-i18next";
import type { ClientRevisitPlan } from "../../revisit";
import { getRevisitStatus } from "../../revisit";
import { buildRevisitReminderText, buildWhatsAppReminderUrl, buildTelegramReminderUrl } from "../../reminder";
import type { ClientProfile } from "../../clients";

export interface RevisitRemindersProps {
  revisitPlans: ClientRevisitPlan[];
  profilesByClientKey: Map<string, ClientProfile>;
  nowMs: number;
}

// "Client is due for a revisit" reminders, one per client who has a computed
// ClientRevisitPlan (see planClientRevisits) -- separate from the per-client visit
// history list below it, since a reminder is actionable *now* (nudge the client to
// rebook) rather than something the colorist opens to review later.
export function RevisitReminders({ revisitPlans, profilesByClientKey, nowMs }: RevisitRemindersProps) {
  const { t } = useTranslation();

  if (revisitPlans.length === 0) return null;

  return (
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
  );
}
