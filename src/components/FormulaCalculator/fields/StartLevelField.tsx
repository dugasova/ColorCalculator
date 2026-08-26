import { useTranslation } from "react-i18next";
import type { Level } from "../../../engine/levels";

const START_LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface StartLevelFieldProps {
  startLevel: Level;
  onStartLevelChange: (level: Level) => void;
  idSuffix?: string;
}

export function StartLevelField({ startLevel, onStartLevelChange, idSuffix = '' }: StartLevelFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="field">
      <label htmlFor={`startLevel${idSuffix}`}>{t('fields.startLevel')}</label>
      <select
        name={`startLevel${idSuffix}`}
        id={`startLevel${idSuffix}`}
        value={startLevel}
        onChange={e => onStartLevelChange(Number(e.target.value) as Level)}>
        {START_LEVELS.map(level => (
          <option key={level} value={level}>{level}</option>
        ))}
      </select>
    </div>
  );
}
