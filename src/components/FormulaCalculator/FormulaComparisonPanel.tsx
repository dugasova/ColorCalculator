import { useTranslation } from "react-i18next";
import "./FormulaComparisonPanel.css";
import { compareFormulas, type ComparedFormula } from "./formulaComparison";

export interface FormulaComparisonPanelProps {
  // Formula A, pinned earlier; null until the colorist starts a comparison.
  pinned: ComparedFormula | null;
  // The calculator's live result: formula B once A is pinned.
  current: ComparedFormula;
  onPin: (formula: ComparedFormula) => void;
  onClear: () => void;
}

// Two formulas side by side (simple calculator): pin the current one as A, change the
// shade, brand or line, and B -- the live result -- appears next to it with the rows that
// differ highlighted.
export function FormulaComparisonPanel({ pinned, current, onPin, onClear }: FormulaComparisonPanelProps) {
  const { t } = useTranslation();

  if (pinned === null) {
    return (
      <div className="comparison comparison--idle">
        <button type="button" className="button button--secondary" onClick={() => onPin(current)}>
          {t("comparison.start")}
        </button>
        <p className="comparison__hint">{t("comparison.startHint")}</p>
      </div>
    );
  }

  const { shared, rows } = compareFormulas(pinned, current);
  return (
    <section className="comparison" aria-labelledby="comparisonTitle">
      <h2 id="comparisonTitle" className="results__section-heading">
        {t("comparison.title")}
      </h2>
      {shared.length > 0 && (
        <p className="comparison__shared">{shared.map(row => `${row.label}: ${row.a}`).join(" · ")}</p>
      )}
      <div className="comparison__scroll">
        <table className="comparison__table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">{t("comparison.row")}</span>
              </th>
              <th scope="col">{t("comparison.formulaA")}</th>
              <th scope="col">{t("comparison.formulaB")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.id}
                data-row={row.id}
                className={row.differs ? "comparison__row comparison__row--differs" : "comparison__row"}
              >
                <th scope="row">{row.label}</th>
                <td>{row.a}</td>
                <td>{row.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="comparison__hint">{t("comparison.legend")}</p>
      <div className="comparison__actions">
        <button type="button" className="button button--secondary" onClick={() => onPin(current)}>
          {t("comparison.repin")}
        </button>
        <button type="button" className="button button--secondary" onClick={onClear}>
          {t("comparison.clear")}
        </button>
      </div>
    </section>
  );
}
