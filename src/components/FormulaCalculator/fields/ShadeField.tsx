import { useTranslation } from "react-i18next";
import type { Shade } from "../../../engine/shades";
import { shadeToHexColor } from "../../../engine/color";

export interface ShadeFieldProps {
  lineShades: Shade[];
  targetShadeCode: string;
  targetShade: Shade;
  onTargetShadeCodeChange: (code: string) => void;
  idSuffix?: string;
}

export function ShadeField({ lineShades, targetShadeCode, targetShade, onTargetShadeCodeChange, idSuffix = '' }: ShadeFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="field">
      <label htmlFor={`targetShadeCode${idSuffix}`}>{t('fields.shade')}</label>
      <div className="shade-field">
        <select name={`targetShadeCode${idSuffix}`} id={`targetShadeCode${idSuffix}`} value={targetShadeCode} onChange={e => onTargetShadeCodeChange(e.target.value)}>
          {lineShades.map(shade => (
            <option key={shade.code} value={shade.code}>
              {shade.code} {shade.tone}{shade.secondaryTone ? `/${shade.secondaryTone}` : ''}
            </option>
          ))}
        </select>
        <span
          className="shade-swatch"
          style={{ backgroundColor: shadeToHexColor(targetShade) }}
          title={`${targetShade.code} ${targetShade.tone}${targetShade.secondaryTone ? `/${targetShade.secondaryTone}` : ''}`}
        />
      </div>
    </div>
  );
}
