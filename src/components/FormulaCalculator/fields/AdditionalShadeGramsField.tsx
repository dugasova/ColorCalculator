import { useTranslation } from "react-i18next";

export interface AdditionalShadeGramsFieldProps {
  additionalShadeCode: string | null;
  additionalShadeGrams: number;
  onAdditionalShadeGramsChange: (grams: number) => void;
  idSuffix?: string;
}

// Only relevant once the colorist has chosen an additional shade above; the grams they
// enter here drive the automatic developer recalculation in the results below.
export function AdditionalShadeGramsField({
  additionalShadeCode, additionalShadeGrams, onAdditionalShadeGramsChange, idSuffix = '',
}: AdditionalShadeGramsFieldProps) {
  const { t } = useTranslation();
  if (additionalShadeCode === null) {
    return null;
  }

  return (
    <div className="field">
      <label htmlFor={`additionalShadeGrams${idSuffix}`}>{t('fields.additionalShadeGrams')}</label>
      <input
        id={`additionalShadeGrams${idSuffix}`}
        type="number"
        min={0}
        step={0.1}
        value={additionalShadeGrams}
        onChange={e => onAdditionalShadeGramsChange(Number(e.target.value))}
      />
    </div>
  );
}
