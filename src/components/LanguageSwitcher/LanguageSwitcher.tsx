import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../../i18n";
import "./LanguageSwitcher.css";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <div className="language-switcher">
      {SUPPORTED_LANGUAGES.map(lang => (
        <button
          key={lang}
          type="button"
          className={`button button--secondary ${i18n.resolvedLanguage === lang ? 'button--active' : ''}`}
          onClick={() => i18n.changeLanguage(lang)}
        >
          {t(`language.${lang}`)}
        </button>
      ))}
    </div>
  );
}
