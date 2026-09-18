import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./AccountMenu.css";

export interface AccountMenuProps {
  email: string | null;
  onChangePassword: () => void;
  onSignOut: () => void;
}

// Collapses the signed-in email plus the "Change password"/"Sign out" actions behind a
// single icon button -- on a phone-width .app-topbar (see index.css) those three used to
// sit inline next to the nav tabs and the theme/language switchers, which is what made
// the topbar feel crowded on tablet/phone. Same disclosure pattern as Select.tsx's popup
// (trigger + absolutely-positioned panel, closed on click-outside or Escape) but simpler:
// this is a handful of plain buttons, not a listbox, so it skips Select's roving-focus/
// typeahead machinery entirely.
export function AccountMenu({ email, onChangePassword, onSignOut }: AccountMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu__trigger button button--secondary"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={popupId}
        aria-label={t("account.menuLabel")}
        title={t("account.menuLabel")}
        ref={triggerRef}
      >
        <svg className="account-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
        </svg>
      </button>
      {open && (
        <div className="account-menu__popup" id={popupId}>
          {email !== null && <p className="account-menu__email">{email}</p>}
          <button
            type="button"
            className="button button--secondary"
            onClick={() => { setOpen(false); onChangePassword(); }}
          >
            {t("account.changePassword")}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => { setOpen(false); onSignOut(); }}
          >
            {t("account.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
