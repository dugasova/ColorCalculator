import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Modal } from "../common/Modal";
import "./FormulaComparisonPanel.css";
import {
  compareFormulas,
  comparisonColumnLabel,
  isSameFormula,
  type ComparedFormula,
  type FormulaComparison,
} from "./formulaComparison";

export interface FormulaComparisonPanelProps {
  // Formula A, pinned earlier; null until the colorist starts a comparison.
  pinned: ComparedFormula | null;
  // The calculator's live result: formula B once A is pinned.
  current: ComparedFormula;
  // The saved visit B was repeated from (History's Compare), if any: B carries its date
  // for as long as the live formula still is that visit.
  visit?: ComparedFormula | null;
  onPin: (formula: ComparedFormula) => void;
  onClear: () => void;
}

// Two formulas side by side (simple calculator). Until a comparison starts, only a button
// under the results. Once A is pinned, a bar fixed to the bottom of the screen names A and
// counts what differs from the live formula B; it opens the full table in a sheet, so the
// form and its results stay where they are while the colorist changes the formula.
export function FormulaComparisonPanel({ pinned, current, visit = null, onPin, onClear }: FormulaComparisonPanelProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [differencesOnly, setDifferencesOnly] = useState(true);

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

  // B as the colorist knows it: the visit itself while nothing has been changed, so it
  // keeps the visit's date in the headers and when made A.
  const formulaB = visit !== null && isSameFormula(visit, current) ? visit : current;
  const comparison = compareFormulas(pinned, formulaB);
  const differenceCount = comparison.rows.filter(row => row.differs).length;
  const barA = t("comparison.barFormulaA", {
    shade: pinned.visitDate ?? comparison.rows.find(row => row.id === "shade")?.a ?? "",
  });
  const barText =
    typeof formulaB.visitDate === "string"
      ? `${barA} · ${t("comparison.barFormulaB", { date: formulaB.visitDate })}`
      : barA;

  return (
    <>
      {/* Keeps the end of the page clear of the fixed bar. */}
      <div className="comparison-bar__spacer" aria-hidden="true" />
      {/* Portaled to <body>: the screen's entry animation leaves a transform on .app-main's
          children, and inside a transformed ancestor position: fixed stops being fixed. */}
      {createPortal(
        <div className="comparison-bar" role="region" aria-label={t("comparison.title")}>
          <button
            type="button"
            className="comparison-bar__open"
            aria-haspopup="dialog"
            title={t("comparison.barAriaLabel")}
            onClick={() => setIsOpen(true)}
          >
            <span className="comparison-bar__a">{barText}</span>
            <span
              className={
                differenceCount > 0 ? "comparison-bar__count comparison-bar__count--differs" : "comparison-bar__count"
              }
            >
              {differenceCount > 0
                ? t("comparison.differenceCount", { count: differenceCount })
                : t("comparison.noDifferences")}
            </span>
            <svg className="comparison-bar__chevron" viewBox="0 0 12 8" fill="none" aria-hidden="true">
              <path
                d="M1 6.5L6 1.5L11 6.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>,
        document.body,
      )}
      {isOpen && (
        <Modal title={t("comparison.title")} onClose={() => setIsOpen(false)} size="large">
          <ComparisonTable
            comparison={comparison}
            labelA={comparisonColumnLabel("A", pinned)}
            labelB={comparisonColumnLabel("B", formulaB)}
            differencesOnly={differencesOnly}
            onDifferencesOnlyChange={setDifferencesOnly}
          />
          <div className="comparison__actions">
            <button type="button" className="button button--secondary" onClick={() => onPin(formulaB)}>
              {t("comparison.repin")}
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setIsOpen(false);
                onClear();
              }}
            >
              {t("comparison.clear")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

interface ComparisonTableProps {
  comparison: FormulaComparison;
  labelA: string;
  labelB: string;
  differencesOnly: boolean;
  onDifferencesOnlyChange: (value: boolean) => void;
}

function ComparisonTable({
  comparison,
  labelA,
  labelB,
  differencesOnly,
  onDifferencesOnlyChange,
}: ComparisonTableProps) {
  const { t } = useTranslation();
  const { shared, rows } = comparison;
  const shownRows = differencesOnly ? rows.filter(row => row.differs) : rows;

  return (
    <div className={differencesOnly ? "comparison comparison--differences-only" : "comparison"}>
      {shared.length > 0 && (
        <p className="comparison__shared">{shared.map(row => `${row.label}: ${row.a}`).join(" · ")}</p>
      )}
      <label className="comparison__filter">
        <input type="checkbox" checked={differencesOnly} onChange={e => onDifferencesOnlyChange(e.target.checked)} />
        {t("comparison.differencesOnly")}
      </label>
      {shownRows.length === 0 ? (
        <p className="comparison__hint">{t("comparison.sameFormulas")}</p>
      ) : (
        <div className="comparison__scroll">
          <table className="comparison__table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">{t("comparison.row")}</span>
                </th>
                <th scope="col">{labelA}</th>
                <th scope="col">{labelB}</th>
              </tr>
            </thead>
            <tbody>
              {shownRows.map(row => (
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
      )}
      {!differencesOnly && <p className="comparison__hint">{t("comparison.legend")}</p>}
    </div>
  );
}
