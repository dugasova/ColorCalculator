import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePaletteAdmin } from "../../palette";
import { BRANDS } from "../../engine/brands";
import { getDisabledShadeKeys, getFullBrandShades } from "../../engine/paletteOverrides";
import { AddBrandForm } from "./AddBrandForm";
import { BrandShadeList } from "./BrandShadeList";
import { AddShadeForm } from "./AddShadeForm";
import "../FormulaCalculator/FormulaCalculator.css";
import "./PaletteAdminView.css";

// Three independent admin tasks over the shared brand/shade catalog (see palette.ts):
// adding a whole new brand, viewing/discontinuing a brand's shades, and adding a shade
// to one. This view only owns the state genuinely shared between them -- which brand is
// selected, and its resolved shade list -- and hands each task off to its own component.
export function PaletteAdminView() {
  const { t } = useTranslation();
  const { brands, customBrands, overrides } = usePaletteAdmin();
  const brandIds = Object.keys(brands).sort((a, b) => brands[a].name.localeCompare(brands[b].name));

  const [selectedBrandId, setSelectedBrandId] = useState(brandIds[0] ?? "generic");
  // Falls back to the first available brand when the previously selected one no longer
  // exists (e.g. it was the very first render, before any brand existed).
  const effectiveSelectedBrandId = brands[selectedBrandId] !== undefined ? selectedBrandId : (brandIds[0] ?? "generic");
  const fullShades = getFullBrandShades(BRANDS, customBrands, overrides, effectiveSelectedBrandId)
    .slice()
    .sort((a, b) => a.level - b.level || a.code.localeCompare(b.code));
  const disabledKeys = getDisabledShadeKeys(overrides, effectiveSelectedBrandId);

  return (
    <div className="calculator calculator--wide">
      <h1 className="calculator__title">{t("palette.titlePrefix")} <span className="calculator__title-accent">{t("palette.titleAccent")}</span></h1>

      <AddBrandForm brands={brands} onBrandAdded={setSelectedBrandId} />

      <BrandShadeList
        brands={brands}
        brandIds={brandIds}
        selectedBrandId={effectiveSelectedBrandId}
        onSelectBrand={setSelectedBrandId}
        shades={fullShades}
        disabledKeys={disabledKeys}
      />

      <AddShadeForm brandId={effectiveSelectedBrandId} existingShades={fullShades} />
    </div>
  );
}
