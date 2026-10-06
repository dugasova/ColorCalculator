import i18n from "../i18n";
import { DEVELOPER_VOLUME_PERCENT, type DeveloperVolume } from "./levels";

// The single formatter every developer-strength label goes through, rendering the
// percentage printed on the bottle alongside the nominal vol number (e.g. "6% (20 vol)")
// -- see DEVELOPER_VOLUME_PERCENT for why this isn't a flat `vol * 0.3`. `percentOverride`
// (Shade.developerPercentOverride, shades.ts) replaces the table lookup for a shade whose
// real product's strength doesn't match the generic table value for its nearest
// DeveloperVolume -- e.g. Redken Shades EQ's ~2% Processing Solution routed through 6vol
// (whose table value, 1.9%, is Wella/Igora/L'Oréal's genuine 6vol product, not Redken's).
export function formatDeveloperVolume(volume: DeveloperVolume, percentOverride?: number): string {
  return i18n.t("format.developerVolume", { value: volume, percent: percentOverride ?? DEVELOPER_VOLUME_PERCENT[volume] });
}

// Shared by every format*.ts report (formatFormulaText, formatBleachText,
// formatPrePigmentationText) -- each renders a "Developer: X% (Y vol)" line identically,
// an em dash standing in for "not achievable in one process" (developerVolume null).
export function formatDeveloperVolumeLine(volume: DeveloperVolume | null, percentOverride?: number): string {
  return volume !== null ? formatDeveloperVolume(volume, percentOverride) : "—";
}
