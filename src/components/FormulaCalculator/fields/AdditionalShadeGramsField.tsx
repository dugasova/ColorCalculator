import { useTranslation } from "react-i18next";
import { useClampedNumberText } from "./useClampedNumberText";

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
  // See useClampedNumberText's own comment: a plain `type="number"` input bound directly
  // to `additionalShadeGrams` can briefly show "040" when typing over the default 0
  // before the parent's re-render catches up. min: 0 (not TotalGramsField's 1) since 0
  // additional-shade grams is a valid "not blending anything in yet" state.
  const { inputProps } = useClampedNumberText(additionalShadeGrams, onAdditionalShadeGramsChange, { min: 0 });

  if (additionalShadeCode === null) {
    return null;
  }

  return (
    <div className="field">
      <label htmlFor={`additionalShadeGrams${idSuffix}`}>{t('fields.additionalShadeGrams')}</label>
      <input id={`additionalShadeGrams${idSuffix}`} {...inputProps} />
    </div>
  );
}
