import { useTranslation } from "react-i18next";
import type { PrePigmentationNeed } from "../../../engine/prePigmentation";

export interface PrePigmentationFieldProps {
  need: PrePigmentationNeed;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  idSuffix?: string;
}

// Prompts the colorist once the target shade is at least 2 levels darker than the
// starting level (see getPrePigmentationNeed, engine/prePigmentation.ts) -- below that
// threshold `need` is 'none' and this renders nothing. Opting in via the checkbox adds
// the filler step FormulaResults renders ahead of the target-color formula (see
// PrePigmentationStep) and prepends to the copyable/shareable formula text.
export function PrePigmentationField({ need, enabled, onEnabledChange, idSuffix = '' }: PrePigmentationFieldProps) {
  const { t } = useTranslation();
  if (need === 'none') return null;

  return (
    <div className="field">
      <p className="prepigment__note">{t(`prePigmentation.need.${need}`)}</p>
      <label className="blend-toggle" htmlFor={`prePigmentationEnabled${idSuffix}`}>
        <input
          type="checkbox"
          id={`prePigmentationEnabled${idSuffix}`}
          checked={enabled}
          onChange={e => onEnabledChange(e.target.checked)}
        />
        {t('fields.prePigmentationEnable')}
      </label>
    </div>
  );
}
