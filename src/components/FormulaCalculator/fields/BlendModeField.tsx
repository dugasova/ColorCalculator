import { useTranslation } from "react-i18next";

export interface BlendModeFieldProps {
  substituteBlend: boolean;
  onSubstituteBlendChange: (value: boolean) => void;
  idSuffix?: string;
}

// Lets the colorist flag that the target shade isn't in stock: instead of the additional
// shade adding on top of the primary mix (see AdditionalShadeGramsField), the two shades
// split the single calculated color total between them — e.g. no 7/13 on hand, blend 7/1
// and 7/3 at a chosen ratio (see BlendRatioField) to approximate it.
export function BlendModeField({ substituteBlend, onSubstituteBlendChange, idSuffix = '' }: BlendModeFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="field">
      <label className="blend-toggle" htmlFor={`substituteBlend${idSuffix}`}>
        <input
          type="checkbox"
          id={`substituteBlend${idSuffix}`}
          checked={substituteBlend}
          onChange={e => onSubstituteBlendChange(e.target.checked)}
        />
        {t('fields.substituteBlend')}
      </label>
    </div>
  );
}
