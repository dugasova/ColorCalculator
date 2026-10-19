import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BrandId } from "../../engine/brands";
import type { Level } from "../../engine/levels";
import { shadeLabel, type Shade } from "../../engine/shades";
import { shadeToHexColor } from "../../engine/color";
import {
  buildNaturalLevelReferences, calibratedShades, estimateStartLevel, rankShadesByPhotoColor,
  type PhotoColorSample,
} from "../../engine/photoColor";
import { describeShadeMatchQuality } from "../../engine/shadeMatch";
import { usePalette, useShadeCalibrationIndex } from "../../palette";
import { Modal } from "../common/Modal";
import { PhotoSampler } from "./PhotoSampler";
import "./PhotoEstimate.css";
import "../FormulaCalculator/fields/fields.css";

export type PhotoEstimateProps =
  | { mode: "startLevel"; onApplyLevel: (level: Level) => void; idSuffix?: string }
  | { mode: "targetShade"; brandId: BrandId; lineShades: Shade[]; onApplyShade: (code: string) => void; idSuffix?: string };

// Stable identity for the non-targetShade branch below -- a fresh [] literal there would
// change on every render and defeat candidates' own useMemo.
const NO_LINE_SHADES: Shade[] = [];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function qualityLabel(distance: number, t: (key: string) => string): { quality: string; label: string } {
  const quality = describeShadeMatchQuality(distance);
  return { quality, label: t(`fields.crossBrandQuality${capitalize(quality)}`) };
}

// On-device photo-to-color trigger + dialog shared by Starting level (mode "startLevel")
// and the target Shade picker (mode "targetShade") -- see LevelField's `action` slot and
// ShadeField. Ranks only against an admin's own measured shade calibrations
// (src/shadeCalibrations.ts) -- see PhotoSampler and engine/photoColor.ts for why there
// is no synthetic-swatch fallback.
export function PhotoEstimate(props: PhotoEstimateProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const idSuffix = props.idSuffix ?? "";

  return (
    <>
      <button type="button" className="button button--secondary photo-estimate__trigger" onClick={() => setOpen(true)}>
        {t(props.mode === "startLevel" ? "photoAnalysis.triggerLevel" : "photoAnalysis.triggerShade")}
      </button>
      {/* Mounted only while open: unmounting on close resets every bit of dialog state for
          free, and PhotoSampler's own usePhotoUpload cleanup effect revokes the blob
          preview URL. */}
      {open && <PhotoEstimateDialog {...props} idSuffix={idSuffix} onClose={() => setOpen(false)} />}
    </>
  );
}

type PhotoEstimateDialogProps = PhotoEstimateProps & { idSuffix: string; onClose: () => void };

function PhotoEstimateDialog(props: PhotoEstimateDialogProps) {
  const { t } = useTranslation();
  const { idSuffix, onClose } = props;
  const brands = usePalette();
  const calibrationIndex = useShadeCalibrationIndex();
  const [sample, setSample] = useState<PhotoColorSample | null>(null);

  // Mode-specific callbacks/data, captured once outside any closure so later use (inside
  // button onClick handlers below, and useMemo's dependency list) never needs to
  // re-narrow `props`'s discriminated union through a nested function boundary.
  const onApplyLevel = props.mode === "startLevel" ? props.onApplyLevel : null;
  const onApplyShade = props.mode === "targetShade" ? props.onApplyShade : null;
  const brandId = props.mode === "targetShade" ? props.brandId : null;
  const lineShades = props.mode === "targetShade" ? props.lineShades : NO_LINE_SHADES;

  const references = useMemo(() => buildNaturalLevelReferences(brands, calibrationIndex), [brands, calibrationIndex]);
  const candidates = useMemo(
    () => brandId === null ? [] : calibratedShades(brandId, lineShades, calibrationIndex),
    [brandId, lineShades, calibrationIndex]
  );

  const levelEstimate = onApplyLevel !== null && sample !== null ? estimateStartLevel(sample.lab, references) : null;
  const shadeMatches = onApplyShade !== null && sample !== null ? rankShadesByPhotoColor(sample.lab, candidates, 3) : null;
  const bestDistance = levelEstimate?.distance ?? shadeMatches?.[0]?.distance ?? null;
  const showPoorWarning = bestDistance !== null && describeShadeMatchQuality(bestDistance) === "poor";

  return (
    <Modal title={t(props.mode === "startLevel" ? "photoAnalysis.titleLevel" : "photoAnalysis.titleShade")} onClose={onClose}>
      {onApplyLevel !== null ? (
        references.length === 0 ? (
          <p className="field__hint">{t("photoAnalysis.noLevelReferences")}</p>
        ) : (
          <>
            <p className="field__hint">{t("photoAnalysis.calibratedLevels", { levels: references.map(r => r.level).join(", ") })}</p>
            <PhotoSampler idPrefix={`photoEstimate-startLevel${idSuffix}`} onSampleChange={setSample} />
          </>
        )
      ) : (
        candidates.length === 0 ? (
          <p className="cross-brand-match-empty">{t("photoAnalysis.noCalibratedShades")}</p>
        ) : (
          <PhotoSampler idPrefix={`photoEstimate-targetShade${idSuffix}`} onSampleChange={setSample} />
        )
      )}

      {levelEstimate !== null && onApplyLevel !== null && (
        <div className="photo-estimate__result">
          <span
            className="shade-swatch"
            style={{ backgroundColor: shadeToHexColor({ code: String(levelEstimate.level), level: levelEstimate.level, tone: "natural" }) }}
          />
          <div className="cross-brand-match__info">
            <span>{t("photoAnalysis.levelResult", { level: levelEstimate.level, direction: t(`photoAnalysis.direction.${levelEstimate.direction}`) })}</span>
            <span className={`cross-brand-match__quality cross-brand-match__quality--${qualityLabel(levelEstimate.distance, t).quality}`}>
              {qualityLabel(levelEstimate.distance, t).label}
            </span>
          </div>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => { onApplyLevel(levelEstimate.level); onClose(); }}
          >
            {t("photoAnalysis.apply", { level: levelEstimate.level })}
          </button>
        </div>
      )}

      {shadeMatches !== null && onApplyShade !== null && (
        <ul className="cross-brand-match-list">
          {shadeMatches.map(match => {
            const { quality, label } = qualityLabel(match.distance, t);
            return (
              <li key={match.shade.code} className="cross-brand-match">
                <span className="shade-swatch" style={{ backgroundColor: shadeToHexColor(match.shade) }} title={shadeLabel(match.shade)} />
                <div className="cross-brand-match__info">
                  <span className="cross-brand-match__shade">{shadeLabel(match.shade)}</span>
                  <span className={`cross-brand-match__quality cross-brand-match__quality--${quality}`}>{label}</span>
                </div>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => { onApplyShade(match.shade.code); onClose(); }}
                >
                  {t("fields.crossBrandUse")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showPoorWarning && <p className="field__hint">{t("photoAnalysis.poorWarning")}</p>}
    </Modal>
  );
}
