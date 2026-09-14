import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FirebaseError } from "firebase/app";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
  type User,
} from "firebase/auth";
import { auth } from "../../firebase";
import { Modal } from "../common/Modal";
import { PasswordInput } from "../common/PasswordInput";
import "../FormulaCalculator/FormulaCalculator.css";
import "./ChangePasswordModal.css";

export interface ChangePasswordModalProps {
  user: User;
  onClose: () => void;
}

type ErrorKind = "mismatch" | "wrongPassword" | "weakPassword" | "generic";

// Firebase requires a recent sign-in for a security-sensitive op like a password
// change -- rather than surface that as a confusing "please sign in again" detour,
// this re-authenticates with the current password the user just typed and then
// immediately applies the new one, so the whole flow stays inside one modal.
export function ChangePasswordModal({ user, onClose }: ChangePasswordModalProps) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<ErrorKind | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [resetEmailStatus, setResetEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("mismatch");
      return;
    }
    if (user.email === null) {
      setError("generic");
      return;
    }

    setIsSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setIsDone(true);
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : null;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("wrongPassword");
      } else if (code === "auth/weak-password") {
        setError("weakPassword");
      } else {
        setError("generic");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (user.email === null) return;
    setResetEmailStatus("sending");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailStatus("sent");
    } catch {
      setResetEmailStatus("error");
    }
  };

  return (
    <Modal title={t("account.changePassword")} onClose={onClose}>
      {isDone ? (
        <div className="change-password__done">
          <p className="notice" role="status">{t("account.changePasswordSuccess")}</p>
          <button type="button" className="button" onClick={onClose}>{t("common.close")}</button>
        </div>
      ) : (
        <form className="calculator__form change-password-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="current-password">{t("account.currentPassword")}</label>
            <PasswordInput
              id="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="forgot-row">
            <button type="button" className="link-button" onClick={handleSendResetEmail} disabled={resetEmailStatus === "sending" || user.email === null}>
              {resetEmailStatus === "sending" ? t("account.forgotCurrentPasswordSending") : t("account.forgotCurrentPassword")}
            </button>
            {resetEmailStatus === "sent" && (
              <p className="notice" role="status">{t("account.forgotCurrentPasswordSent", { email: user.email })}</p>
            )}
            {resetEmailStatus === "error" && <p className="warning" role="alert">{t("account.forgotCurrentPasswordError")}</p>}
          </div>
          <div className="field">
            <label htmlFor="new-password">{t("account.newPassword")}</label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirm-password">{t("account.confirmPassword")}</label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          {error === "mismatch" && <p className="warning" role="alert">{t("account.passwordMismatch")}</p>}
          {error === "wrongPassword" && <p className="warning" role="alert">{t("account.wrongCurrentPassword")}</p>}
          {error === "weakPassword" && <p className="warning" role="alert">{t("account.weakPassword")}</p>}
          {error === "generic" && <p className="warning" role="alert">{t("account.changePasswordFailed")}</p>}
          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? t("account.changingPassword") : t("account.changePasswordSubmit")}
          </button>
        </form>
      )}
    </Modal>
  );
}
