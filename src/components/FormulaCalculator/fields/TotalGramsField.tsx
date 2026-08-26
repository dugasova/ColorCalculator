import { useTranslation } from "react-i18next";
import { useClampedNumberText } from "./useClampedNumberText";

export interface TotalGramsFieldProps {
  totalGrams: number;
  onTotalGramsChange: (grams: number) => void;
  idSuffix?: string;
}

export function TotalGramsField({ totalGrams, onTotalGramsChange, idSuffix = '' }: TotalGramsFieldProps) {
  const { t } = useTranslation();
  const { inputProps } = useClampedNumberText(totalGrams, onTotalGramsChange, { min: 1 });

  return (
    <div className="field">
      <label htmlFor={`totalGrams${idSuffix}`}>{t('fields.totalGrams')}</label>
      <input id={`totalGrams${idSuffix}`} {...inputProps} />
    </div>
  );
}
