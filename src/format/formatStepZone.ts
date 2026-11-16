import i18n from "../i18n";
import { STRAND_ZONE_I18N_KEY, type StrandZone } from "../engine/strandZone";
import { FOIL_GROUP_I18N_KEY, type FoilPlacement } from "../engine/foil";

// "Strands 1 (~30%)" / "Outside foil" -- the foil part of a step's or a preview row's label.
export function formatFoilPlacement(foil: FoilPlacement): string {
  const group = i18n.t(`fields.foil.${FOIL_GROUP_I18N_KEY[foil.group]}`);
  return foil.percent !== null ? i18n.t("format.foilWithPercent", { group, percent: foil.percent }) : group;
}

// Where a step is applied, as one label: its zone, plus its foil placement when the zone
// is worked in foils ("Full head · Strands 1 (~30%)"). Null for a step with no zone (a
// plain single-formula save, or one saved before zones existed).
export function formatStepZoneLabel(step: { strandZone?: StrandZone; foil?: FoilPlacement }): string | null {
  if (step.strandZone === undefined) return null;
  const zone = i18n.t(`fields.strandZone.${STRAND_ZONE_I18N_KEY[step.strandZone]}`);
  return step.foil !== undefined ? `${zone} · ${formatFoilPlacement(step.foil)}` : zone;
}
