import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import type { PhotoCrop } from "./readPhotoPixels";

export type PhotoRegion = "hair" | "card";

export interface PhotoCropSelectorProps {
  previewUrl: string;
  crops: Record<PhotoRegion, PhotoCrop>;
  activeRegion: PhotoRegion;
  onCropChange: (region: PhotoRegion, crop: PhotoCrop) => void;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

// Drag-to-select rectangle over the picked photo's preview, in fractions of the image's
// own displayed size -- what readPhotoPixels crops before measureHairColor/
// measureGreyCard sample it. A drag always edits `activeRegion` only (the region radio
// group above this, see PhotoSampler) -- the other region's rect stays put and renders
// underneath so both selections are visible at once. Drag state is purely local while
// active; a too-small drag (either side under 5% of the image) is discarded on release
// rather than committed, so an accidental tap/click doesn't collapse the selection to
// nothing.
export function PhotoCropSelector({ previewUrl, crops, activeRegion, onCropChange }: PhotoCropSelectorProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<PhotoCrop | null>(null);

  const pointToFraction = (e: ReactPointerEvent<HTMLDivElement>): { x: number; y: number } => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = pointToFraction(e);
    startRef.current = point;
    setDraft({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    if (start === null) return;
    const point = pointToFraction(e);
    setDraft({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  };

  const handlePointerUp = () => {
    if (draft !== null && draft.width >= 0.05 && draft.height >= 0.05) {
      onCropChange(activeRegion, draft);
    }
    startRef.current = null;
    setDraft(null);
  };

  const cardRect = activeRegion === "card" ? draft ?? crops.card : crops.card;
  const hairRect = activeRegion === "hair" ? draft ?? crops.hair : crops.hair;

  return (
    <div
      ref={containerRef}
      className="photo-crop"
      role="group"
      aria-label={t("photoAnalysis.cropLabel")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <img src={previewUrl} alt="" draggable={false} />
      <div
        className="photo-crop__rect photo-crop__rect--card"
        style={{
          left: `${cardRect.x * 100}%`,
          top: `${cardRect.y * 100}%`,
          width: `${cardRect.width * 100}%`,
          height: `${cardRect.height * 100}%`,
        }}
      />
      <div
        className="photo-crop__rect"
        style={{
          left: `${hairRect.x * 100}%`,
          top: `${hairRect.y * 100}%`,
          width: `${hairRect.width * 100}%`,
          height: `${hairRect.height * 100}%`,
        }}
      />
    </div>
  );
}
