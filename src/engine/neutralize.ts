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

// Matrix charts its own background per level (European SoColor Pre-Bonded Technical
// Guide V4, the range sold in Ukraine): red at 3, red-orange at 4, dark orange at 5,
// orange at 6, light orange at 7, gold at 8, then yellow, pale yellow and palest yellow.
// That is the generic table above but for level 5, whose dark orange the colorist
// neutralizes with blue alone (2026-11-23), so it reads as orange here. (Matrix's US card
// sits a level darker: 6 dark orange, 7 orange, 8 dark yellow; the app follows the
// European one.)
const MATRIX_LINES: ReadonlySet<string> = new Set(["socolor", "super-sync"]);

const MATRIX_BACKGROUNDS: Partial<Record<Level, UnderlyingPigment>> = {
  5: "orange",
};

// Matrix's pigment balance per background (colorist, 2026-11-23), keyed by the
// background's color, not its level: red-orange green and blue about equal; orange-yellow
// (the European light orange at 7) blue 60 + violet 40; yellow violet 80 + blue 20; pale
// yellow violet 90 + blue 10; palest yellow "violet 90–95%, blue 5–10%", the 95/5 end
// taken, since excess blue there turns porous blonde greenish grey. Gold (yellow-orange)
// at 8 had no balance of its own and keeps the generic half and half.
const MATRIX_NEUTRALIZERS: Partial<Record<UnderlyingPigment, NeutralizerPart[]>> = {
  "red-orange": [
    { color: "green", share: 0.5 },
    { color: "blue", share: 0.5 },
  ],
  "orange-yellow": [
    { color: "blue", share: 0.6 },
    { color: "violet", share: 0.4 },
  ],
  yellow: [
    { color: "violet", share: 0.8 },
    { color: "blue", share: 0.2 },
  ],
  "pale-yellow": [
    { color: "violet", share: 0.9 },
    { color: "blue", share: 0.1 },
  ],
  "very-light-yellow": [
    { color: "violet", share: 0.95 },
    { color: "blue", share: 0.05 },
  ],
};

function isMatrixLine(line: string | null | undefined): boolean {
  return line !== undefined && line !== null && MATRIX_LINES.has(line);
}

// The background lifting to `level` reveals, as the line's manufacturer charts it.
// Pre-pigmentation keeps levels.ts's generic table: Matrix's chart was given for
// neutralization only.
export function getBackground(level: Level, line?: string | null): UnderlyingPigment {
  return (isMatrixLine(line) ? MATRIX_BACKGROUNDS[level] : undefined) ?? getUnderlyingPigment(level);
}

export function getNeutralizer(pigment: UnderlyingPigment, line?: string | null): NeutralizerPart[] {
  return (isMatrixLine(line) ? MATRIX_NEUTRALIZERS[pigment] : undefined) ?? NEUTRALIZERS[pigment];
}

// A part of the neutralizer this small (Matrix's 10% and 5% blue on the palest
// backgrounds) is below what a colorist doses on its own: it is neither asked of the
// shade nor added as a corrector. Claude's threshold, not the colorist's.
const NEGLIGIBLE_SHARE = 0.15;

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
// violet, so in Wella's lines that tone brings violet too. Matrix's T (Titanium, Super
// Sync 6T) is a dense blue-violet grey made to show silver on an already clean base: on
// an orange background it turns muddy, so it cancels nothing (colorist, 2026-11-23).
// Other greys (Redken's T) are blue.
const WELLA_LINES: ReadonlySet<string> = new Set(["koleston-perfect", "color-touch"]);

export type NeutralizingShade = Pick<Shade, "tone" | "secondaryTone" | "line">;

function getToneNeutralizingColors(tone: ToneFamily, line: string | undefined): NeutralizingColor[] {
  if (tone === "slate-grey" && line !== undefined && WELLA_LINES.has(line)) return ["blue", "violet"];
  if (tone === "slate-grey" && isMatrixLine(line)) return [];
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
  const background = getBackground(achievedLevel, shade.line);
  const needed = getNeutralizer(background, shade.line).filter(part => part.share >= NEGLIGIBLE_SHARE);
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

export function getToningRecommendation(level: Level, line?: string | null): ToningRecommendation {
  const { background, missing } = assessNeutralization({ tone: "natural", line: line ?? undefined }, level);
  return { background, tones: missing.map(part => part.tone) };
}
