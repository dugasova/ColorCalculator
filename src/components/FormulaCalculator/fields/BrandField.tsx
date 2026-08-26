import { useTranslation } from "react-i18next";
import type { BrandId } from "../../../engine/brands";
import { usePalette } from "../../../palette";

export interface BrandFieldProps {
  brandId: BrandId;
  onBrandIdChange: (brandId: BrandId) => void;
  idSuffix?: string;
}

export function BrandField({ brandId, onBrandIdChange, idSuffix = '' }: BrandFieldProps) {
  const { t } = useTranslation();
  const brands = usePalette();
  // A custom brand an admin has just created but hasn't added any shades to yet has
  // nothing a calculator could select — hide it until it has at least one shade.
  const selectableBrands = Object.values(brands).filter(brand => brand.shades.length > 0);
  return (
    <div className="field">
      <label htmlFor={`brandId${idSuffix}`}>{t('fields.brand')}</label>
      <select
        name={`brandId${idSuffix}`}
        id={`brandId${idSuffix}`}
        value={brandId}
        onChange={e => onBrandIdChange(e.target.value as BrandId)}>
        {selectableBrands.map(brand => (
          <option key={brand.id} value={brand.id}>{brand.name}</option>
        ))}
      </select>
    </div>
  );
}
