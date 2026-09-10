import { useTranslation } from "react-i18next";
import { ALL_LEVELS, type Level } from "../../../engine/levels";
import { Select } from "../../common/Select";

export interface StartLevelFieldProps {
  startLevel: Level;
  onStartLevelChange: (level: Level) => void;
  idSuffix?: string;
}

export function StartLevelField({ startLevel, onStartLevelChange, idSuffix = "" }: StartLevelFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="field">
      <label htmlFor={`startLevel${idSuffix}`}>{t("fields.startLevel")}</label>
      <Select
        id={`startLevel${idSuffix}`}
        value={String(startLevel)}
        onChange={value => onStartLevelChange(Number(value) as Level)}
        options={ALL_LEVELS.map(level => ({ value: String(level), label: String(level) }))}
      />
    </div>
  );
}
