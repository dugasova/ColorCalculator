import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BRANDS, buildBrandCatalog, type CustomBrandRecord, type PaletteOverride } from "./engine/brands";
import { PaletteReactContext, subscribeToCustomBrands, subscribeToPaletteOverrides, type PaletteState } from "./palette";

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [customBrands, setCustomBrands] = useState<CustomBrandRecord[]>([]);
  const [overrides, setOverrides] = useState<PaletteOverride[]>([]);

  useEffect(() => {
    const unsubscribeBrands = subscribeToCustomBrands(setCustomBrands);
    const unsubscribeOverrides = subscribeToPaletteOverrides(setOverrides);
    return () => {
      unsubscribeBrands();
      unsubscribeOverrides();
    };
  }, []);

  const brands = useMemo(() => buildBrandCatalog(BRANDS, customBrands, overrides), [customBrands, overrides]);
  const value = useMemo<PaletteState>(() => ({ brands, customBrands, overrides }), [brands, customBrands, overrides]);

  return <PaletteReactContext.Provider value={value}>{children}</PaletteReactContext.Provider>;
}
