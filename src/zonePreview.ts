import i18n from "./i18n";
import { shadeToHexColor } from "./engine/color";
import { shadeLabel, type ToneFamily } from "./engine/shades";
import { getUnderlyingPigment } from "./engine/levels";
import { getPrePigmentFillerTone } from "./engine/prePigmentation";
import type { StrandZone } from "./engine/strandZone";
import type { FoilGroup } from "./engine/foil";
import { formatStepZoneLabel } from "./format/formatStepZone";
import type { StartingBaseTone } from "./engine/startingBase";
import type { HistoryStep } from "./history";

// The five StartingBaseTone values that aren't real ToneFamily members (see
// engine/startingBase.ts) -- a compound/blended description of a previously-colored
// base a colorist observed, never a real shade's own reflect. Mapped by dominant
// (first-named) component for rendering purposes only: the "light-" prefix carries no
// extra lightening in the swatch since the zone's own startLevel already provides the
// level, so "light-gold"/"light-copper" collapse to their plain family the same as their
// non-light counterparts.
const COMPOUND_BASE_TONE: Record<
  "copper-gold" | "gold-copper" | "light-gold" | "light-copper" | "red-copper",
  ToneFamily
> = {
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
  // The zone's name, plus the group of hair within it when the zone is worked in foils
  // ("Full head · Strands 1 (~30%)"). Null for a step with no zone.
  zoneLabel: string | null;
  // Set when the zone is split into groups of hair; null for a row covering all of it.
  foilGroup: FoilGroup | null;
  swatches: ZonePreviewSwatch[];
}

function buildStartSwatch(firstStep: HistoryStep): ZonePreviewSwatch {
  const level = firstStep.startLevel;
  const tone: ToneFamily =
    firstStep.startingBase === undefined || firstStep.startingBase.kind === "natural"
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
  const shade =
    achievedLevel !== null && achievedLevel !== step.targetShade.level
      ? { ...step.targetShade, level: achievedLevel }
      : step.targetShade;
  return {
    hex: shadeToHexColor(shade),
    caption: step.targetShade.code,
    title: shadeLabel(shade),
  };
}

function buildStepSwatch(step: HistoryStep): ZonePreviewSwatch {
  return step.kind === "bleach" ? buildBleachSwatch(step) : buildColorSwatch(step);
}

// The rows of one zone. Normally a single chain: every step lands on all hair of the
// zone, one after another. Once any step is placed in foils (see engine/foil.ts) the zone
// is several groups of hair that go different ways, so each group gets its own row:
// its own steps, plus every "all hair" step, in session order. The hair outside the foil
// always gets a row, even with no step of its own -- it shows what the rest of the head
// looks like next to the strands.
function buildZoneRows(zone: StrandZone | undefined, zoneSteps: HistoryStep[]): ZonePreviewRow[] {
  const groups: FoilGroup[] = [];
  for (const step of zoneSteps) {
    if (step.foil !== undefined && !groups.includes(step.foil.group)) groups.push(step.foil.group);
  }

  if (groups.length === 0) {
    return [
      {
        zone,
        zoneLabel: formatStepZoneLabel({ strandZone: zone }),
        foilGroup: null,
        swatches: [buildStartSwatch(zoneSteps[0]), ...zoneSteps.map(buildStepSwatch)],
      },
    ];
  }

  if (!groups.includes("outside")) groups.push("outside");
  return groups.map(group => {
    const groupSteps = zoneSteps.filter(step => step.foil === undefined || step.foil.group === group);
    // The latest estimate the colorist entered for this set of strands.
    const percent =
      zoneSteps.findLast(step => step.foil?.group === group && step.foil.percent !== null)?.foil?.percent ?? null;
    return {
      zone,
      zoneLabel: formatStepZoneLabel({ strandZone: zone, foil: { group, percent } }),
      foilGroup: group,
      swatches: [buildStartSwatch(groupSteps[0] ?? zoneSteps[0]), ...groupSteps.map(buildStepSwatch)],
    };
  });
}

// Groups a session's steps by the strand zone they target (see engine/strandZone.ts),
// each row rendering that zone's starting state followed by one swatch per step that
// touched it -- a visual "before -> ... -> after" forecast, colors sourced entirely from
// the existing shadeToHexColor. `undefined` (a plain single-shot FormulaCalculator save,
// or a step recorded before strandZone existed) is its own bucket, same as
// formatSessionSummary's per-zone grouping in formatSession.ts. A `Map` preserves
// first-insertion key order, so rows come out ordered by each zone's first appearance.
// A zone worked in foils yields one row per group of hair (see buildZoneRows).
export function buildZonePreview(steps: HistoryStep[]): ZonePreviewRow[] {
  const byZone = new Map<StrandZone | undefined, HistoryStep[]>();
  for (const step of steps) {
    const zone = step.strandZone;
    const bucket = byZone.get(zone);
    if (bucket) bucket.push(step);
    else byZone.set(zone, [step]);
  }

  return [...byZone.entries()].flatMap(([zone, zoneSteps]) => buildZoneRows(zone, zoneSteps));
}
