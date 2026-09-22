import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BRAND_CHEAT_SHEET_IDS } from "../../brandCheatSheets";
import { TECHNIQUE_GUIDE_IDS } from "../../techniqueGuides";
import "../FormulaCalculator/FormulaCalculator.css";
import "../BrandNotes/BrandNotes.css";

// Landing page for the single "Reference" nav tab -- both brand mixing/processing cheat
// sheets (see BrandCheatSheetPage) and technique cheat sheets (see GuideCheatSheetPage)
// are the same kind of thing (short glance-at-mid-service reference notes), so they share
// one tab and one page instead of two nav entries for what's really one category. Each
// entry is still reachable directly by its own bookmarkable URL (/loreal, /guides/
// resistant-gray, ...) without navigating through this index at all.
export function ReferenceIndexPage() {
  const { t } = useTranslation();

  return (
    <div className="calculator">
      <h1 className="calculator__title">
        {t("reference.indexTitlePrefix")} <span className="calculator__title-accent">{t("reference.indexTitleAccent")}</span>
      </h1>
      <p className="brand-notes__hint">{t("reference.indexHint")}</p>

      <h2 className="results__section-heading">{t("reference.brandsSectionTitle")}</h2>
      <ul className="brand-notes__list">
        {BRAND_CHEAT_SHEET_IDS.map(id => (
          <li key={id}>
            <Link className="brand-notes__row" to={`/${id}`}>
              {t(`brandNotes.${id}.title`)}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="results__section-heading">{t("reference.guidesSectionTitle")}</h2>
      <ul className="brand-notes__list">
        {TECHNIQUE_GUIDE_IDS.map(id => (
          <li key={id}>
            <Link className="brand-notes__row" to={`/guides/${id}`}>
              {t(`techniqueGuides.${id}.title`)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
