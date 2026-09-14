import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./PasswordInput.css";

export interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}

// A password `<input>` with a show/hide toggle, shared by LoginForm (sign in/sign up)
// and ChangePasswordModal so both get the same reveal affordance and a11y wiring rather
// than each hand-rolling its own. Visibility is local, per-field state -- switching
// between sign-in/sign-up or opening the modal fresh always starts hidden.
export function PasswordInput({ id, value, onChange, autoComplete, minLength, required }: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        type={visible ? "text" : "password"}
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
      />
      <button
        type="button"
        className="password-field__toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? t("login.hidePassword") : t("login.showPassword")}
        aria-pressed={visible}
      >
        {visible ? (
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 3l14 14M8.3 8.4a2.5 2.5 0 0 0 3.3 3.3M6.2 6.2C4.2 7.5 2.7 9.3 2 10c1.4 2.6 4.6 6 8 6 1.3 0 2.5-.4 3.6-1M13.8 5c1.9 1 3.4 2.9 4.2 5-.5 1-1.3 2.2-2.3 3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M2 10s3.2-6 8-6 8 6 8 6-3.2 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        )}
      </button>
    </div>
  );
}
