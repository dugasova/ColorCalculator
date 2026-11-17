import { useId } from "react";
import { useTranslation } from "react-i18next";
import { getCorrectorProduct, getDefaultCorrectorForm } from "../../../engine/correctorProducts";
import type { CorrectorSelection } from "../../../engine/correctorProducts";
import { getCorrectiveToneGrams } from "../../../engine/formula";
import type { FullFormula } from "../../../engine/formula";
import { formatChosenCorrectorName } from "../../../format/formulaMessages";
import type { CorrectorBrand } from "../../../format/formulaMessages";

export interface CorrectorChoiceFieldProps {
  result: Pick<FullFormula, "recommendedCorrectiveTone" | "correctorGrams" | "correctiveTones">;
  brand: CorrectorBrand;
  selection: CorrectorSelection;
  onSelectionChange: (selection: CorrectorSelection) => void;
}

// What of the recommended corrector actually goes into the bowl: each tone can be left
// out, and where the line offers the tone both as an ordinary shade and as a mixtone, the
// colorist picks which one. The mix then names exactly one product per tone.
export function CorrectorChoiceField({ result, brand, selection, onSelectionChange }: CorrectorChoiceFieldProps) {
  const { t } = useTranslation();
  const groupId = useId();
  const tones = getCorrectiveToneGrams(result);
  if (tones.length === 0) return null;

  return (
    <div className="corrector-choice" role="group" aria-label={t("results.correctorChoiceLabel")}>
      {tones.map(({ tone, grams }) => {
        const product = getCorrectorProduct(brand.brandId, brand.line, tone);
        const choice = selection[tone];
        const included = choice !== "skip";
        const hasBothForms = product !== null && product.shade !== undefined && product.mixtone !== undefined;
        const form =
          choice === "shade" || choice === "mixtone"
            ? choice
            : product !== null
              ? getDefaultCorrectorForm(product)
              : "shade";
        return (
          <div className="corrector-choice__row" key={tone}>
            <label className="corrector-choice__option">
              <input
                type="checkbox"
                checked={included}
                onChange={e => onSelectionChange({ ...selection, [tone]: e.target.checked ? form : "skip" })}
              />
              {t("results.recommendedToneValue", {
                grams,
                tone: hasBothForms ? "" : formatChosenCorrectorName(tone, brand, choice),
              }).trim()}
            </label>
            {hasBothForms &&
              (["mixtone", "shade"] as const).map(option => (
                <label className="corrector-choice__option" key={option}>
                  <input
                    type="radio"
                    name={`${groupId}-${tone}`}
                    checked={included && form === option}
                    disabled={!included}
                    onChange={() => onSelectionChange({ ...selection, [tone]: option })}
                  />
                  {product[option]}
                </label>
              ))}
          </div>
        );
      })}
    </div>
  );
}
