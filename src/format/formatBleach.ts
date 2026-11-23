import i18n from "../i18n";
import type { Level } from "../engine/levels";
import type { BleachFormula } from "../engine/bleach";
import { getToningRecommendation } from "../engine/neutralize";
import { formatDeveloperVolumeLine } from "./formatDeveloperVolume";
import { formatPigmentName, formatToneName } from "./formulaMessages";

// The background a lightening to `level` leaves and the toner that cancels it, worded for
// the results panel and the copied text alike. `tonerLine` is the toner the colorist
// picked, whose manufacturer may chart its own background and balance (Matrix).
export function formatBleachToning(level: Level, tonerLine?: string | null): { background: string; toner: string } {
  const { background, tones } = getToningRecommendation(level, tonerLine);
  return {
    background: formatPigmentName(background),
    toner: i18n.t("bleach.toningValue", { level, tones: tones.map(formatToneName).join(" + ") }),
  };
}

export interface FormatBleachParams {
  startLevel: Level;
  targetLevel: Level;
  result: BleachFormula;
  processingMinutes: number;
}

// Mirrors formatFormulaText's structure/tone for a bleach (lightening powder) step, so a
// complex-coloring session that mixes bleach and color steps reads consistently.
export function formatBleachText(params: FormatBleachParams): string {
  const { startLevel, targetLevel, result, processingMinutes } = params;

  const title = `${i18n.t("bleach.titlePrefix")} ${i18n.t("bleach.titleAccent")}`;
  const developer = formatDeveloperVolumeLine(result.developerVolume);

  const lines = [
    title,
    i18n.t("format.startingLevel", { start: startLevel, target: targetLevel }),
    i18n.t("format.developer", { value: developer }),
    i18n.t("format.ratio", { color: result.mixingRatio.powderParts, developer: result.mixingRatio.developerParts }),
    result.grams !== null
      ? i18n.t("format.mixValue", {
          value: i18n.t("bleach.mixValue", {
            powder: result.grams.powderGrams.toFixed(1),
            developer: result.grams.developerGrams.toFixed(1),
          }),
        })
      : i18n.t("format.mixFallback", {
          message: result.multiStepRequired ? i18n.t("bleach.multiStepWarning") : i18n.t("bleach.noLiftWarning"),
        }),
    i18n.t("format.processingTime", { value: processingMinutes }),
  ];
  if (result.grams !== null) {
    const toning = formatBleachToning(targetLevel);
    lines.push(`${i18n.t("bleach.backgroundLabel")}: ${toning.background}`);
    lines.push(`${i18n.t("bleach.toningLabel")}: ${toning.toner}`);
  }

  return lines.join("\n");
}
