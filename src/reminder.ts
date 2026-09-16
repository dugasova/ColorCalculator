import i18n from "./i18n";
import type { ClientRevisitPlan } from "./revisit";

// wa.me needs a bare international number (digits only, no "+"/spaces/parens). Anything
// shorter than this is punctuation or a partial note, not a dialable number -- fall back
// to WhatsApp's own recipient picker instead of building a link that resolves to nobody.
const MIN_PHONE_DIGITS = 8;

export function toWhatsAppPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= MIN_PHONE_DIGITS ? digits : null;
}

export function buildRevisitReminderText(plan: Pick<ClientRevisitPlan, "clientName" | "recommendedDate">): string {
  return i18n.t("history.remindMessage", {
    name: plan.clientName,
    date: plan.recommendedDate.toLocaleDateString(),
  });
}

export function buildWhatsAppReminderUrl(phone: string | null, text: string): string {
  const digits = phone !== null ? toWhatsAppPhone(phone) : null;
  return `https://wa.me/${digits ?? ""}?text=${encodeURIComponent(text)}`;
}

// t.me has no phone-addressable deep link (only `t.me/<username>`, and ClientProfile
// stores no username), so the Telegram path is the same share/contact picker
// SessionDetailsPanel uses: a non-empty `url` carrying the message text, because an empty
// `url` makes Telegram bounce to telegram.org instead of opening the picker.
export function buildTelegramReminderUrl(text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(text)}`;
}
