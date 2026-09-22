import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TECHNIQUE_GUIDE_IDS } from "../../techniqueGuides";
import "../FormulaCalculator/FormulaCalculator.css";
import "../BrandNotes/BrandNotes.css";

// Landing page for the "Guides" nav tab: one link per technique cheat sheet (see
// GuideCheatSheetPage) -- mirrors BrandsIndexPage exactly (same layout, same CSS
// classes), just listing technique guides instead of per-brand mixing notes.
export function GuidesIndexPage() {
  const { t } = useTranslation();

  return (
    <div className="calculator">
      <h1 className="calculator__title">
        {t("techniqueGuides.indexTitlePrefix")} <span className="calculator__title-accent">{t("techniqueGuides.indexTitleAccent")}</span>
      </h1>
      <p className="brand-notes__hint">{t("techniqueGuides.indexHint")}</p>
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
