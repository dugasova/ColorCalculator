import { useTranslation } from "react-i18next";
import type { Shade } from "../../../engine/shades";
import { shadeToHexColor } from "../../../engine/color";

export interface AdditionalShadeFieldProps {
  lineShades: Shade[];
  additionalShadeCode: string | null;
  onAdditionalShadeCodeChange: (code: string | null) => void;
  idSuffix?: string;
}

// Lets the colorist blend in an extra shade at their own discretion — e.g. a small
// corrective addition — independent of the primary target shade selected above.
export function AdditionalShadeField({ lineShades, additionalShadeCode, onAdditionalShadeCodeChange, idSuffix = '' }: AdditionalShadeFieldProps) {
  const { t } = useTranslation();
  const additionalShade = lineShades.find(s => s.code === additionalShadeCode) ?? null;

  return (
    <div className="field">
      <label htmlFor={`additionalShadeCode${idSuffix}`}>{t('fields.additionalShade')}</label>
      <div className="shade-field">
        <select
          name={`additionalShadeCode${idSuffix}`}
          id={`additionalShadeCode${idSuffix}`}
          value={additionalShadeCode ?? ''}
          onChange={e => onAdditionalShadeCodeChange(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">{t('fields.additionalShadeNone')}</option>
          {lineShades.map(shade => (
            <option key={shade.code} value={shade.code}>
              {shade.code} {shade.tone}{shade.secondaryTone ? `/${shade.secondaryTone}` : ''}
            </option>
          ))}
        </select>
        {additionalShade !== null && (
          <span
            className="shade-swatch"
            style={{ backgroundColor: shadeToHexColor(additionalShade) }}
            title={`${additionalShade.code} ${additionalShade.tone}${additionalShade.secondaryTone ? `/${additionalShade.secondaryTone}` : ''}`}
          />
        )}
      </div>
    </div>
  );
}
