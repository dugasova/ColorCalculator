import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BrandId } from "../../engine/brands";
import type { Shade } from "../../engine/shades";
import { shadeCalibrationId } from "../../engine/shadeCalibration";
import type { PhotoColorSample } from "../../engine/photoColor";
import { setShadeCalibration } from "../../shadeCalibrations";
import { Modal } from "../common/Modal";
import { PhotoSampler } from "../PhotoAnalysis/PhotoSampler";

export interface ShadeCalibrationDialogProps {
  brandId: BrandId;
  shade: Shade;
  onClose: () => void;
}

// An admin's "photograph this real swatch next to a grey card" flow (src/shadeCalibrations.ts)
// -- the measured Lab this shade's photo matching ranks against, replacing the synthetic
// shadeToHexColor swatch as the reference color.
export function ShadeCalibrationDialog({ brandId, shade, onClose }: ShadeCalibrationDialogProps) {
  const { t } = useTranslation();
  const [sample, setSample] = useState<PhotoColorSample | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (sample === null) return;
    setSaving(true);
    setError(null);
    try {
      await setShadeCalibration(brandId, shade.line ?? null, shade.code, sample.lab);
      onClose();
    } catch {
      setError(t("palette.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={t("palette.calibrateTitle", { code: shade.code })} onClose={onClose}>
      <p className="field__hint">{t("palette.calibrateHint")}</p>
      <PhotoSampler idPrefix={`calibrate-${shadeCalibrationId(brandId, shade.line ?? null, shade.code)}`} onSampleChange={setSample} />
      <button type="button" className="button" disabled={sample === null || saving} onClick={handleSave}>
        {t("palette.calibrateSave")}
      </button>
      {error !== null && <p className="warning" role="alert">{error}</p>}
    </Modal>
  );
}
