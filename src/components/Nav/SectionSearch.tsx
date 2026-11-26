import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { NavIcon, type AppView } from "./Nav";
import { navItems, NAV_GROUP } from "./navItems";
import "./Nav.css";

export interface SectionSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewChange: (view: AppView) => void;
  isAdmin?: boolean;
}

// "Go to section…": a search box over every view, opened from the desktop top bar or with
// Ctrl K / Cmd K anywhere. Typing filters by the section's name or its group; arrows move,
// Enter opens, Escape closes. Mounted always, so the shortcut works on every screen.
export function SectionSearch({ open, onOpenChange, onViewChange, isAdmin = false }: SectionSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputId = useId();
  const listId = useId();
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Back to whatever had focus before the search opened.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      inputRef.current?.focus();
      return;
    }
    returnFocusRef.current?.focus();
    returnFocusRef.current = null;
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const results = navItems(isAdmin).filter(v => {
    if (q === "") return true;
    return t(`nav.${v}`).toLowerCase().includes(q) || t(`nav.groups.${NAV_GROUP[v]}`).toLowerCase().includes(q);
  });
  const active = Math.min(highlighted, Math.max(results.length - 1, 0));

  const close = () => {
    setQuery("");
    setHighlighted(0);
    onOpenChange(false);
  };
  const go = (view: AppView) => {
    close();
    onViewChange(view);
  };

  return (
    <div className="section-search">
      <button
        type="button"
        className="section-search__backdrop"
        tabIndex={-1}
        aria-label={t("common.close")}
        onClick={close}
      />
      <div className="section-search__dialog" role="dialog" aria-modal="true" aria-label={t("nav.search")}>
        <div className="section-search__field">
          <svg
            className="section-search__glyph"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M11 4a7 7 0 1 1 0 14a7 7 0 1 1 0-14zM20 20l-4-4" />
          </svg>
          <label htmlFor={inputId} className="sr-only">
            {t("nav.searchLabel")}
          </label>
          <input
            id={inputId}
            className="section-search__input"
            ref={inputRef}
            autoComplete="off"
            aria-controls={listId}
            placeholder={t("nav.searchPlaceholder")}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setHighlighted(0);
            }}
            onKeyDown={e => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlighted((active + 1) % Math.max(results.length, 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlighted((active - 1 + results.length) % Math.max(results.length, 1));
              } else if (e.key === "Enter" && results.length > 0) {
                e.preventDefault();
                go(results[active]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                close();
              }
            }}
          />
          <kbd className="section-search__kbd">Esc</kbd>
        </div>
        <ul className="section-search__list" id={listId}>
          {results.map((view, index) => (
            <li key={view}>
              <button
                type="button"
                className={clsx("section-search__option", index === active && "section-search__option--active")}
                onMouseEnter={() => setHighlighted(index)}
                onFocus={() => setHighlighted(index)}
                onClick={() => go(view)}
              >
                <NavIcon view={view} className="section-search__icon" />
                <span className="section-search__name">{t(`nav.${view}`)}</span>
                <span className="section-search__group">{t(`nav.groups.${NAV_GROUP[view]}`)}</span>
              </button>
            </li>
          ))}
        </ul>
        {results.length === 0 && <p className="section-search__empty">{t("nav.searchEmpty")}</p>}
      </div>
    </div>
  );
}
