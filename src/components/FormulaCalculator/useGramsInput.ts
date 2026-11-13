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
// weight or as the dye weight alone.
export function useGramsInput(initial?: GramsInputSeed) {
  const [applicationZone, setApplicationZone] = useState<ApplicationZone>("full-head");
  const [totalGrams, setTotalGrams] = useState(initial?.totalGrams ?? APPLICATION_ZONE_DEFAULT_GRAMS["full-head"]);
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

  const handleApplicationZoneChange = (zone: ApplicationZone) => {
    setApplicationZone(zone);
    setTotalGrams(APPLICATION_ZONE_DEFAULT_GRAMS[zone]);
    setColorGrams(APPLICATION_ZONE_DEFAULT_COLOR_GRAMS[zone]);
    setGramsInputMode(APPLICATION_ZONE_DEFAULT_GRAMS_INPUT_MODE[zone]);
  };

  // The real primary mix total (color + developer), excluding additional shades --
  // "color" mode never touches `totalGrams` itself, so callers that need the actual
  // total for something else (e.g. pre-pigmentation filler sizing) must read this
  // instead of raw `totalGrams`.
  const effectiveTotalGramsFor = (mixingRatio: MixingRatio): number => {
    if (gramsInputMode !== "color") return totalGrams;
    const grams = calculateFormulaGramsFromColorGrams(colorGrams, mixingRatio);
    return grams.colorGrams + grams.developerGrams;
  };

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
    effectiveTotalGramsFor,
    handleApplicationZoneChange,
  };
}
