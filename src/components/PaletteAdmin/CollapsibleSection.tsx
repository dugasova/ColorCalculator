import { useState, type ReactNode } from "react";

export interface CollapsibleSectionProps {
  // Stable key, also used as the DOM id prefix for the toggle/panel pair and as part of
  // the localStorage key below -- callers pass a short, per-section constant (e.g.
  // "shades"), not anything derived from data.
  id: string;
  title: ReactNode;
  defaultOpen: boolean;
  children: ReactNode;
}

const hasLocalStorage = typeof localStorage !== "undefined";

function storageKey(id: string): string {
  return `formulist.paletteSection.${id}`;
}

// Every Palette admin section (add brand/shade, pricing, shades, stock) wraps its body
// in this so an admin can hide the forms they aren't using right now -- state persists
// per device (localStorage), same "if it's unavailable, just fall back" courtesy as
// theme.ts's hasLocalStorage guard. Renders with `hidden` rather than unmounting: the
// forms and BrandStockList hold unsaved local state (drafts, pending ids) that must
// survive a collapse/expand round trip.
export function CollapsibleSection({ id, title, defaultOpen, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(() => {
    const stored = hasLocalStorage ? localStorage.getItem(storageKey(id)) : null;
    if (stored === "open") return true;
    if (stored === "closed") return false;
    return defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (hasLocalStorage) {
      localStorage.setItem(storageKey(id), next ? "open" : "closed");
    }
  };

  const panelId = `${id}-panel`;

  return (
    <section className="palette-admin__section">
      <h2 className="results__section-heading">
        <button
          type="button"
          className="palette-admin__section-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          <span>{title}</span>
          <svg className="palette-admin__section-chevron" viewBox="0 0 12 8" fill="none" aria-hidden="true">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h2>
      <div id={panelId} hidden={!open}>{children}</div>
    </section>
  );
}
