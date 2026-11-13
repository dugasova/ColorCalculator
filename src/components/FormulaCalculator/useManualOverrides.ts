import { useState } from "react";
import type { DeveloperVolume } from "../../engine/levels";
import type { MixingRatio, Shade } from "../../engine/shades";

export interface ManualOverridesSeed {
  manualDeveloperVolume?: DeveloperVolume;
  manualMixingRatio?: MixingRatio;
  processingMinutes?: number;
}

// The colorist's own picks that replace what the calculator would choose for the current
// shade: developer and mixing ratio (only on lines that offer a choice) and processing
// time. All three belong to one shade and are dropped when the target changes.
export function useManualOverrides(targetShade: Shade, initial?: ManualOverridesSeed) {
  const [manualDeveloperVolume, setManualDeveloperVolume] = useState<DeveloperVolume | undefined>(
    initial?.manualDeveloperVolume,
  );
  const [manualMixingRatio, setManualMixingRatio] = useState<MixingRatio | undefined>(initial?.manualMixingRatio);
  const [manualProcessingMinutes, setManualProcessingMinutes] = useState<number | undefined>(
    initial?.processingMinutes,
  );

  // What actually feeds the formula: a line that offers choices defaults to its first one
  // until the colorist picks; a line that doesn't ignores any leftover manual value.
  const effectiveManualDeveloperVolume = targetShade.developerVolumeChoices
    ? (manualDeveloperVolume ?? targetShade.developerVolumeChoices[0])
    : undefined;
  const effectiveManualMixingRatio = targetShade.mixingRatioChoices
    ? (manualMixingRatio ?? targetShade.mixingRatioChoices[0])
    : undefined;

  const resetManualOverrides = () => {
    setManualDeveloperVolume(undefined);
    setManualMixingRatio(undefined);
    setManualProcessingMinutes(undefined);
  };

  return {
    manualDeveloperVolume,
    setManualDeveloperVolume,
    manualMixingRatio,
    setManualMixingRatio,
    manualProcessingMinutes,
    setManualProcessingMinutes,
    effectiveManualDeveloperVolume,
    effectiveManualMixingRatio,
    resetManualOverrides,
  };
}
