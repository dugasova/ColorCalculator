import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BRAND_CHEAT_SHEET_IDS, hasBrandCheatSheet } from "../../brandCheatSheets";
import "../FormulaCalculator/FormulaCalculator.css";
import "./BrandNotes.css";

// One brand's short mixing/processing cheat sheet -- reached either via the "Brands" nav
// tab (see BrandsIndexPage) or by typing its own bookmarkable URL (e.g. /loreal) directly,
// so a colorist can glance at it mid-service without touch-fumbling through app tabs with
// gloved, dye-stained hands. Content lives in the `brandNotes.<id>.*` locale keys
// (src/locales/en.ts / uk.ts), not here -- this component only resolves and renders it.
export function BrandCheatSheetPage() {
  const { t } = useTranslation();
  const { brandId } = useParams<{ brandId: string }>();

  if (brandId === undefined || !hasBrandCheatSheet(brandId)) {
    return (
      <div className="calculator">
        <p className="warning" role="alert">{t("brandNotes.notFound", { brandId: brandId ?? "" })}</p>
        <p className="brand-notes__hint">{t("brandNotes.notFoundHint", { ids: BRAND_CHEAT_SHEET_IDS.join(", ") })}</p>
        <Link className="button button--secondary" to="/">{t("brandNotes.backToApp")}</Link>
      </div>
    );
  }

  // `returnObjects: true` is the standard i18next way to translate an array value rather
  // than a single string -- every `brandNotes.<id>.points` key is a string[] (see the
  // locale files), so this cast is exact, not a guess.
  const points = t(`brandNotes.${brandId}.points`, { returnObjects: true }) as string[];

  return (
    <div className="calculator">
      <h1 className="calculator__title">{t(`brandNotes.${brandId}.title`)}</h1>
      <ul className="brand-notes__points">
        {points.map(point => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <Link className="button button--secondary" to="/">{t("brandNotes.backToApp")}</Link>
    </div>
  );
}
