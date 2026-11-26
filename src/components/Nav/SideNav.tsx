import { useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { NavIcon, type AppView, type NavProps } from "./Nav";
import { navItems, NAV_GROUP } from "./navItems";
import "./Nav.css";

const COLLAPSED_KEY = "formulist.sideNavCollapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export interface SideNavProps extends NavProps {
  onBrandClick: () => void;
}

// Desktop-width (>=1024px, see Nav.css) navigation: a panel down the left edge listing
// every view, admin ones under their own heading, so the top bar stays one thin row. It
// collapses to an icon rail; the choice is remembered in this browser.
export function SideNav({ view, onViewChange, isAdmin = false, onBrandClick }: SideNavProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const views = navItems(isAdmin);
  const mainViews = views.filter(v => NAV_GROUP[v] !== "admin");
  const adminViews = views.filter(v => NAV_GROUP[v] === "admin");

  const toggle = () => {
    setCollapsed(c => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Private mode or storage full: the panel still toggles for this visit.
      }
      return next;
    });
  };

  const renderItem = (item: AppView) => (
    <button
      key={item}
      type="button"
      role="tab"
      aria-selected={view === item}
      aria-label={t(`nav.${item}`)}
      title={collapsed ? t(`nav.${item}`) : undefined}
      className={clsx("side-nav__item", view === item && "side-nav__item--active")}
      onClick={() => onViewChange(item)}
    >
      <NavIcon view={item} className="side-nav__icon" />
      <span className="side-nav__label">{t(`nav.${item}`)}</span>
    </button>
  );

  return (
    <nav className={clsx("side-nav", collapsed && "side-nav--collapsed")} aria-label={t("nav.ariaLabel")}>
      <button type="button" className="side-nav__brand" onClick={onBrandClick} aria-label={t("nav.calculator")}>
        <img className="side-nav__mark" src="/favicon.svg" alt="" width="26" height="26" />
        <span className="side-nav__label">
          {t("app.titlePrefix")}
          <em>{t("app.titleAccent")}</em>
        </span>
      </button>
      <div className="side-nav__list" role="tablist" aria-orientation="vertical" aria-label={t("nav.ariaLabel")}>
        {mainViews.map(renderItem)}
      </div>
      {adminViews.length > 0 && (
        <div className="side-nav__section">
          <p className="side-nav__heading">{t("nav.groups.admin")}</p>
          <div className="side-nav__list" role="tablist" aria-orientation="vertical" aria-label={t("nav.groups.admin")}>
            {adminViews.map(renderItem)}
          </div>
        </div>
      )}
      <button
        type="button"
        className="side-nav__item side-nav__toggle"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
        title={collapsed ? t("nav.expandMenu") : undefined}
      >
        <svg
          className="side-nav__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={collapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
        </svg>
        <span className="side-nav__label">{t("nav.collapseMenu")}</span>
      </button>
    </nav>
  );
}
