import { useState } from "react";
import {
  APPLICATION_ZONE_DEFAULT_COLOR_GRAMS,
  APPLICATION_ZONE_DEFAULT_GRAMS,
  APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE,
  type ApplicationZone,
  type GramsInputMode,
} from "../../engine/applicationZone";
import { calculateFormulaGramsFromColorGrams } from "../../engine/formula";
import type { MixingRatio } from "../../engine/shades";

export interface GramsInputSeed {
  totalGrams?: number;
  colorGrams?: number;
}

// How much to mix: the application zone, and the amount entered either as a total mix
// weight or as the dye weight alone. `mixingRatio` is the formula's resolved ratio.
export function useGramsInput(mixingRatio: MixingRatio, initial?: GramsInputSeed) {
  const [applicationZone, setApplicationZone] = useState<ApplicationZone>("full-head");
  // Undefined until the colorist (or a repeated visit) sets a total: the field then shows
  // the zone's default, see `totalGrams` below.
  const [manualTotalGrams, setTotalGrams] = useState<number | undefined>(initial?.totalGrams);
  // Which unit the amount field starts in for the current zone (see
  // APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE); colorGrams below is the dye weight alone
  // for "color" mode -- a colorist who needs more than the default can just enter
  // however much dye they're actually using, and developer is derived to match (see
  // calculateFullFormula's colorGramsOverride).
  const [gramsInputMode, setGramsInputMode] = useState<GramsInputMode>(
    APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE["full-head"],
  );
  const [colorGrams, setColorGrams] = useState(
    initial?.colorGrams ?? APPLICATION_ZONE_DEFAULT_COLOR_GRAMS["full-head"],
  );

  // The mix the current dye amount makes: dye plus the developer the ratio asks for.
  const dyeGrams = calculateFormulaGramsFromColorGrams(colorGrams, mixingRatio);
  const totalFromColorGrams = Math.round((dyeGrams.colorGrams + dyeGrams.developerGrams) * 10) / 10;
  // A zone measured as dye (root touch-up) has no fixed default total: switching it to
  // "total" shows the same mix as a total, so the dye amount stays what it was and the
  // total follows the ratio when the shade or line changes.
  const totalGrams = manualTotalGrams ?? APPLICATION_ZONE_DEFAULT_GRAMS[applicationZone] ?? totalFromColorGrams;

  const handleApplicationZoneChange = (zone: ApplicationZone) => {
    setApplicationZone(zone);
    setTotalGrams(undefined);
    setColorGrams(APPLICATION_ZONE_DEFAULT_COLOR_GRAMS[zone]);
    setGramsInputMode(APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE[zone]);
  };

  // The real primary mix total (color + developer), excluding additional shades --
  // "color" mode never touches `totalGrams` itself, so callers that need the actual
  // total for something else (e.g. pre-pigmentation filler sizing) must read this
  // instead of raw `totalGrams`.
  const effectiveTotalGrams = gramsInputMode === "color" ? dyeGrams.colorGrams + dyeGrams.developerGrams : totalGrams;

  return {
    applicationZone,
    setApplicationZone,
    totalGrams,
    setTotalGrams,
    gramsInputMode,
    setGramsInputMode,
    colorGrams,
    setColorGrams,
    colorGramsOverride: gramsInputMode === "color" ? colorGrams : undefined,
    effectiveTotalGrams,
    handleApplicationZoneChange,
  };
}
