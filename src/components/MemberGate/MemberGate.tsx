import { useTranslation } from "react-i18next";
import { signOut, type User } from "firebase/auth";
import { auth } from "../../firebase";
import { PaletteProvider } from "../../PaletteContext";
import { AuthenticatedApp } from "../../AuthenticatedApp";
import { useMembership } from "../../roles";
import { LanguageSwitcher } from "../LanguageSwitcher/LanguageSwitcher";
import "../FormulaCalculator/FormulaCalculator.css";
import "../LoginForm/LoginForm.css";
import "../VerifyEmail/VerifyEmailScreen.css";

// A verified account that hasn't been provisioned with a `users/{uid}` document yet
// (see src/roles.ts and firestore.rules' `isMember()`) can't read or write any salon
// data. Rather than let AuthenticatedApp's subscriptions all fail with permission
// errors, this screen explains the wait and offers a manual retry.
function PendingAccessScreen({ user }: { user: User }) {
  const { t } = useTranslation();

  return (
    <div className="calculator">
      <div className="login-form__language">
        <LanguageSwitcher />
      </div>
      <h1 className="calculator__title"><img className="calculator__title-mark" src="/favicon.svg" alt="" width="28" height="28" />{t("app.titlePrefix")}<span className="calculator__title-accent">{t("app.titleAccent")}</span></h1>
      <p className="calculator__subtitle">{t("pendingAccess.body", { email: user.email })}</p>

      <div className="verify-email__actions">
        <button type="button" className="button" onClick={() => window.location.reload()}>
          {t("pendingAccess.retry")}
        </button>
        <button type="button" className="button button--secondary" onClick={() => signOut(auth)}>
          {t("account.signOut")}
        </button>
      </div>
    </div>
  );
}

export function MemberGate({ user }: { user: User }) {
  const membership = useMembership(user.uid);

  if (membership === "loading") {
    return null;
  }

  if (membership === "pending") {
    return <PendingAccessScreen user={user} />;
  }

  return (
    <PaletteProvider>
      <AuthenticatedApp user={user} isAdmin={membership === "admin"} />
    </PaletteProvider>
  );
}
