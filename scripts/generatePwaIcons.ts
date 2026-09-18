import sharp from "sharp";
import { readFileSync } from "node:fs";

// Rasterizes the app mark (public/favicon.svg, the two-circle Formulist logo) into the PNG
// sizes a PWA manifest, iOS home-screen icon, and the Capacitor Android app need -- none of
// them accept an SVG for these. Re-run with `npm run pwa:icons` whenever favicon.svg's
// artwork changes.
//
// "any"-purpose icons (pwa-*.png) keep the mark full-bleed on a transparent background,
// matching the favicon as displayed today. Every other output sits on an opaque square
// instead: OSes crop maskable icons to their own shape (circle, squircle, rounded square,
// ...), so content must stay inside a safe zone well inside the edge; iOS never respects PNG
// transparency for home-screen icons (it composites onto black); and a splash screen is
// itself the background, with the mark just a small centered accent on top of it.
const SVG_SOURCE = "public/favicon.svg";
const svg = readFileSync(SVG_SOURCE);

// High enough that even the largest (2732px, the Capacitor splash source) target rasterizes
// the 32x32 viewBox artwork crisply before any resize -- downsampling a too-large raster is
// lossless, upsampling a too-small one is not. Scaled up from the original 1000 (tuned for
// a 512px max target) by the same 2732/512 ratio to keep the same oversampling margin.
const RASTER_DENSITY = 5336;

async function generateAnyIcon(size: number, filename: string): Promise<void> {
  await sharp(svg, { density: RASTER_DENSITY })
    .resize(size, size)
    .png()
    .toFile(`public/${filename}`);
}

// Composites the mark, scaled to `markFraction` of `size` and centered, onto a `size`x`size`
// square filled with `background`. Covers every non-transparent output this script produces:
// the maskable/apple-touch PWA icons (markFraction = 1 - 2*safeZonePadding) and the
// Capacitor asset sources in assets/ -- the Android launcher icon (same safe-zone framing)
// and the splash screens (a much smaller, purely decorative markFraction).
async function generateFilledIcon(size: number, outputPath: string, markFraction: number, background: string): Promise<void> {
  const markSize = Math.round(size * markFraction);
  const mark = await sharp(svg, { density: RASTER_DENSITY }).resize(markSize, markSize).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(outputPath);
}

await generateAnyIcon(192, "pwa-192x192.png");
await generateAnyIcon(512, "pwa-512x512.png");
// 10% padding on each side leaves an 80% safe zone, the standard maskable-icon guidance.
await generateFilledIcon(512, "public/maskable-icon-512x512.png", 0.8, "#ffffff");
await generateFilledIcon(180, "public/apple-touch-icon-180x180.png", 0.84, "#ffffff");

// Source material for `npx @capacitor/assets generate --android`: that tool crops/resizes
// these into the app launcher icon (mipmap/adaptive icons) and splash screen drawables under
// android/app/src/main/res/. icon.png reuses the maskable icon's safe-zone framing (same
// OS-side cropping concern); the splash screens instead read as a small centered mark on top
// of a full-bleed background color, so their markFraction is much smaller.
await generateFilledIcon(1024, "assets/icon.png", 0.8, "#ffffff");
await generateFilledIcon(2732, "assets/splash.png", 0.3, "#ffffff");
// Matches --brand-bg under :root[data-theme="dark"] in src/index.css, so the native splash
// screen doesn't flash light before the app's own dark theme takes over.
await generateFilledIcon(2732, "assets/splash-dark.png", 0.3, "#15121e");

console.log("Generated PWA icons in public/: pwa-192x192.png, pwa-512x512.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png");
console.log("Generated Capacitor asset sources in assets/: icon.png, splash.png, splash-dark.png");
