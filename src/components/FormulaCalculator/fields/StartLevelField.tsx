import { useTranslation } from "react-i18next";
import type { Level } from "../../../engine/levels";
import { LevelField } from "../../common/LevelField";

export interface StartLevelFieldProps {
  startLevel: Level;
  onStartLevelChange: (level: Level) => void;
  idSuffix?: string;
  hint?: string;
}

export function StartLevelField({ startLevel, onStartLevelChange, idSuffix = "", hint }: StartLevelFieldProps) {
  const { t } = useTranslation();
  return (
    <LevelField id={`startLevel${idSuffix}`} label={t("fields.startLevel")} value={startLevel} onChange={onStartLevelChange} hint={hint} />
  );
}
