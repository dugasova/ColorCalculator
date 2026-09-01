import { useTranslation } from "react-i18next";
import type { Shade } from "../../../engine/shades";
import type { DeveloperVolume } from "../../../engine/levels";
import { Select } from "../../common/Select";

export interface DeveloperVolumeFieldProps {
  targetShade: Shade;
  manualDeveloperVolume: DeveloperVolume | undefined;
  onManualDeveloperVolumeChange: (volume: DeveloperVolume) => void;
  idSuffix?: string;
}

export function DeveloperVolumeField({ targetShade, manualDeveloperVolume, onManualDeveloperVolumeChange, idSuffix = '' }: DeveloperVolumeFieldProps) {
  const { t } = useTranslation();
  if (!targetShade.developerVolumeChoices) {
    return null;
  }

  return (
    <div className="field">
      <label htmlFor={`manualDeveloperVolume${idSuffix}`}>{t('fields.developerVolume')}</label>
      <Select
        id={`manualDeveloperVolume${idSuffix}`}
        value={String(manualDeveloperVolume ?? targetShade.developerVolumeChoices[0])}
        onChange={value => onManualDeveloperVolumeChange(Number(value) as DeveloperVolume)}
        options={targetShade.developerVolumeChoices.map(volume => ({
          value: String(volume),
          label: t('format.developerVolume', { value: volume }),
        }))}
      />
    </div>
  );
}
