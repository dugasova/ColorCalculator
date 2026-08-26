import { useTranslation } from "react-i18next";
import { formatLineLabel } from "../../../engine/formatLineLabel";

export interface LineFieldProps {
  availableLines: (string | null)[];
  line: string | null;
  onLineChange: (line: string | null) => void;
  idSuffix?: string;
}

export function LineField({ availableLines, line, onLineChange, idSuffix = '' }: LineFieldProps) {
  const { t } = useTranslation();
  if (availableLines.length <= 1) {
    return null;
  }

  return (
    <div className="field">
      <label htmlFor={`line${idSuffix}`}>{t('fields.line')}</label>
      <select
        name={`line${idSuffix}`}
        id={`line${idSuffix}`}
        value={line ?? ''}
        onChange={e => onLineChange(e.target.value || null)}>
        {availableLines.map(l => (
          <option key={l ?? ''} value={l ?? ''}>{l ? formatLineLabel(l) : t('fields.lineDefault')}</option>
        ))}
      </select>
    </div>
  );
}
