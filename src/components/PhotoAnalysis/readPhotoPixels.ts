// Crop rectangle in fractions (0..1) of the source image's own width/height -- matches
// PhotoCropSelector's drag-to-select state, so it can feed straight into readPhotoPixels
// with no pixel-unit conversion at the call site.
export interface PhotoCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Downscale ceiling (longest side, px) for each decoded sample -- measureHairColor/
// measureGreyCard only need an averaged color, not full resolution, and capping the
// canvas keeps decoding a multi-megapixel phone photo fast and memory-light.
export const MAX_SAMPLE_SIDE = 200;

function sampleCrop(bitmap: ImageBitmap, crop: PhotoCrop): Uint8ClampedArray {
  const sx = Math.round(crop.x * bitmap.width);
  const sy = Math.round(crop.y * bitmap.height);
  const sw = Math.max(1, Math.round(crop.width * bitmap.width));
  const sh = Math.max(1, Math.round(crop.height * bitmap.height));

  const scale = Math.min(1, MAX_SAMPLE_SIDE / Math.max(sw, sh));
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) throw new Error("canvas 2d unavailable");

  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
  return ctx.getImageData(0, 0, dw, dh).data;
}

// Decodes `file` fully on-device (createImageBitmap + canvas, never uploaded) once, and
// returns the RGBA pixel data of each cropped region (in `crops` order), downscaled to at
// most MAX_SAMPLE_SIDE on its longest side -- one call samples both the hair and grey
// card regions of the same photo (see PhotoSampler). Throws if the file can't be decoded
// as an image or a 2D canvas context is unavailable -- the caller is responsible for
// catching and reporting that as a user-facing error.
export async function readPhotoPixels(file: File, crops: readonly PhotoCrop[]): Promise<Uint8ClampedArray[]> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    return crops.map(crop => sampleCrop(bitmap, crop));
  } finally {
    bitmap.close();
  }
}
