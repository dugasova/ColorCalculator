import { useTranslation } from "react-i18next";
import type { ApplicationZone } from "../../../engine/applicationZone";

export interface ApplicationZoneFieldProps {
  applicationZone: ApplicationZone;
  onApplicationZoneChange: (zone: ApplicationZone) => void;
  idSuffix?: string;
}

export function ApplicationZoneField({ applicationZone, onApplicationZoneChange, idSuffix = '' }: ApplicationZoneFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="field">
      <label htmlFor={`applicationZone${idSuffix}`}>{t('fields.applicationZone')}</label>
      <select
        name={`applicationZone${idSuffix}`}
        id={`applicationZone${idSuffix}`}
        value={applicationZone}
        onChange={e => onApplicationZoneChange(e.target.value as ApplicationZone)}>
        <option value="full-head">{t('fields.applicationZoneFullHead')}</option>
        <option value="root-touch-up">{t('fields.applicationZoneRootTouchUp')}</option>
      </select>
    </div>
  );
}
