import { useState, type ReactNode } from "react";
import clsx from "clsx";
import "./CollapsibleSection.css";

export interface CollapsibleSectionProps {
  // Stable key, also used as the DOM id prefix for the toggle/panel pair and as part of
  // the localStorage key below -- callers pass a short, per-section constant (e.g.
  // "shades"), not anything derived from data.
  id: string;
  title: ReactNode;
  defaultOpen: boolean;
  children: ReactNode;
  className?: string;
  // Keeps the panel open (and the toggle disabled) regardless of the stored/default
  // open state -- for a caller that needs the section visible because it holds an
  // active selection (e.g. FormulaCalculator's "Advanced" wrapper, forced open while a
  // repeat/favorite request has filled in a blend or additional shade).
  forceOpen?: boolean;
}

const hasLocalStorage = typeof localStorage !== "undefined";

function storageKey(id: string): string {
  return `formulist.collapsible.${id}`;
}

// Wraps a section body so it can be hidden when not in use -- Palette admin's add
// brand/shade, pricing, shades and stock sections, plus FormulaCalculator's "Advanced"
// group. State persists per device (localStorage), same "if it's unavailable, just fall
// back" courtesy as theme.ts's hasLocalStorage guard. Renders with `hidden` rather than
// unmounting: callers hold unsaved local state (drafts, pending ids, form fields) that
// must survive a collapse/expand round trip.
export function CollapsibleSection({ id, title, defaultOpen, children, className, forceOpen }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(() => {
    const stored = hasLocalStorage ? localStorage.getItem(storageKey(id)) : null;
    if (stored === "open") return true;
    if (stored === "closed") return false;
    return defaultOpen;
  });

  const isOpen = open || forceOpen === true;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (hasLocalStorage) {
      localStorage.setItem(storageKey(id), next ? "open" : "closed");
    }
  };

  const panelId = `${id}-panel`;

  return (
    <section className={clsx("collapsible-section", className)}>
      <h2 className="results__section-heading">
        <button
          type="button"
          className="collapsible-section__toggle"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={toggle}
          disabled={forceOpen === true}
        >
          <span>{title}</span>
          <svg className="collapsible-section__chevron" viewBox="0 0 12 8" fill="none" aria-hidden="true">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h2>
      <div id={panelId} hidden={!isOpen}>{children}</div>
    </section>
  );
}
