import { useTranslation } from "react-i18next";
import type { Shade } from "../../../engine/shades";
import { splitShadeBlend } from "../../../engine/formula";
import { blendShadeHexColors } from "../../../engine/color";

export interface BlendRatioFieldProps {
  shadeA: Shade;
  shadeB: Shade;
  colorGrams: number;
  primaryPercent: number;
  onPrimaryPercentChange: (percent: number) => void;
  idSuffix?: string;
}

// Component A's share, %, for the quick-pick buttons — matches the two splits colorists
// reach for most: an even blend, or a 70/30 lean toward the primary reflect.
const RATIO_PRESETS = [50, 70] as const;

// Only rendered once both blend components are chosen (see BlendComponentField). Splits
// the already-calculated color total between them and previews the resulting swatch.
export function BlendRatioField({
  shadeA, shadeB, colorGrams, primaryPercent, onPrimaryPercentChange, idSuffix = '',
}: BlendRatioFieldProps) {
  const { t } = useTranslation();
  const { primaryGrams, secondaryGrams } = splitShadeBlend(colorGrams, primaryPercent);

  return (
    <div className="field">
      <label htmlFor={`blendRatio${idSuffix}`}>{t('fields.blendRatio')}</label>
      <div className="blend-ratio">
        {RATIO_PRESETS.map(percent => (
          <button
            key={percent}
            type="button"
            className={`button button--secondary ${primaryPercent === percent ? 'button--active' : ''}`}
            onClick={() => onPrimaryPercentChange(percent)}
          >
            {percent}/{100 - percent}
          </button>
        ))}
        <input
          id={`blendRatio${idSuffix}`}
          type="number"
          min={0}
          max={100}
          step={5}
          value={primaryPercent}
          onChange={e => onPrimaryPercentChange(Number(e.target.value))}
        />
        <span
          className="shade-swatch"
          style={{ backgroundColor: blendShadeHexColors(shadeA, shadeB, primaryPercent) }}
          title={t('fields.blendRatioPreview', {
            primaryCode: shadeA.code, primaryPercent,
            secondaryCode: shadeB.code, secondaryPercent: 100 - primaryPercent,
          })}
        />
      </div>
      <span className="blend-ratio__grams">
        {t('fields.blendRatioGrams', { primaryCode: shadeA.code, primaryGrams: primaryGrams.toFixed(1), secondaryCode: shadeB.code, secondaryGrams: secondaryGrams.toFixed(1) })}
      </span>
    </div>
  );
}
