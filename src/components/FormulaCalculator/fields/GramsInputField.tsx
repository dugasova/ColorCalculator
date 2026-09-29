import { useTranslation } from "react-i18next";
import type { GramsInputMode } from "../../../engine/applicationZone";
import { Select } from "../../common/Select";
import { useClampedNumberText } from "./useClampedNumberText";

export interface GramsInputFieldProps {
  gramsInputMode: GramsInputMode;
  onGramsInputModeChange: (mode: GramsInputMode) => void;
  totalGrams: number;
  onTotalGramsChange: (grams: number) => void;
  colorGrams: number;
  onColorGramsChange: (grams: number) => void;
  idSuffix?: string;
}

// Lets a colorist pick how they want to enter the amount to mix: the combined
// color + developer weight (default, split by the resolved ratio), or the dye weight
// alone -- e.g. "40 g of color per root touch-up" -- with developer derived from it
// instead. Whichever mode is inactive keeps its own value untouched (see
// useShadeFormulaState) so switching back and forth never loses what was typed.
export function GramsInputField({
  gramsInputMode, onGramsInputModeChange, totalGrams, onTotalGramsChange, colorGrams, onColorGramsChange, idSuffix = "",
}: GramsInputFieldProps) {
  const { t } = useTranslation();
  const isColorMode = gramsInputMode === "color";
  const { inputProps: totalInputProps } = useClampedNumberText(totalGrams, onTotalGramsChange, { min: 1 });
  const { inputProps: colorInputProps } = useClampedNumberText(colorGrams, onColorGramsChange, { min: 1 });

  return (
    <>
      <div className="field">
        <label htmlFor={`gramsInputMode${idSuffix}`}>{t("fields.gramsInputMode")}</label>
        <Select
          id={`gramsInputMode${idSuffix}`}
          value={gramsInputMode}
          onChange={value => onGramsInputModeChange(value as GramsInputMode)}
          options={[
            { value: "total", label: t("fields.gramsInputModeTotal") },
            { value: "color", label: t("fields.gramsInputModeColor") },
          ]}
        />
      </div>
      <div className="field">
        <label htmlFor={`gramsAmount${idSuffix}`}>{isColorMode ? t("fields.colorGrams") : t("fields.totalGrams")}</label>
        <input id={`gramsAmount${idSuffix}`} {...(isColorMode ? colorInputProps : totalInputProps)} />
      </div>
    </>
  );
}
