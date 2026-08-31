import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Shade } from "../../../engine/shades";
import type { Brand, BrandId } from "../../../engine/brands";
import { shadeToHexColor } from "../../../engine/color";
import { findClosestShadeByBrand, describeShadeMatchQuality, getLinePermanence } from "../../../engine/shadeMatch";

export interface CrossBrandMatchFieldProps {
  targetShade: Shade;
  currentBrandId: BrandId;
  brands: Record<BrandId, Brand>;
  onSelectMatch: (brandId: BrandId, line: string | null, shadeCode: string) => void;
  idSuffix?: string;
}

function shadeLabel(shade: Shade): string {
  return `${shade.code} ${shade.tone}${shade.secondaryTone ? '/' + shade.secondaryTone : ''}`;
}

// For when the current brand/shade is out of stock: ranks the single closest-looking shade
// in every OTHER brand in the palette by perceptual color distance (see
// findClosestShadeByBrand), so a colorist can see at a glance what else in the salon would
// pass for the same result -- and a plain-language match quality (describeShadeMatchQuality)
// instead of a raw delta-E number nobody but a color scientist would recognize. Collapsed by
// default; computing every brand's closest shade is cheap but pointless until asked for.
export function CrossBrandMatchField({ targetShade, currentBrandId, brands, onSelectMatch, idSuffix = '' }: CrossBrandMatchFieldProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const panelId = `crossBrandMatchPanel${idSuffix}`;
  const targetPermanence = getLinePermanence(targetShade.line);
  const matches = expanded && targetPermanence !== null ? findClosestShadeByBrand(targetShade, brands, currentBrandId) : [];

  return (
    <div className="field cross-brand-match-group">
      <button
        type="button"
        className="button button--secondary"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(value => !value)}
      >
        {t('fields.crossBrandFind')}
      </button>
      {expanded && (
        <div id={panelId}>
          {targetPermanence === null ? (
            <p className="cross-brand-match-empty">{t('fields.crossBrandUnknownPermanence')}</p>
          ) : matches.length === 0 ? (
            <p className="cross-brand-match-empty">{t('fields.crossBrandEmpty')}</p>
          ) : (
            <ul className="cross-brand-match-list">
              {matches.map(match => {
                const quality = describeShadeMatchQuality(match.distance);
                return (
                  <li key={match.brandId} className="cross-brand-match">
                    <span
                      className="shade-swatch"
                      style={{ backgroundColor: shadeToHexColor(match.shade) }}
                      title={shadeLabel(match.shade)}
                    />
                    <div className="cross-brand-match__info">
                      <span className="cross-brand-match__brand">{match.brandName}</span>
                      <span className="cross-brand-match__shade">{shadeLabel(match.shade)}</span>
                      <span className={`cross-brand-match__quality cross-brand-match__quality--${quality}`}>
                        {t(`fields.crossBrandQuality${quality.charAt(0).toUpperCase()}${quality.slice(1)}`)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => onSelectMatch(match.brandId, match.shade.line ?? null, match.shade.code)}
                    >
                      {t('fields.crossBrandUse')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
