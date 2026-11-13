import { useState } from "react";
import type { Shade } from "../../engine/shades";

export interface AdditionalShadesSeed {
  additionalShadeCode?: string | null;
  additionalShadeGrams?: number;
  additionalShade2Code?: string | null;
  additionalShade2Grams?: number;
}

// Up to two extra shades the colorist blends in on top of the calculated mix, each with
// grams entered by hand. Resolved against the current line's shades: a code the line
// doesn't have counts as no shade.
export function useAdditionalShades(lineShades: Shade[], initial?: AdditionalShadesSeed) {
  const [additionalShadeCode, setAdditionalShadeCode] = useState<string | null>(initial?.additionalShadeCode ?? null);
  const [additionalShadeGrams, setAdditionalShadeGrams] = useState(initial?.additionalShadeGrams ?? 0);
  const [additionalShade2Code, setAdditionalShade2Code] = useState<string | null>(
    initial?.additionalShade2Code ?? null,
  );
  const [additionalShade2Grams, setAdditionalShade2Grams] = useState(initial?.additionalShade2Grams ?? 0);

  const additionalShade =
    additionalShadeCode !== null ? (lineShades.find(s => s.code === additionalShadeCode) ?? null) : null;
  const additionalShade2 =
    additionalShade2Code !== null ? (lineShades.find(s => s.code === additionalShade2Code) ?? null) : null;
  const hasShade1 = additionalShade !== null && additionalShadeGrams > 0;
  const hasShade2 = additionalShade2 !== null && additionalShade2Grams > 0;
  // Dye weight the additional shades add on top of the base color.
  const totalExtraGrams = (hasShade1 ? additionalShadeGrams : 0) + (hasShade2 ? additionalShade2Grams : 0);

  const handleAdditionalShadeCodeChange = (code: string | null) => {
    setAdditionalShadeCode(code);
    setAdditionalShadeGrams(0);
  };

  // For when the available-shade pool changes (new brand or line): a selection may no
  // longer exist in the new pool at all.
  const resetAdditionalShades = () => {
    setAdditionalShade2Code(null);
    setAdditionalShade2Grams(0);
    setAdditionalShadeCode(null);
    setAdditionalShadeGrams(0);
  };

  return {
    additionalShadeCode,
    setAdditionalShadeCode,
    additionalShadeGrams,
    setAdditionalShadeGrams,
    additionalShade2Code,
    setAdditionalShade2Code,
    additionalShade2Grams,
    setAdditionalShade2Grams,
    additionalShade,
    additionalShade2,
    totalExtraGrams,
    handleAdditionalShadeCodeChange,
    resetAdditionalShades,
  };
}
