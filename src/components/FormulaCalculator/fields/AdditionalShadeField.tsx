import { useTranslation } from "react-i18next";
import { shadeLabel, type Shade } from "../../../engine/shades";
import { shadeToHexColor } from "../../../engine/color";
import { Select } from "../../common/Select";

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
        <Select
          id={`additionalShadeCode${idSuffix}`}
          value={additionalShadeCode ?? ''}
          onChange={value => onAdditionalShadeCodeChange(value === '' ? null : value)}
          options={[
            { value: '', label: t('fields.additionalShadeNone') },
            ...lineShades.map(shade => ({
              value: shade.code,
              label: shadeLabel(shade),
              searchText: shade.code,
              swatchColor: shadeToHexColor(shade),
            })),
          ]}
        />
        {additionalShade !== null && (
          <span
            className="shade-swatch"
            style={{ backgroundColor: shadeToHexColor(additionalShade) }}
            title={shadeLabel(additionalShade)}
          />
        )}
      </div>
    </div>
  );
}
