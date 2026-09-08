import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./Modal.css";

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// A generic accessible dialog, portaled to <body> so it escapes the calculator card's own
// stacking context/overflow instead of being confined to wherever it's mounted in the
// tree. Follows the WAI-ARIA dialog pattern: focus moves to the dialog on open and back to
// whatever triggered it on close, Tab is trapped inside while open, and Escape or a click
// on the backdrop closes it. `.modal` re-declares the same --ink/--muted/--field-bg/etc.
// aliases `.calculator` sets in FormulaCalculator.css -- the portal renders as a sibling of
// `.calculator`, not a descendant, so shared classes like `.field` used inside a modal
// (see SessionDetailsPanel) would otherwise resolve those custom properties to nothing.
export function Modal({ title, onClose, children }: ModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || dialogRef.current === null) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    // The backdrop is a click-to-dismiss surface, not an interactive control in its own
    // right - the real interactive content (the dialog, its close button, its fields)
    // is the child below. Escape already provides the keyboard-equivalent close path
    // (see the effect above), matching how the click-outside-to-close listbox popup in
    // Select.tsx makes the same tradeoff.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef} tabIndex={-1}>
        <div className="modal__header">
          <h2 id={titleId} className="modal__title">{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label={t("common.close")}>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
