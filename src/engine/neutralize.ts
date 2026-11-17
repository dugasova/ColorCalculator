import { getUnderlyingPigment } from "./levels";
import type { Level, UnderlyingPigment } from "./levels";
import type { Shade, ToneFamily } from "./shades";

// What lifting reveals, and what cancels it.
//
// Lightening hair exposes its warm background; the lighter the level reached, the more
// the background moves from red through orange to yellow. A formula has to carry the
// opposite color of the color wheel or the result turns out warmer than the shade chart
// shows. One level's background is often a blend (yellow-orange at level 8), and then so
// is its neutralizer (blue with violet), so both are modeled as mixes, not single tones.
//
// The background per level is levels.ts's getUnderlyingPigment; the table below is the
// colorist's working rule for what cancels it, confirmed 2026-11-16.

// The three colors that cancel a warm background: green cancels red, blue cancels
// orange, violet cancels yellow.
export type NeutralizingColor = "green" | "blue" | "violet";

export interface NeutralizerPart {
  color: NeutralizingColor;
  // This color's part of the neutralizer; the parts of one neutralizer add up to 1.
  share: number;
}

// Dominant color first.
const NEUTRALIZERS: Record<UnderlyingPigment, NeutralizerPart[]> = {
  red: [{ color: "green", share: 1 }],
  "red-orange": [
    { color: "green", share: 0.75 },
    { color: "blue", share: 0.25 },
  ],
  "orange-red": [
    { color: "blue", share: 0.5 },
    { color: "green", share: 0.5 },
  ],
  orange: [{ color: "blue", share: 1 }],
  "orange-yellow": [
    { color: "blue", share: 0.75 },
    { color: "violet", share: 0.25 },
  ],
  "yellow-orange": [
    { color: "blue", share: 0.5 },
    { color: "violet", share: 0.5 },
  ],
  yellow: [{ color: "violet", share: 1 }],
  "pale-yellow": [{ color: "violet", share: 1 }],
  "very-light-yellow": [{ color: "violet", share: 1 }],
};

export function getNeutralizer(pigment: UnderlyingPigment): NeutralizerPart[] {
  return NEUTRALIZERS[pigment];
}

// The retail tone family a colorist reaches for to get each neutralizing color.
const CORRECTIVE_TONE: Record<NeutralizingColor, ToneFamily> = {
  green: "matt",
  blue: "ash",
  violet: "violet",
};

export function getCorrectiveTone(color: NeutralizingColor): ToneFamily {
  return CORRECTIVE_TONE[color];
}

// Which neutralizing colors a shade's own tone already brings. Warm and natural families
// bring none.
const TONE_NEUTRALIZING_COLORS: Partial<Record<ToneFamily, NeutralizingColor[]>> = {
  ash: ["blue"],
  "slate-grey": ["blue"],
  matt: ["green"],
  violet: ["violet"],
  cendré: ["violet"],
  pearl: ["blue", "violet"],
};

// Wella's /9 (cendré) is charted as slate-grey (see brands/wella.ts) but is grey with
// violet, so in Wella's lines that tone brings violet too. Other brands' greys are left
// as plain blue until the colorist confirms them.
const WELLA_LINES: ReadonlySet<string> = new Set(["koleston-perfect", "color-touch"]);

export type NeutralizingShade = Pick<Shade, "tone" | "secondaryTone" | "line">;

function getToneNeutralizingColors(tone: ToneFamily, line: string | undefined): NeutralizingColor[] {
  if (tone === "slate-grey" && line !== undefined && WELLA_LINES.has(line)) return ["blue", "violet"];
  return TONE_NEUTRALIZING_COLORS[tone] ?? [];
}

export function getShadeNeutralizingColors(shade: NeutralizingShade): Set<NeutralizingColor> {
  return new Set([
    ...getToneNeutralizingColors(shade.tone, shade.line),
    ...(shade.secondaryTone !== undefined ? getToneNeutralizingColors(shade.secondaryTone, shade.line) : []),
  ]);
}

// How much of the background the shade's own tone cancels: all of the colors it takes,
// some of them, or none.
export type NeutralizationCoverage = "full" | "partial" | "none";

export interface CorrectiveTone {
  tone: ToneFamily;
  // The part of the whole neutralizer this tone stands for: 0.5 when the shade already
  // brings the other half. The corrector's weight is scaled by it.
  share: number;
}

export interface Neutralization {
  background: UnderlyingPigment;
  coverage: NeutralizationCoverage;
  // What the shade does not bring itself and a corrector has to: empty when coverage is
  // full, the whole neutralizer when it is none. Dominant tone first.
  missing: CorrectiveTone[];
}

// What a shade lifted to `achievedLevel` still needs to come out as the chart shows it.
export function assessNeutralization(shade: NeutralizingShade, achievedLevel: Level): Neutralization {
  const background = getUnderlyingPigment(achievedLevel);
  const needed = getNeutralizer(background);
  const carried = getShadeNeutralizingColors(shade);
  const missingParts = needed.filter(part => !carried.has(part.color));

  return {
    background,
    coverage: missingParts.length === 0 ? "full" : missingParts.length === needed.length ? "none" : "partial",
    missing: missingParts.map(part => ({ tone: CORRECTIVE_TONE[part.color], share: part.share })),
  };
}

// What to tone with after lightening to `level`: the background the bleach leaves, and
// the tones that cancel it, dominant first. Bleach brings no tone of its own, so this is
// the whole neutralizer.
export interface ToningRecommendation {
  background: UnderlyingPigment;
  tones: ToneFamily[];
}

export function getToningRecommendation(level: Level): ToningRecommendation {
  const { background, missing } = assessNeutralization({ tone: "natural" }, level);
  return { background, tones: missing.map(part => part.tone) };
}
