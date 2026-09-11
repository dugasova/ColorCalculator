import { useState } from "react";
import { useTranslation } from "react-i18next";
import { sendEmailVerification, reload, signOut, type User } from "firebase/auth";
import { auth } from "../../firebase";
import { LanguageSwitcher } from "../LanguageSwitcher/LanguageSwitcher";
import "../FormulaCalculator/FormulaCalculator.css";
import "../LoginForm/LoginForm.css";
import "./VerifyEmailScreen.css";

export interface VerifyEmailScreenProps {
  user: User;
  // Called once `reload(user)` confirms the address is now verified -- App.tsx uses
  // this to re-render past this gate rather than owning any polling/navigation itself.
  onRefreshed: () => void;
}

type ResendStatus = "idle" | "sending" | "sent" | "error";
type CheckStatus = "idle" | "checking" | "stillUnverified";

// Every salon-data read/write requires a verified email (see firestore.rules'
// `isSignedIn()`), so a freshly created or not-yet-verified account lands here instead
// of AuthenticatedApp until it clears that gate.
export function VerifyEmailScreen({ user, onRefreshed }: VerifyEmailScreenProps) {
  const { t } = useTranslation();
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");
  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");

  const handleResend = async () => {
    setResendStatus("sending");
    try {
      await sendEmailVerification(user);
      setResendStatus("sent");
    } catch {
      setResendStatus("error");
    }
  };

  const handleCheck = async () => {
    setCheckStatus("checking");
    await reload(user);
    if (user.emailVerified) {
      onRefreshed();
    } else {
      setCheckStatus("stillUnverified");
    }
  };

  return (
    <div className="calculator">
      <div className="login-form__language">
        <LanguageSwitcher />
      </div>
      <h1 className="calculator__title"><img className="calculator__title-mark" src="/favicon.svg" alt="" width="28" height="28" />{t("app.titlePrefix")}<span className="calculator__title-accent">{t("app.titleAccent")}</span></h1>
      <p className="calculator__subtitle">{t("verifyEmail.body", { email: user.email })}</p>

      {resendStatus === "sent" && <p className="notice" role="status">{t("verifyEmail.resent")}</p>}
      {resendStatus === "error" && <p className="warning" role="alert">{t("verifyEmail.resendFailed")}</p>}
      {checkStatus === "stillUnverified" && <p className="warning" role="alert">{t("verifyEmail.stillUnverified")}</p>}

      <div className="verify-email__actions">
        <button type="button" className="button" onClick={handleCheck} disabled={checkStatus === "checking"}>
          {checkStatus === "checking" ? t("verifyEmail.checking") : t("verifyEmail.iVerified")}
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={handleResend}
          disabled={resendStatus === "sending"}
        >
          {resendStatus === "sending" ? t("verifyEmail.sending") : t("verifyEmail.resend")}
        </button>
        <button type="button" className="button button--secondary" onClick={() => signOut(auth)}>
          {t("account.signOut")}
        </button>
      </div>
    </div>
  );
}
