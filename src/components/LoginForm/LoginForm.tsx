import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";
import { SALON_INVITE_CODE } from "../../inviteCode";
import { LanguageSwitcher } from "../LanguageSwitcher/LanguageSwitcher";
import { PasswordInput } from "../common/PasswordInput";
import "../FormulaCalculator/FormulaCalculator.css";
import "./LoginForm.css";

type Mode = "sign-in" | "sign-up";

export default function LoginForm() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error" | "missing-email">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "sign-up" && inviteCode.trim() !== SALON_INVITE_CODE) {
      setError(t("login.invalidInviteCode"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "sign-in") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await sendEmailVerification(credential.user);
        } catch (err) {
          // Account creation itself already succeeded -- the caller lands on
          // App.tsx's verify-email gate either way, where "resend" retries this.
          console.error("Created account, but sending the verification email failed:", err);
        }
      }
    } catch {
      setError(mode === "sign-in" ? t("login.invalidCredentials") : t("login.signUpFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (email.trim() === "") {
      setResetStatus("missing-email");
      return;
    }
    setResetStatus("sending");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetStatus("sent");
    } catch {
      setResetStatus("error");
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setResetStatus("idle");
  };

  return (
    <div className="calculator">
      <div className="login-form__language">
        <LanguageSwitcher />
      </div>
      <h1 className="calculator__title"><img className="calculator__title-mark" src="/favicon.svg" alt="" width="28" height="28" />{t("app.titlePrefix")}<span className="calculator__title-accent">{t("app.titleAccent")}</span></h1>

      <div className="login-form__tabs">
        <button
          type="button"
          className={clsx("button button--secondary", mode === "sign-in" && "button--active")}
          onClick={() => switchMode("sign-in")}
        >
          {t("login.signIn")}
        </button>
        <button
          type="button"
          className={clsx("button button--secondary", mode === "sign-up" && "button--active")}
          onClick={() => switchMode("sign-up")}
        >
          {t("login.signUp")}
        </button>
      </div>

      <form className="calculator__form login-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">{t("login.email")}</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label htmlFor="password">{t("login.password")}</label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={mode === "sign-up" ? 6 : undefined}
            required
          />
        </div>
        {mode === "sign-in" && (
          <div className="forgot-row">
            <button type="button" className="link-button" onClick={handleForgotPassword} disabled={resetStatus === "sending"}>
              {resetStatus === "sending" ? t("login.forgotPasswordSending") : t("login.forgotPassword")}
            </button>
            {resetStatus === "sent" && <p className="notice" role="status">{t("login.forgotPasswordSent")}</p>}
            {resetStatus === "error" && <p className="warning" role="alert">{t("login.forgotPasswordError")}</p>}
            {resetStatus === "missing-email" && <p className="warning" role="alert">{t("login.forgotPasswordMissingEmail")}</p>}
          </div>
        )}
        {mode === "sign-up" && (
          <div className="field">
            <label htmlFor="inviteCode">{t("login.inviteCode")}</label>
            <input
              id="inviteCode"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              required
            />
          </div>
        )}
        {error !== null && <p className="warning" role="alert">{error}</p>}
        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting
            ? (mode === "sign-in" ? t("login.signingIn") : t("login.creatingAccount"))
            : (mode === "sign-in" ? t("login.signIn") : t("login.createAccount"))}
        </button>
      </form>
    </div>
  );
}
