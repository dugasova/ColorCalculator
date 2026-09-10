import i18n from "../i18n";
import type { DeveloperVolume } from "./levels";

// Shared by every format*.ts report (formatFormulaText, formatBleachText,
// formatPrePigmentationText) -- each renders a "Developer: X vol" line identically, an
// em dash standing in for "not achievable in one process" (developerVolume null).
export function formatDeveloperVolumeLine(volume: DeveloperVolume | null): string {
  return volume !== null ? i18n.t("format.developerVolume", { value: volume }) : "—";
}
