import { useTranslation } from "react-i18next";
import {
  MAX_LIFT_PER_SESSION,
  SESSION_BREAK_MAX_WEEKS,
  SESSION_BREAK_MIN_WEEKS,
  getBleachDeveloperChoices,
  type BleachFormula,
} from "../../engine/bleach";
import type { DeveloperVolume } from "../../engine/levels";
import { Select } from "../common/Select";
import type { Brand } from "../../engine/brands";
import { findBleachToners } from "../../engine/correction";
import { getAshVioletToningHint } from "../../engine/ashVioletMix";
import { formatBleachToning } from "../../format/formatBleach";
import { formatDeveloperVolume } from "../../format/formatDeveloperVolume";

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

export interface BleachDeveloperFieldProps {
  id: string;
  // Where the powder goes: on the scalp only up to 9% is offered.
  onScalp: boolean;
  manualDeveloperVolume: DeveloperVolume | null;
  onManualDeveloperVolumeChange: (volume: DeveloperVolume | null) => void;
  // The developer the automatic choice lands on, named in the "Auto" option.
  autoDeveloperVolume: DeveloperVolume | null;
}

const AUTO_DEVELOPER = "auto";

// Automatic by default (the gentlest developer that lifts each session); the colorist may
// pick one by hand, which every session then uses.
export function BleachDeveloperField({
  id,
  onScalp,
  manualDeveloperVolume,
  onManualDeveloperVolumeChange,
  autoDeveloperVolume,
}: BleachDeveloperFieldProps) {
  const { t } = useTranslation();
  const choices = getBleachDeveloperChoices(onScalp);
  const selected =
    manualDeveloperVolume !== null && choices.includes(manualDeveloperVolume) ? manualDeveloperVolume : null;
  return (
    <div className="field">
      <label htmlFor={id}>{t("bleach.developerLabel")}</label>
      <Select
        id={id}
        value={selected === null ? AUTO_DEVELOPER : String(selected)}
        onChange={value =>
          onManualDeveloperVolumeChange(value === AUTO_DEVELOPER ? null : (Number(value) as DeveloperVolume))
        }
        options={[
          {
            value: AUTO_DEVELOPER,
            label:
              autoDeveloperVolume !== null
                ? t("bleach.developerAutoWith", { developer: formatDeveloperVolume(autoDeveloperVolume) })
                : t("bleach.developerAuto"),
          },
          ...choices.map(volume => ({ value: String(volume), label: formatDeveloperVolume(volume) })),
        ]}
      />
    </div>
  );
}

interface BleachResultProps {
  result: BleachFormula;
}

// Nothing to lift, or a lift too big for one session: then the plan, session by session,
// with the formula below standing for the first one.
export function BleachWarnings({ result }: BleachResultProps) {
  const { t } = useTranslation();
  const sessions = result.sessions ?? [];
  const firstSession = sessions[0];
  return (
    <>
      {result.liftNeeded === 0 && (
        <p className="warning" role="alert">
          {t("bleach.noLiftWarning")}
        </p>
      )}
      {result.multiStepRequired &&
        (firstSession === undefined || sessions.length < 2 ? (
          // A visit saved before the plan existed: it has no sessions and no formula.
          <p className="warning" role="alert">
            {t("bleach.multiStepWarning")}
          </p>
        ) : (
          <div className="bleach__plan" data-row="sessionPlan">
            <p className="warning" role="alert">
              {t("bleach.sessionsWarning", {
                max: result.maxLiftPerSession ?? MAX_LIFT_PER_SESSION,
                target: result.targetLevel,
                count: sessions.length,
                minWeeks: SESSION_BREAK_MIN_WEEKS,
                maxWeeks: SESSION_BREAK_MAX_WEEKS,
                level: firstSession.targetLevel,
              })}
            </p>
            <p className="bleach__plan-title">{t("bleach.sessionPlanLabel")}</p>
            <ol className="bleach__plan-list">
              {sessions.map((session, index) => (
                <li key={session.startLevel}>
                  {t("bleach.sessionLine", {
                    number: index + 1,
                    start: session.startLevel,
                    target: session.targetLevel,
                    developer: formatDeveloperVolume(session.developerVolume),
                    minutes: session.processingMinutes,
                  })}
                  {index < sessions.length - 1 && (
                    <span className="bleach__plan-break">
                      {t("bleach.sessionBreak", { min: SESSION_BREAK_MIN_WEEKS, max: SESSION_BREAK_MAX_WEEKS })}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
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
  const toning = formatBleachToning(result.targetLevel, toner?.line);
  const tonerShades = toner !== undefined ? findBleachToners(toner.brand, toner.line, result.targetLevel) : null;
  // Matrix Super Sync tones with an ash + violet mix (see engine/ashVioletMix.ts).
  const tonerMix = toner !== undefined ? getAshVioletToningHint(toner.line, result.targetLevel) : null;
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
      {tonerMix !== null && (
        <div className="results__row" data-row="tonerMix">
          <span className="results__row-label">{t("bleach.tonerMixLabel")}</span>
          <span>
            {t("bleach.tonerMixValue", {
              first: tonerMix.codes[0],
              second: tonerMix.codes[1],
              ratios: tonerMix.ratios
                .map(ratio => `${ratio.ashParts}:${ratio.violetParts}`)
                .join(t("bleach.tonerMixOr")),
            })}
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
