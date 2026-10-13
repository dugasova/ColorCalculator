import { useTranslation } from "react-i18next";
import type { BrandId } from "../../../engine/brands";
import { shadeLabel, type Shade } from "../../../engine/shades";
import { shadeToHexColor } from "../../../engine/color";
import { Select } from "../../common/Select";
import { PhotoEstimate } from "../../PhotoAnalysis/PhotoEstimate";

export interface ShadeFieldProps {
  brandId: BrandId;
  lineShades: Shade[];
  targetShadeCode: string;
  targetShade: Shade;
  onTargetShadeCodeChange: (code: string) => void;
  idSuffix?: string;
}

export function ShadeField({ brandId, lineShades, targetShadeCode, targetShade, onTargetShadeCodeChange, idSuffix = "" }: ShadeFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="field">
      <label htmlFor={`targetShadeCode${idSuffix}`}>{t("fields.shade")}</label>
      <div className="shade-field">
        <Select
          id={`targetShadeCode${idSuffix}`}
          value={targetShadeCode}
          onChange={onTargetShadeCodeChange}
          searchable
          options={lineShades.map(shade => ({
            value: shade.code,
            label: shadeLabel(shade),
            searchText: shade.code,
            swatchColor: shadeToHexColor(shade),
          }))}
        />
        <span
          className="shade-swatch"
          style={{ backgroundColor: shadeToHexColor(targetShade) }}
          title={shadeLabel(targetShade)}
        />
      </div>
      <PhotoEstimate mode="targetShade" brandId={brandId} lineShades={lineShades} onApplyShade={onTargetShadeCodeChange} idSuffix={idSuffix} />
    </div>
  );
}
