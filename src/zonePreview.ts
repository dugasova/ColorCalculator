import i18n from "./i18n";
import { shadeToHexColor } from "./engine/color";
import { shadeLabel, type ToneFamily } from "./engine/shades";
import { getUnderlyingPigment } from "./engine/levels";
import { getPrePigmentFillerTone } from "./engine/prePigmentation";
import { STRAND_ZONE_I18N_KEY, type StrandZone } from "./engine/strandZone";
import type { StartingBaseTone } from "./engine/startingBase";
import type { HistoryStep } from "./history";

// The five StartingBaseTone values that aren't real ToneFamily members (see
// engine/startingBase.ts) -- a compound/blended description of a previously-colored
// base a colorist observed, never a real shade's own reflect. Mapped by dominant
// (first-named) component for rendering purposes only: the "light-" prefix carries no
// extra lightening in the swatch since the zone's own startLevel already provides the
// level, so "light-gold"/"light-copper" collapse to their plain family the same as their
// non-light counterparts.
const COMPOUND_BASE_TONE: Record<"copper-gold" | "gold-copper" | "light-gold" | "light-copper" | "red-copper", ToneFamily> = {
  "copper-gold": "copper",
  "gold-copper": "gold",
  "light-gold": "gold",
  "light-copper": "copper",
  "red-copper": "red",
};

function resolveStartingBaseTone(tone: StartingBaseTone): ToneFamily {
  return COMPOUND_BASE_TONE[tone as keyof typeof COMPOUND_BASE_TONE] ?? (tone as ToneFamily);
}

export interface ZonePreviewSwatch {
  hex: string;
  caption: string;
  title: string;
}

export interface ZonePreviewRow {
  zone: StrandZone | undefined;
  zoneLabel: string | null;
  swatches: ZonePreviewSwatch[];
}

function buildStartSwatch(firstStep: HistoryStep): ZonePreviewSwatch {
  const level = firstStep.startLevel;
  const tone: ToneFamily = firstStep.startingBase === undefined || firstStep.startingBase.kind === "natural"
    ? "natural"
    : resolveStartingBaseTone(firstStep.startingBase.tone);
  return {
    hex: shadeToHexColor({ code: String(level), level, tone }),
    caption: String(level),
    title: i18n.t("zonePreview.startTitle", { level }),
  };
}

function buildBleachSwatch(step: Extract<HistoryStep, { kind: "bleach" }>): ZonePreviewSwatch {
  const level = step.targetLevel;
  const tone = getPrePigmentFillerTone(getUnderlyingPigment(level));
  return {
    hex: shadeToHexColor({ code: String(level), level, tone }),
    caption: String(level),
    title: i18n.t("zonePreview.bleachTitle", { level }),
  };
}

function buildColorSwatch(step: Extract<HistoryStep, { kind: "color" }>): ZonePreviewSwatch {
  const achievedLevel = step.result.achievedLevel;
  const shade = achievedLevel !== null && achievedLevel !== step.targetShade.level
    ? { ...step.targetShade, level: achievedLevel }
    : step.targetShade;
  return {
    hex: shadeToHexColor(shade),
    caption: step.targetShade.code,
    title: shadeLabel(shade),
  };
}

// Groups a session's steps by the strand zone they target (see engine/strandZone.ts),
// each row rendering that zone's starting state followed by one swatch per step that
// touched it -- a visual "before -> ... -> after" forecast, colors sourced entirely from
// the existing shadeToHexColor. `undefined` (a plain single-shot FormulaCalculator save,
// or a step recorded before strandZone existed) is its own bucket, same as
// formatSessionSummary's per-zone grouping in formatSession.ts. A `Map` preserves
// first-insertion key order, so rows come out ordered by each zone's first appearance.
export function buildZonePreview(steps: HistoryStep[]): ZonePreviewRow[] {
  const byZone = new Map<StrandZone | undefined, HistoryStep[]>();
  for (const step of steps) {
    const zone = step.strandZone;
    const bucket = byZone.get(zone);
    if (bucket) bucket.push(step);
    else byZone.set(zone, [step]);
  }

  return [...byZone.entries()].map(([zone, zoneSteps]) => {
    const swatches: ZonePreviewSwatch[] = [buildStartSwatch(zoneSteps[0])];
    for (const step of zoneSteps) {
      swatches.push(step.kind === "bleach" ? buildBleachSwatch(step) : buildColorSwatch(step));
    }
    return {
      zone,
      zoneLabel: zone !== undefined ? i18n.t(`fields.strandZone.${STRAND_ZONE_I18N_KEY[zone]}`) : null,
      swatches,
    };
  });
}
