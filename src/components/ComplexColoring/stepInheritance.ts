import type { StrandZone } from "../../engine/strandZone";
import type { StartingBase } from "../../engine/startingBase";
import type { HairCanvas } from "../../engine/canvas";
import type { HistoryStep } from "../../history";

export interface InheritedZoneState {
  startingBase: StartingBase;
  canvas: HairCanvas;
}

// Finds the most recent earlier step in this session that targeted the same strand zone
// (e.g. a bleach step lifting "Roots" before a later color step also on "Roots") and
// returns the hair-state description it recorded -- starting base and canvas (porosity/
// thickness/chemical history). Lets the next same-zone step default to that state instead
// of the colorist re-picking identical values by hand, which is also exactly what
// formatSession.ts's own same-zone dedup (see sameZoneAndCanvasState there) collapses
// into a single recap line once it matches. Deliberately excludes startLevel -- unlike
// hair state, level legitimately changes step to step even within one zone (that's the
// lift/bleach step's whole purpose), so it stays a plain colorist-entered value here.
// Returns null when no earlier step touched this zone, or the one that did predates
// startingBase/canvas existing (both undefined, e.g. a step loaded from very old history).
export function getInheritedZoneState(previousSteps: HistoryStep[], zone: StrandZone): InheritedZoneState | null {
  for (let i = previousSteps.length - 1; i >= 0; i--) {
    const step = previousSteps[i];
    if (step.strandZone !== zone) continue;
    if (step.startingBase === undefined || step.canvas === undefined) return null;
    return { startingBase: step.startingBase, canvas: step.canvas };
  }
  return null;
}
