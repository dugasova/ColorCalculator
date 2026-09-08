import { useTranslation } from "react-i18next";
import { shadeLabel, type Shade } from "../../../engine/shades";
import { shadeToHexColor } from "../../../engine/color";
import { Select } from "../../common/Select";
import { useClampedNumberText } from "./useClampedNumberText";

export interface AdditionalShadeFieldProps {
  lineShades: Shade[];
  additionalShadeCode: string | null;
  onAdditionalShadeCodeChange: (code: string | null) => void;
  additionalShadeGrams: number;
  onAdditionalShadeGramsChange: (grams: number) => void;
  idSuffix?: string;
  label?: string;
}

// Lets the colorist blend in an extra shade at their own discretion — e.g. a small
// corrective addition — independent of the primary target shade selected above. Spans
// the full form row (additional-shade-field) so a second instance of this field (see
// FormulaCalculator/ColorStepCard's "Additional shade 2") always stacks directly below
// it on its own row, and the fields after it never shift position depending on whether
// a second additional shade is showing. The grams input renders inline with the select
// (not as a separate field below it, which used to leave it visually disconnected from
// the shade it belongs to) and only appears once a shade is picked.
export function AdditionalShadeField({
  lineShades, additionalShadeCode, onAdditionalShadeCodeChange,
  additionalShadeGrams, onAdditionalShadeGramsChange, idSuffix = "", label,
}: AdditionalShadeFieldProps) {
  const { t } = useTranslation();
  const additionalShade = lineShades.find(s => s.code === additionalShadeCode) ?? null;
  // See useClampedNumberText's own comment: a plain `type="number"` input bound directly
  // to `additionalShadeGrams` can briefly show "040" when typing over the default 0
  // before the parent's re-render catches up. min: 0 (not TotalGramsField's 1) since 0
  // additional-shade grams is a valid "not blending anything in yet" state.
  const { inputProps: gramsInputProps } = useClampedNumberText(additionalShadeGrams, onAdditionalShadeGramsChange, { min: 0 });

  return (
    <div className="field additional-shade-field">
      <label htmlFor={`additionalShadeCode${idSuffix}`}>{label ?? t("fields.additionalShade")}</label>
      <div className="shade-field">
        <Select
          id={`additionalShadeCode${idSuffix}`}
          value={additionalShadeCode ?? ""}
          onChange={value => onAdditionalShadeCodeChange(value === "" ? null : value)}
          options={[
            { value: "", label: t("fields.additionalShadeNone") },
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
        {additionalShadeCode !== null && (
          <input
            id={`additionalShadeGrams${idSuffix}`}
            className="shade-field__grams"
            aria-label={t("fields.additionalShadeGrams")}
            title={t("fields.additionalShadeGrams")}
            {...gramsInputProps}
          />
        )}
      </div>
    </div>
  );
}
