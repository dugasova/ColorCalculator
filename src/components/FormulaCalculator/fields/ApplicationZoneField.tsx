import { useTranslation } from "react-i18next";
import type { ApplicationZone } from "../../../engine/applicationZone";
import { Select } from "../../common/Select";

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
      <Select
        id={`applicationZone${idSuffix}`}
        value={applicationZone}
        onChange={value => onApplicationZoneChange(value as ApplicationZone)}
        options={[
          { value: 'full-head', label: t('fields.applicationZoneFullHead') },
          { value: 'root-touch-up', label: t('fields.applicationZoneRootTouchUp') },
        ]}
      />
    </div>
  );
}
