import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { SALON_INVITE_CODE } from "../../inviteCode";
import { LanguageSwitcher } from "../LanguageSwitcher/LanguageSwitcher";
import "../FormulaCalculator/FormulaCalculator.css";
import "./LoginForm.css";

type Mode = 'sign-in' | 'sign-up';

export default function LoginForm() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'sign-up' && inviteCode.trim() !== SALON_INVITE_CODE) {
      setError(t('login.invalidInviteCode'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch {
      setError(mode === 'sign-in' ? t('login.invalidCredentials') : t('login.signUpFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
  };

  return (
    <div className="calculator">
      <div className="login-form__language">
        <LanguageSwitcher />
      </div>
      <h1 className="calculator__title">{t('app.titlePrefix')} <span className="calculator__title-accent">{t('app.titleAccent')}</span></h1>

      <div className="login-form__tabs">
        <button
          type="button"
          className={`button button--secondary ${mode === 'sign-in' ? 'button--active' : ''}`}
          onClick={() => switchMode('sign-in')}
        >
          {t('login.signIn')}
        </button>
        <button
          type="button"
          className={`button button--secondary ${mode === 'sign-up' ? 'button--active' : ''}`}
          onClick={() => switchMode('sign-up')}
        >
          {t('login.signUp')}
        </button>
      </div>

      <form className="calculator__form login-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">{t('login.email')}</label>
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
          <label htmlFor="password">{t('login.password')}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'sign-in' ? "current-password" : "new-password"}
            minLength={mode === 'sign-up' ? 6 : undefined}
          />
        </div>
        {mode === 'sign-up' && (
          <div className="field">
            <label htmlFor="inviteCode">{t('login.inviteCode')}</label>
            <input
              id="inviteCode"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              required
            />
          </div>
        )}
        {error !== null && <p className="warning">{error}</p>}
        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting
            ? (mode === 'sign-in' ? t('login.signingIn') : t('login.creatingAccount'))
            : (mode === 'sign-in' ? t('login.signIn') : t('login.createAccount'))}
        </button>
      </form>
    </div>
  );
}
