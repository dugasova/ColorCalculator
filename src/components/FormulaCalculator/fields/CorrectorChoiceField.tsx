import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCorrectorProduct, getDefaultCorrectorForm } from "../../../engine/correctorProducts";
import type { CorrectorSelection } from "../../../engine/correctorProducts";
import { getCorrectiveToneGrams } from "../../../engine/formula";
import type { FullFormula } from "../../../engine/formula";
import type { ToneFamily } from "../../../engine/shades";
import { atResultLevel, formatChosenCorrectorName } from "../../../format/formulaMessages";
import type { CorrectorBrand } from "../../../format/formulaMessages";

export interface CorrectorChoiceFieldProps {
  result: Pick<FullFormula, "recommendedCorrectiveTone" | "correctorGrams" | "correctiveTones"> & {
    achievedLevel?: FullFormula["achievedLevel"];
  };
  brand: CorrectorBrand;
  selection: CorrectorSelection;
  onSelectionChange: (selection: CorrectorSelection) => void;
  // Given, each tone's grams become an input the colorist can change (Color Correction).
  onAmountChange?: (tone: ToneFamily, grams: number) => void;
}

interface GramsInputProps {
  grams: number;
  disabled: boolean;
  label: string;
  onChange: (grams: number) => void;
}

// Grams with a decimal ("1.5"). While the field has focus it keeps the typed text, so "1."
// or an emptied field is not snapped back to a number mid-edit; on blur it shows the value.
function GramsInput({ grams, disabled, label, onChange }: GramsInputProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <span className="corrector-choice__grams">
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={editing ?? String(grams)}
        disabled={disabled}
        onFocus={e => {
          setEditing(String(grams));
          e.target.select();
        }}
        onChange={e => {
          const next = e.target.value.replace(/[^\d.,]/g, "");
          setEditing(next);
          const value = Number(next.replace(",", "."));
          if (next !== "" && Number.isFinite(value)) onChange(Math.round(value * 10) / 10);
        }}
        onBlur={() => setEditing(null)}
      />
      {t("results.gramsUnit")}
    </span>
  );
}

export function CorrectorChoiceField({
  result,
  brand: resultBrand,
  selection,
  onSelectionChange,
  onAmountChange,
}: CorrectorChoiceFieldProps) {
  const { t } = useTranslation();
  const groupId = useId();
  const brand = atResultLevel(resultBrand, result) ?? resultBrand;
  const tones = getCorrectiveToneGrams(result);
  if (tones.length === 0) return null;

  return (
    <div className="corrector-choice" role="group" aria-label={t("results.correctorChoiceLabel")}>
      {tones.map(({ tone, grams }) => {
        const product = getCorrectorProduct(brand.brandId, brand.line, tone, brand.level);
        const choice = selection[tone];
        const included = choice !== "skip";
        const hasBothForms = product !== null && product.shade !== undefined && product.mixtone !== undefined;
        const combinable = hasBothForms && product.combinable === true;
        const form =
          choice === "shade" || choice === "mixtone" || (choice === "both" && combinable)
            ? choice
            : product !== null
              ? getDefaultCorrectorForm(product)
              : "shade";
        // With a combinable product each form is its own checkbox: one, the other, or both
        // (never neither -- that is the tone's own checkbox).
        const takesForm = (option: "shade" | "mixtone") => form === "both" || form === option;
        const toggleForm = (option: "shade" | "mixtone", checked: boolean) => {
          const other = option === "shade" ? "mixtone" : "shade";
          const next = checked ? (takesForm(other) ? "both" : option) : other;
          onSelectionChange({ ...selection, [tone]: next });
        };
        const name = hasBothForms ? "" : formatChosenCorrectorName(tone, brand, choice);
        return (
          <div className="corrector-choice__row" key={tone}>
            <label className="corrector-choice__option">
              <input
                type="checkbox"
                checked={included}
                onChange={e => onSelectionChange({ ...selection, [tone]: e.target.checked ? form : "skip" })}
              />
              {onAmountChange === undefined ? t("results.recommendedToneValue", { grams, tone: name }).trim() : name}
            </label>
            {onAmountChange !== undefined && (
              <GramsInput
                grams={grams}
                disabled={!included}
                label={t("results.correctorGramsAria", { tone: formatChosenCorrectorName(tone, brand, choice) })}
                onChange={value => onAmountChange(tone, value)}
              />
            )}
            {hasBothForms &&
              (["mixtone", "shade"] as const).map(option =>
                combinable ? (
                  <label className="corrector-choice__option" key={option}>
                    <input
                      type="checkbox"
                      checked={included && takesForm(option)}
                      // The last form taken stays: unticking it would leave the tone empty.
                      disabled={!included || (takesForm(option) && form !== "both")}
                      onChange={e => toggleForm(option, e.target.checked)}
                    />
                    {product[option]}
                  </label>
                ) : (
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
                ),
              )}
          </div>
        );
      })}
    </div>
  );
}
