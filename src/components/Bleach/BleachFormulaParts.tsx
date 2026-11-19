import { useTranslation } from "react-i18next";
import type { BleachFormula } from "../../engine/bleach";
import type { Brand } from "../../engine/brands";
import { findBleachToners } from "../../engine/correction";
import { formatBleachToning } from "../../format/formatBleach";

// The pieces of a bleach formula that read the same on the standalone BleachCalculator
// and on a bleach step of a Complex Coloring session (BleachStepCard). They are separate
// components because each screen places its own rows between them.

export interface BleachTotalGramsFieldProps {
  id: string;
  totalGrams: number;
  onTotalGramsChange: (grams: number) => void;
}

export function BleachTotalGramsField({ id, totalGrams, onTotalGramsChange }: BleachTotalGramsFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="field">
      <label htmlFor={id}>{t("fields.totalGrams")}</label>
      <input
        type="number"
        id={id}
        min={1}
        value={totalGrams}
        onChange={e => onTotalGramsChange(Number(e.target.value))}
      />
    </div>
  );
}

interface BleachResultProps {
  result: BleachFormula;
}

// Why there is no single-session formula: nothing to lift, or too much for one session.
export function BleachWarnings({ result }: BleachResultProps) {
  const { t } = useTranslation();
  return (
    <>
      {result.liftNeeded === 0 && (
        <p className="warning" role="alert">
          {t("bleach.noLiftWarning")}
        </p>
      )}
      {result.multiStepRequired && (
        <p className="warning" role="alert">
          {t("bleach.multiStepWarning")}
        </p>
      )}
    </>
  );
}

// The powder and developer to weigh out. Renders nothing when there is no formula.
export function BleachMixRow({ result }: BleachResultProps) {
  const { t } = useTranslation();
  if (result.grams === null) return null;
  return (
    <div className="results__row">
      <span className="results__row-label">{t("results.mix")}</span>
      <span>
        {t("bleach.mixValue", {
          powder: result.grams.powderGrams.toFixed(1),
          developer: result.grams.developerGrams.toFixed(1),
        })}
      </span>
    </div>
  );
}

export interface BleachToner {
  brand: Brand;
  line: string | null;
}

interface BleachToningRowsProps extends BleachResultProps {
  // The toner's brand and line, when the colorist picked one: its shades at the target
  // level that cancel the background are listed after the generic recommendation.
  toner?: BleachToner;
}

// What the lightening leaves behind and what to tone it with. Renders nothing when there
// is no formula.
export function BleachToningRows({ result, toner }: BleachToningRowsProps) {
  const { t } = useTranslation();
  if (result.grams === null) return null;
  const toning = formatBleachToning(result.targetLevel);
  const tonerShades = toner !== undefined ? findBleachToners(toner.brand, toner.line, result.targetLevel) : null;
  return (
    <>
      <div className="results__row">
        <span className="results__row-label">{t("bleach.backgroundLabel")}</span>
        <span>{toning.background}</span>
      </div>
      <div className="results__row">
        <span className="results__row-label">{t("bleach.toningLabel")}</span>
        <span>{toning.toner}</span>
      </div>
      {tonerShades !== null && (
        <div className="results__row" data-row="tonerShades">
          <span className="results__row-label">{t("bleach.tonerShadesLabel")}</span>
          <span>
            {tonerShades.length > 0
              ? tonerShades.map(shade => shade.code).join(", ")
              : t("bleach.tonerShadesNone", { level: result.targetLevel })}
          </span>
        </div>
      )}
    </>
  );
}

// The scalp-time ceiling and how often to check the lift.
export function BleachSafetyNotes({ result }: BleachResultProps) {
  const { t } = useTranslation();
  return (
    <>
      <p className="bleach__note">{t("bleach.maxScalpTimeNote", { max: result.maxScalpProcessingMinutes })}</p>
      <p className="bleach__note">
        {t("bleach.checkIntervalNote", {
          min: result.checkIntervalMinMinutes,
          max: result.checkIntervalMaxMinutes,
        })}
      </p>
    </>
  );
}
