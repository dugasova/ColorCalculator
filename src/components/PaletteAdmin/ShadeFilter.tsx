import { useTranslation } from "react-i18next";
import { formatLineLabel } from "../../engine/formatLineLabel";
import { Select } from "../common/Select";
import { ALL_LINES, NO_LINE, type ShadeFilterState } from "./useShadeFilter";

export interface ShadeFilterFieldsProps {
  filter: ShadeFilterState;
  // Keeps the two lists' field ids apart on one page.
  idPrefix: string;
}

export function ShadeFilterFields({ filter, idPrefix }: ShadeFilterFieldsProps) {
  const { t } = useTranslation();
  if (filter.total === 0) return null;
  const { lines, effectiveLine, setLineFilter, query, setQuery, visibleShades, total } = filter;

  return (
    <div className="palette-admin__shade-filter">
      {lines.length > 1 && (
        <div className="field">
          <label htmlFor={`${idPrefix}LineFilter`}>{t("palette.lineFilterLabel")}</label>
          <Select
            id={`${idPrefix}LineFilter`}
            value={effectiveLine}
            onChange={setLineFilter}
            options={[
              { value: ALL_LINES, label: t("palette.allLines") },
              ...lines.map(line => ({
                value: line,
                label: line === NO_LINE ? t("palette.noLine") : formatLineLabel(line),
              })),
            ]}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor={`${idPrefix}ShadeSearch`}>{t("palette.searchShadeLabel")}</label>
        <input
          id={`${idPrefix}ShadeSearch`}
          type="search"
          value={query}
          placeholder={t("palette.searchShadePlaceholder")}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <p className="palette-admin__shade-count" aria-live="polite">
        {t("palette.shownCount", { shown: visibleShades.length, total })}
      </p>
    </div>
  );
}
