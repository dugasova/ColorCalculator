import { useTranslation } from "react-i18next";
import { useClampedNumberText } from "./useClampedNumberText";

export interface GrayPercentFieldProps {
  grayPercent: number;
  onGrayPercentChange: (percent: number) => void;
  idSuffix?: string;
  hint?: string;
}

export function GrayPercentField({ grayPercent, onGrayPercentChange, idSuffix = "", hint }: GrayPercentFieldProps) {
  const { t } = useTranslation();
  const { inputProps } = useClampedNumberText(grayPercent, onGrayPercentChange, { min: 0, max: 100 });

  return (
    <div className="field">
      <label htmlFor={`grayPercent${idSuffix}`}>{t("fields.grayPercent")}</label>
      <input id={`grayPercent${idSuffix}`} {...inputProps} />
      {hint !== undefined && <p className="field__hint">{hint}</p>}
    </div>
  );
}
