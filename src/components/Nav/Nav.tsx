import type { ReactNode } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import "./Nav.css";

export type AppView = 'calculator' | 'correction' | 'history' | 'bleach' | 'complex' | 'analytics' | 'palette';

const ICON_PATHS: Record<AppView, ReactNode> = {
  calculator: (
    <>
      <rect x="4.5" y="2.5" width="15" height="19" rx="2.5" />
      <line x1="7.5" y1="6.5" x2="16.5" y2="6.5" />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  correction: (
    <path d="M12 2.5s7 8.2 7 12.7a7 7 0 1 1-14 0c0-4.5 7-12.7 7-12.7z" />
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </>
  ),
  bleach: (
    <>
      <path d="M9.5 2.5h5M10 2.5v6.2l-5 9.3a2 2 0 0 0 1.8 2.9h10.4a2 2 0 0 0 1.8-2.9l-5-9.3V2.5" />
      <line x1="7.7" y1="15" x2="16.3" y2="15" />
    </>
  ),
  complex: (
    <>
      <path d="M9.5 2.5h5M10 2.5v6.2l-5 9.3a2 2 0 0 0 1.8 2.9h10.4a2 2 0 0 0 1.8-2.9l-5-9.3V2.5" />
      <line x1="7.7" y1="15" x2="16.3" y2="15" />
      <path d="M4.5 20.5h4.2M15.3 20.5h4.2" strokeLinecap="round" />
    </>
  ),
  analytics: (
    <>
      <line x1="4.5" y1="20.5" x2="19.5" y2="20.5" />
      <rect x="6.5" y="12.5" width="3" height="8" />
      <rect x="12" y="8.5" width="3" height="12" />
      <rect x="17.5" y="15" width="3" height="5.5" />
    </>
  ),
  palette: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9" cy="9.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15" cy="9" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="14.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="16.5" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
};

export interface NavProps {
  view: AppView;
  onViewChange: (view: AppView) => void;
  isAdmin?: boolean;
}

export function Nav({ view, onViewChange, isAdmin = false }: NavProps) {
  const { t } = useTranslation();
  const items: AppView[] = ['calculator', 'correction', 'bleach', 'complex', 'history', 'analytics'];
  if (isAdmin) {
    items.push('palette');
  }

  return (
    <div className="app-nav" role="tablist" aria-label={t('nav.ariaLabel')}>
      {items.map(item => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={view === item}
          className={clsx('app-nav__item', view === item && 'app-nav__item--active')}
          onClick={() => onViewChange(item)}
        >
          <svg className="app-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICON_PATHS[item]}
          </svg>
          <span>{t(`nav.${item}`)}</span>
        </button>
      ))}
    </div>
  );
}
