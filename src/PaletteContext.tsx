import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BRANDS } from "./engine/brands";
import { buildBrandCatalog, type CustomBrandRecord, type PaletteOverride } from "./engine/paletteOverrides";
import { PaletteReactContext, subscribeToCustomBrands, subscribeToPaletteOverrides, type PaletteState } from "./palette";
import { subscribeToStock, type StockRecord } from "./stock";

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [customBrands, setCustomBrands] = useState<CustomBrandRecord[]>([]);
  const [overrides, setOverrides] = useState<PaletteOverride[]>([]);
  const [stock, setStock] = useState<StockRecord[]>([]);

  useEffect(() => {
    const unsubscribeBrands = subscribeToCustomBrands(setCustomBrands);
    const unsubscribeOverrides = subscribeToPaletteOverrides(setOverrides);
    const unsubscribeStock = subscribeToStock(setStock);
    return () => {
      unsubscribeBrands();
      unsubscribeOverrides();
      unsubscribeStock();
    };
  }, []);

  const brands = useMemo(() => buildBrandCatalog(BRANDS, customBrands, overrides), [customBrands, overrides]);
  const value = useMemo<PaletteState>(() => ({ brands, customBrands, overrides, stock }), [brands, customBrands, overrides, stock]);

  return <PaletteReactContext.Provider value={value}>{children}</PaletteReactContext.Provider>;
}
