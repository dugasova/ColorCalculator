import { useTranslation } from "react-i18next";
import type { Shade } from "../../../engine/shades";
import { shadeToHexColor } from "../../../engine/color";
import { Select } from "../../common/Select";

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
        <Select
          id={`targetShadeCode${idSuffix}`}
          value={targetShadeCode}
          onChange={onTargetShadeCodeChange}
          options={lineShades.map(shade => ({
            value: shade.code,
            label: `${shade.code} ${shade.tone}${shade.secondaryTone ? `/${shade.secondaryTone}` : ''}`,
            searchText: shade.code,
            swatchColor: shadeToHexColor(shade),
          }))}
        />
        <span
          className="shade-swatch"
          style={{ backgroundColor: shadeToHexColor(targetShade) }}
          title={`${targetShade.code} ${targetShade.tone}${targetShade.secondaryTone ? `/${targetShade.secondaryTone}` : ''}`}
        />
      </div>
    </div>
  );
}
