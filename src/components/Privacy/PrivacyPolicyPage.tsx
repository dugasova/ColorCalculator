import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../FormulaCalculator/FormulaCalculator.css";

// Set per deployment via `.env`'s VITE_FEEDBACK_URL (see .env.example and
// AccountMenu.tsx's identical constant) -- e.g. the salon owner's Telegram or a mailto:
// link. Left unset, the contact section falls back to plain instruction text instead of
// a dead link.
const FEEDBACK_URL: string | undefined = import.meta.env.VITE_FEEDBACK_URL;

// Reached at `/privacy`, outside the signed-in app shell (see App.tsx, which renders
// this before checking auth state at all) -- a privacy policy has to be readable by
// someone who hasn't signed up yet (e.g. a link from a Google Play listing or the
// sign-up form), not just by an already-approved salon member. Static content only;
// nothing here reads live user/account data.
export function PrivacyPolicyPage() {
  const { t } = useTranslation();

  return (
    <div className="calculator">
      <h1 className="calculator__title">{t("privacy.title")}</h1>
      <p className="calculator__subtitle">{t("privacy.lastUpdated")}</p>
      <p>{t("privacy.intro")}</p>

      <h2 className="results__section-heading">{t("privacy.accountTitle")}</h2>
      <p>{t("privacy.accountBody")}</p>

      <h2 className="results__section-heading">{t("privacy.salonTitle")}</h2>
      <p>{t("privacy.salonBody")}</p>

      <h2 className="results__section-heading">{t("privacy.monitoringTitle")}</h2>
      <p>{t("privacy.monitoringBody")}</p>

      <h2 className="results__section-heading">{t("privacy.analyticsTitle")}</h2>
      <p>{t("privacy.analyticsBody")}</p>

      <h2 className="results__section-heading">{t("privacy.thirdPartiesTitle")}</h2>
      <p>{t("privacy.thirdPartiesBody")}</p>

      <h2 className="results__section-heading">{t("privacy.retentionTitle")}</h2>
      <p>{t("privacy.retentionBody")}</p>

      <h2 className="results__section-heading">{t("privacy.contactTitle")}</h2>
      {FEEDBACK_URL !== undefined ? (
        <p><a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">{t("privacy.contactLinkLabel")}</a></p>
      ) : (
        <p>{t("privacy.contactBody")}</p>
      )}

      <Link className="button button--secondary" to="/">{t("brandNotes.backToApp")}</Link>
    </div>
  );
}
