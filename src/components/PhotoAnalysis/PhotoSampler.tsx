import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  measureGreyCard, measureHairColor, type PhotoColorSample,
} from "../../engine/photoColor";
import { usePhotoUpload } from "../FormulaCalculator/usePhotoUpload";
import { readPhotoPixels, type PhotoCrop } from "./readPhotoPixels";
import { PhotoCropSelector, type PhotoRegion } from "./PhotoCropSelector";

export interface PhotoSamplerProps {
  idPrefix: string;
  onSampleChange: (sample: PhotoColorSample | null) => void;
}

// Initial crop guess: a centered 40% box for the hair (roughly where a close-up strand
// photo tends to fill the frame) and a smaller corner box for the grey card -- just a
// starting point for the colorist's own drag, not a detector.
const DEFAULT_CROPS: Record<PhotoRegion, PhotoCrop> = {
  hair: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
  card: { x: 0.05, y: 0.05, width: 0.2, height: 0.2 },
};

const CARD_ERROR_KEYS = {
  tooSmall: "photoAnalysis.errorCardTooSmall",
  clipped: "photoAnalysis.errorCardClipped",
  tooDark: "photoAnalysis.errorCardTooDark",
} as const;

// Photo picker + hair/grey-card region selector + analyze trigger, shared by the
// stylist-facing PhotoEstimate dialog and the admin's ShadeCalibrationDialog -- both
// need exactly this capture flow, differing only in what they do with the resulting
// PhotoColorSample. The photo never leaves the browser: readPhotoPixels decodes it into
// a canvas locally, and only the resulting averaged, grey-card-corrected Lab color
// (measureGreyCard + measureHairColor, engine/photoColor.ts) ever reaches app state.
export function PhotoSampler({ idPrefix, onSampleChange }: PhotoSamplerProps) {
  const { t } = useTranslation();
  const upload = usePhotoUpload();
  const [crops, setCrops] = useState<Record<PhotoRegion, PhotoCrop>>(DEFAULT_CROPS);
  const [activeRegion, setActiveRegion] = useState<PhotoRegion>("hair");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sample, setSample] = useState<PhotoColorSample | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (file: File | null) => {
    upload.handleChange(file);
    setCrops(DEFAULT_CROPS);
    setActiveRegion("hair");
    setSample(null);
    setError(null);
    onSampleChange(null);
  };

  const handleCropChange = (region: PhotoRegion, crop: PhotoCrop) => {
    setCrops(prev => ({ ...prev, [region]: crop }));
    setSample(null);
    setError(null);
    onSampleChange(null);
  };

  const handleAnalyze = async () => {
    if (upload.file === null) return;
    setIsAnalyzing(true);
    setError(null);
    setSample(null);
    onSampleChange(null);
    try {
      const [hairPixels, cardPixels] = await readPhotoPixels(upload.file, [crops.hair, crops.card]);
      const card = measureGreyCard(cardPixels);
      if (!card.ok) {
        setError(t(CARD_ERROR_KEYS[card.reason]));
        return;
      }
      const measured = measureHairColor(hairPixels, card.gains);
      if (measured === null) {
        setError(t("photoAnalysis.errorTooSmall"));
      } else {
        setSample(measured);
        onSampleChange(measured);
      }
    } catch (err) {
      console.error("Photo analysis failed:", err);
      setError(t("photoAnalysis.errorDecode"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <p className="field__hint">{t("photoAnalysis.hint")}</p>

      <div className="field">
        <label htmlFor={`${idPrefix}-photo`}>{t("photoAnalysis.pickPhoto")}</label>
        <input
          id={`${idPrefix}-photo`}
          type="file"
          accept="image/*"
          onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      {upload.previewUrl !== null && (
        <>
          <fieldset className="photo-sampler__regions">
            <legend>{t("photoAnalysis.regionLabel")}</legend>
            <label>
              <input
                type="radio"
                name={`${idPrefix}-region`}
                checked={activeRegion === "hair"}
                onChange={() => setActiveRegion("hair")}
              />
              {t("photoAnalysis.regionHair")}
            </label>
            <label>
              <input
                type="radio"
                name={`${idPrefix}-region`}
                checked={activeRegion === "card"}
                onChange={() => setActiveRegion("card")}
              />
              {t("photoAnalysis.regionCard")}
            </label>
          </fieldset>
          <PhotoCropSelector
            previewUrl={upload.previewUrl}
            crops={crops}
            activeRegion={activeRegion}
            onCropChange={handleCropChange}
          />
        </>
      )}

      <button type="button" className="button" disabled={upload.file === null || isAnalyzing} onClick={handleAnalyze}>
        {isAnalyzing ? t("photoAnalysis.analyzing") : t("photoAnalysis.analyze")}
      </button>

      {error !== null && <p className="warning" role="alert">{error}</p>}

      {sample !== null && (
        <div className="photo-estimate__result">
          <span className="shade-swatch" style={{ backgroundColor: sample.hex }} title={sample.hex} />
          <span>{t("photoAnalysis.measured")}</span>
        </div>
      )}
    </>
  );
}
