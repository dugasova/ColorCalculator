import { useTranslation } from "react-i18next";
import { formatLineLabel } from "../../../engine/formatLineLabel";
import { Select } from "../../common/Select";

export interface LineFieldProps {
  availableLines: (string | null)[];
  line: string | null;
  onLineChange: (line: string | null) => void;
  idSuffix?: string;
  // Overrides the plain "Brand"/"Line" label, e.g. for the toner on the Bleach screen.
  label?: string;
}

export function LineField({ availableLines, line, onLineChange, idSuffix = "", label }: LineFieldProps) {
  const { t } = useTranslation();
  if (availableLines.length <= 1) {
    return null;
  }

  return (
    <div className="field">
      <label htmlFor={`line${idSuffix}`}>{label ?? t("fields.line")}</label>
      <Select
        id={`line${idSuffix}`}
        value={line ?? ""}
        onChange={value => onLineChange(value || null)}
        options={availableLines.map(l => ({ value: l ?? "", label: l ? formatLineLabel(l) : t("fields.lineDefault") }))}
      />
    </div>
  );
}
