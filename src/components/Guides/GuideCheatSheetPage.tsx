import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TECHNIQUE_GUIDE_IDS, hasTechniqueGuide } from "../../techniqueGuides";
import "../FormulaCalculator/FormulaCalculator.css";
import "../BrandNotes/BrandNotes.css";

// One technique's short reference cheat sheet -- reached via the "Guides" nav tab (see
// GuidesIndexPage) or by typing its own bookmarkable URL (e.g. /guides/resistant-gray)
// directly, so a colorist can glance at it mid-service without touch-fumbling through
// app tabs with gloved, dye-stained hands. Mirrors BrandCheatSheetPage exactly -- content
// lives in the `techniqueGuides.<id>.*` locale keys (src/locales/en.ts / uk.ts), not
// here; this component only resolves and renders it.
export function GuideCheatSheetPage() {
  const { t } = useTranslation();
  const { guideId } = useParams<{ guideId: string }>();

  if (guideId === undefined || !hasTechniqueGuide(guideId)) {
    return (
      <div className="calculator">
        <p className="warning" role="alert">{t("techniqueGuides.notFound", { guideId: guideId ?? "" })}</p>
        <p className="brand-notes__hint">{t("techniqueGuides.notFoundHint", { ids: TECHNIQUE_GUIDE_IDS.join(", ") })}</p>
        <Link className="button button--secondary" to="/">{t("techniqueGuides.backToApp")}</Link>
      </div>
    );
  }

  // `returnObjects: true` is the standard i18next way to translate an array value rather
  // than a single string -- every `techniqueGuides.<id>.points` key is a string[] (see
  // the locale files), so this cast is exact, not a guess.
  const points = t(`techniqueGuides.${guideId}.points`, { returnObjects: true }) as string[];

  return (
    <div className="calculator">
      <h1 className="calculator__title">{t(`techniqueGuides.${guideId}.title`)}</h1>
      <ul className="brand-notes__points">
        {points.map(point => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <Link className="button button--secondary" to="/">{t("techniqueGuides.backToApp")}</Link>
    </div>
  );
}
