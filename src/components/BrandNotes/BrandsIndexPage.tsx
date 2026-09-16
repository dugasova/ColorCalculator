import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BRAND_CHEAT_SHEET_IDS } from "../../brandCheatSheets";
import "../FormulaCalculator/FormulaCalculator.css";
import "./BrandNotes.css";

// Landing page for the "Brands" nav tab: one link per built-in brand's cheat sheet (see
// BrandCheatSheetPage) -- each also reachable directly by its own bookmarkable URL
// (/loreal, /wella, ...) for a quick glance without navigating the app at all.
export function BrandsIndexPage() {
  const { t } = useTranslation();

  return (
    <div className="calculator">
      <h1 className="calculator__title">
        {t("brandNotes.indexTitlePrefix")} <span className="calculator__title-accent">{t("brandNotes.indexTitleAccent")}</span>
      </h1>
      <p className="brand-notes__hint">{t("brandNotes.indexHint")}</p>
      <ul className="brand-notes__list">
        {BRAND_CHEAT_SHEET_IDS.map(id => (
          <li key={id}>
            <Link className="brand-notes__row" to={`/${id}`}>
              {t(`brandNotes.${id}.title`)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
