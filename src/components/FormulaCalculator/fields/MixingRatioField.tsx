import { useTranslation } from "react-i18next";
import { sameMixingRatio, type MixingRatio, type Shade } from "../../../engine/shades";
import { Select } from "../../common/Select";

export interface MixingRatioFieldProps {
  targetShade: Shade;
  manualMixingRatio: MixingRatio | undefined;
  onManualMixingRatioChange: (ratio: MixingRatio) => void;
  idSuffix?: string;
}

function ratioValue(ratio: MixingRatio): string {
  return `${ratio.colorParts}:${ratio.developerParts}`;
}

// Only shown for a shade that offers more than one ratio (Shade.mixingRatioChoices, e.g.
// Wella Color Touch 1:2 or 1:1.5) -- every other shade's ratio is fixed by the line or by
// the level-diff strategy, with nothing for the colorist to pick.
export function MixingRatioField({ targetShade, manualMixingRatio, onManualMixingRatioChange, idSuffix = "" }: MixingRatioFieldProps) {
  const { t } = useTranslation();
  const choices = targetShade.mixingRatioChoices;
  if (choices === undefined || choices.length < 2) {
    return null;
  }
  const selected = manualMixingRatio !== undefined && choices.some(choice => sameMixingRatio(choice, manualMixingRatio))
    ? manualMixingRatio
    : choices[0];

  return (
    <div className="field">
      <label htmlFor={`manualMixingRatio${idSuffix}`}>{t("fields.mixingRatio")}</label>
      <Select
        id={`manualMixingRatio${idSuffix}`}
        value={ratioValue(selected)}
        onChange={value => {
          const chosen = choices.find(choice => ratioValue(choice) === value);
          if (chosen !== undefined) onManualMixingRatioChange(chosen);
        }}
        options={choices.map(choice => ({
          value: ratioValue(choice),
          label: t("format.mixingRatioChoice", { color: choice.colorParts, developer: choice.developerParts }),
        }))}
      />
    </div>
  );
}
