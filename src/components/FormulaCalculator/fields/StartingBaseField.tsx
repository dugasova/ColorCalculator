import { useTranslation } from "react-i18next";
import { TONE_FAMILIES, type ToneFamily } from "../../../engine/shades";
import type { StartingBase } from "../../../engine/startingBase";
import { Select } from "../../common/Select";

export interface StartingBaseFieldProps {
  startingBase: StartingBase;
  onStartingBaseChange: (base: StartingBase) => void;
  idSuffix?: string;
}

// Purely descriptive record of this zone's pre-service condition (see
// engine/startingBase.ts) -- does not feed the formula calculation, only the saved
// record and formula text (formatSession.ts). The tone sub-field only appears once
// "Previously colored" is picked; switching back to "Natural" drops it.
export function StartingBaseField({ startingBase, onStartingBaseChange, idSuffix = "" }: StartingBaseFieldProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="field">
        <label htmlFor={`startingBaseKind${idSuffix}`}>{t("fields.startingBase.label")}</label>
        <Select
          id={`startingBaseKind${idSuffix}`}
          value={startingBase.kind}
          onChange={value => onStartingBaseChange(
            value === "colored"
              ? { kind: "colored", tone: startingBase.kind === "colored" ? startingBase.tone : "natural" }
              : { kind: "natural" }
          )}
          options={[
            { value: "natural", label: t("fields.startingBase.natural") },
            { value: "colored", label: t("fields.startingBase.colored") },
          ]}
        />
      </div>
      {startingBase.kind === "colored" && (
        <div className="field">
          <label htmlFor={`startingBaseTone${idSuffix}`}>{t("fields.startingBase.toneLabel")}</label>
          <Select
            id={`startingBaseTone${idSuffix}`}
            value={startingBase.tone}
            onChange={value => onStartingBaseChange({ kind: "colored", tone: value as ToneFamily })}
            options={TONE_FAMILIES.map(tone => ({ value: tone, label: t(`palette.toneFamily.${tone}`) }))}
          />
        </div>
      )}
    </>
  );
}
