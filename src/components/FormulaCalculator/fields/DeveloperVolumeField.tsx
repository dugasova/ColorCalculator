import { useTranslation } from "react-i18next";
import type { Shade } from "../../../engine/shades";
import type { DeveloperVolume } from "../../../engine/levels";

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
      <select
        name={`manualDeveloperVolume${idSuffix}`}
        id={`manualDeveloperVolume${idSuffix}`}
        value={manualDeveloperVolume ?? targetShade.developerVolumeChoices[0]}
        onChange={e => onManualDeveloperVolumeChange(Number(e.target.value) as DeveloperVolume)}>
        {targetShade.developerVolumeChoices.map(volume => (
          <option key={volume} value={volume}>{t('format.developerVolume', { value: volume })}</option>
        ))}
      </select>
    </div>
  );
}
