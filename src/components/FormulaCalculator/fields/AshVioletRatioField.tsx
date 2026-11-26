import { useTranslation } from "react-i18next";
import { sameAshVioletRatio, type AshVioletMix, type AshVioletRatio } from "../../../engine/ashVioletMix";
import { Select } from "../../common/Select";

export interface AshVioletRatioFieldProps {
  // The mix the formula applies (FullFormula.ashVioletMix); the field hides without one.
  mix: AshVioletMix | null | undefined;
  onRatioChange: (ratio: AshVioletRatio) => void;
  idSuffix?: string;
}

function ratioValue(ratio: AshVioletRatio): string {
  return `${ratio.ashParts}:${ratio.violetParts}`;
}

// Matrix Super Sync's ash shade on a light blonde goes in with the violet shade of its
// level (see engine/ashVioletMix.ts): the colorist picks between the level's two ratios.
export function AshVioletRatioField({ mix, onRatioChange, idSuffix = "" }: AshVioletRatioFieldProps) {
  const { t } = useTranslation();
  if (mix == null) return null;

  return (
    <div className="field">
      <label htmlFor={`ashVioletRatio${idSuffix}`}>
        {t("fields.ashVioletRatio", { ash: mix.ashCode, violet: mix.violetCode })}
      </label>
      <Select
        id={`ashVioletRatio${idSuffix}`}
        value={ratioValue(mix.ratio)}
        onChange={value => {
          const chosen = mix.choices.find(choice => ratioValue(choice) === value);
          if (chosen !== undefined && !sameAshVioletRatio(chosen, mix.ratio)) onRatioChange(chosen);
        }}
        options={mix.choices.map(choice => ({
          value: ratioValue(choice),
          label: t("fields.ashVioletRatioChoice", {
            ash: mix.ashCode,
            violet: mix.violetCode,
            ashParts: choice.ashParts,
            violetParts: choice.violetParts,
          }),
        }))}
      />
      <p className="field__hint">{t("fields.ashVioletRatioHint")}</p>
    </div>
  );
}
