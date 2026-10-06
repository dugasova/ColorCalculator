import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { NavIcon, type NavProps } from "./Nav";
import { navItems, MOBILE_PRIMARY_VIEWS } from "./navItems";
import "./Nav.css";

// Phone-width (<=767px, see Nav.css) replacement for the top .app-nav tab strip: a fixed
// bottom bar with one tab per MOBILE_PRIMARY_VIEWS entry plus a "More" trigger covering
// every other view (and, for an admin, Palette/Orders) behind a popup -- a flat row of
// eleven tabs doesn't fit a phone's width, but a stylist's day-to-day four do.
export function BottomNav({ view, onViewChange, isAdmin = false }: NavProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  const moreViews = navItems(isAdmin).filter(v => !MOBILE_PRIMARY_VIEWS.includes(v));
  const moreActive = moreViews.includes(view);

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
    <nav className="bottom-nav" aria-label={t("nav.ariaLabel")}>
      {MOBILE_PRIMARY_VIEWS.map(item => (
        <button
          key={item}
          type="button"
          aria-current={view === item ? "page" : undefined}
          className={clsx("bottom-nav__item", view === item && "bottom-nav__item--active")}
          onClick={() => onViewChange(item)}
        >
          <NavIcon view={item} className="bottom-nav__icon" />
          <span>{t(`nav.${item}`)}</span>
        </button>
      ))}
      <div className="bottom-nav__more" ref={rootRef}>
        <button
          type="button"
          className={clsx("bottom-nav__item", moreActive && "bottom-nav__item--active")}
          onClick={() => setOpen(o => !o)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={popupId}
          ref={triggerRef}
        >
          <svg className="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
          </svg>
          <span>{moreActive ? t(`nav.${view}`) : t("nav.more")}</span>
        </button>
        {open && (
          <div className="bottom-nav__popup" id={popupId}>
            {moreViews.map(item => (
              <button
                key={item}
                type="button"
                aria-current={view === item ? "page" : undefined}
                className={clsx("bottom-nav__popup-item", view === item && "bottom-nav__popup-item--active")}
                onClick={() => { setOpen(false); onViewChange(item); }}
              >
                <NavIcon view={item} className="bottom-nav__icon" />
                <span>{t(`nav.${item}`)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
