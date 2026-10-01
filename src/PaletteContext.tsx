import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BRANDS } from "./engine/brands";
import { buildBrandCatalog, type CustomBrandRecord, type PaletteOverride } from "./engine/paletteOverrides";
import { PaletteReactContext, subscribeToCustomBrands, subscribeToPaletteOverrides, type PaletteState } from "./palette";
import { subscribeToStock, type StockRecord } from "./stock";
import { subscribeToPricingSettings, DEFAULT_PRICING_SETTINGS, type PricingSettings } from "./salonSettings";

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [customBrands, setCustomBrands] = useState<CustomBrandRecord[]>([]);
  const [overrides, setOverrides] = useState<PaletteOverride[]>([]);
  const [stock, setStock] = useState<StockRecord[]>([]);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);

  useEffect(() => {
    const unsubscribeBrands = subscribeToCustomBrands(
      setCustomBrands,
      err => console.error("Falling back to the last known custom brands -- could not subscribe to customBrands:", err)
    );
    const unsubscribeOverrides = subscribeToPaletteOverrides(
      setOverrides,
      err => console.error("Falling back to the last known palette overrides -- could not subscribe to paletteOverrides:", err)
    );
    const unsubscribeStock = subscribeToStock(
      setStock,
      err => console.error("Falling back to the last known dye stock -- could not subscribe to dyeStock:", err)
    );
    const unsubscribePricing = subscribeToPricingSettings(setPricingSettings);
    return () => {
      unsubscribeBrands();
      unsubscribeOverrides();
      unsubscribeStock();
      unsubscribePricing();
    };
  }, []);

  const brands = useMemo(() => buildBrandCatalog(BRANDS, customBrands, overrides), [customBrands, overrides]);
  const value = useMemo<PaletteState>(
    () => ({ brands, customBrands, overrides, stock, pricingSettings }),
    [brands, customBrands, overrides, stock, pricingSettings]
  );

  return <PaletteReactContext.Provider value={value}>{children}</PaletteReactContext.Provider>;
}
