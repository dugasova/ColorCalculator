import i18n from "../i18n";
import type { MixingRatio } from "../engine/shades";
import type { MixCorrector } from "./formulaMessages";

// The correction bowl in one line, the way the formula calculator writes its mix:
// "color- 30.0 g 0/88- 1.0 g 0/66- 1.0 g developer 32.0 g". The base color is not a
// chosen shade here, only its weight; the developer covers the color and the corrector.
export function formatCorrectionMix(baseGrams: number, ratio: MixingRatio, corrector: MixCorrector | null): string {
  const baseDeveloperGrams = (baseGrams * ratio.developerParts) / ratio.colorParts;
  const parts = [i18n.t("format.mixShade", { code: i18n.t("correction.baseDye"), grams: baseGrams.toFixed(1) })];
  for (const part of corrector?.parts ?? []) {
    parts.push(i18n.t("format.mixShade", { code: part.name, grams: part.grams.toFixed(1) }));
  }
  const developerGrams = Math.round((baseDeveloperGrams + (corrector?.developerGrams ?? 0)) * 10) / 10;
  parts.push(i18n.t("format.mixDeveloper", { grams: developerGrams.toFixed(1) }));
  return parts.join(" ");
}
