import sharp from "sharp";
import { readFileSync } from "node:fs";

// Rasterizes the app mark (public/favicon.svg, the two-circle Formulist logo) into the PNG
// sizes a PWA manifest and iOS home-screen icon need -- browsers/OSes don't accept an SVG
// for these. Re-run with `npm run pwa:icons` whenever favicon.svg's artwork changes.
//
// "any"-purpose icons (pwa-*.png) keep the mark full-bleed on a transparent background,
// matching the favicon as displayed today. "maskable"/apple-touch icons instead sit on an
// opaque white square with generous padding: OSes crop maskable icons to their own shape
// (circle, squircle, rounded square, ...), so content must stay inside a safe zone well
// inside the edge, and iOS never respects PNG transparency for home-screen icons (it
// composites onto black), so those need a real background fill regardless.
const SVG_SOURCE = "public/favicon.svg";
const svg = readFileSync(SVG_SOURCE);

// High enough that even the largest (512px) target rasterizes the 32x32 viewBox artwork
// crisply before any resize -- downsampling a too-large raster is lossless, upsampling a
// too-small one is not.
const RASTER_DENSITY = 1000;

async function generateAnyIcon(size: number, filename: string): Promise<void> {
  await sharp(svg, { density: RASTER_DENSITY })
    .resize(size, size)
    .png()
    .toFile(`public/${filename}`);
}

async function generateBrandedIcon(size: number, filename: string, safeZonePadding: number): Promise<void> {
  const markSize = Math.round(size * (1 - safeZonePadding * 2));
  const mark = await sharp(svg, { density: RASTER_DENSITY }).resize(markSize, markSize).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(`public/${filename}`);
}

await generateAnyIcon(192, "pwa-192x192.png");
await generateAnyIcon(512, "pwa-512x512.png");
// 10% padding on each side leaves an 80% safe zone, the standard maskable-icon guidance.
await generateBrandedIcon(512, "maskable-icon-512x512.png", 0.1);
await generateBrandedIcon(180, "apple-touch-icon-180x180.png", 0.08);

console.log("Generated PWA icons in public/: pwa-192x192.png, pwa-512x512.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png");
