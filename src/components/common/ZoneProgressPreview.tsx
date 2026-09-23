import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { buildZonePreview } from "../../zonePreview";
import type { HistoryStep } from "../../history";
import "./ZoneProgressPreview.css";

export interface ZoneProgressPreviewProps {
  steps: HistoryStep[];
}

// A visual "before -> ... -> after" forecast for each strand zone a session touches: the
// zone's starting swatch, then one swatch per step that targeted it, ending in its final
// result. Purely a rendering of buildZonePreview (zonePreview.ts) -- all derivation
// (grouping, tone resolution, hex lookup) lives there so this stays a dumb renderer,
// matching formatSession.ts/FormattedSessionText's own split. Renders nothing for a
// session with no steps.
export function ZoneProgressPreview({ steps }: ZoneProgressPreviewProps) {
  const { t } = useTranslation();
  const rows = buildZonePreview(steps);
  if (rows.length === 0) return null;

  return (
    <>
      <h2 className="results__section-heading">{t("zonePreview.title")}</h2>
      {rows.map((row, rowIndex) => (
        <div className="zone-preview__row" key={row.zone ?? `__none-${rowIndex}`}>
          {row.zoneLabel !== null && <span className="zone-preview__zone">{row.zoneLabel}</span>}
          {row.swatches.map((swatch, index) => (
            <Fragment key={index}>
              {index > 0 && <span className="zone-preview__arrow" aria-hidden="true">→</span>}
              <div className="zone-preview__stop">
                <span className="zone-preview__swatch" style={{ backgroundColor: swatch.hex }} title={swatch.title} />
                <span className="zone-preview__caption">{swatch.caption}</span>
              </div>
            </Fragment>
          ))}
        </div>
      ))}
    </>
  );
}
