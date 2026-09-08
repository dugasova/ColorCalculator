import type { Shade } from "../shades";

// The built-in "Generic" catalog: a level.reflect chart (dot notation, e.g. "6.3") not
// tied to any real manufacturer, used as the default brand and as the reference chart
// pre-pigmentation's worked example resolves its filler shade against (see
// findExampleFillerShade, ../prePigmentation.ts). Unlike every other brand in this
// directory it has no sub-lines to distinguish, so shades aren't tagged with a `line`.
export const GENERIC_SHADE_CHART: Shade[] = [
  { code: "1.0", level: 1, tone: "natural" },
  { code: "1.1", level: 1, tone: "ash" },

  { code: "2.0", level: 2, tone: "natural" },
  { code: "2.1", level: 2, tone: "ash" },
  { code: "2.3", level: 2, tone: "gold" },
  { code: "2.2", level: 2, tone: "violet" },

  { code: "3.0", level: 3, tone: "natural" },
  { code: "3.1", level: 3, tone: "ash" },
  { code: "3.3", level: 3, tone: "gold" },
  { code: "3.2", level: 3, tone: "violet" },
  { code: "3.7", level: 3, tone: "chocolate" },

  { code: "4.0", level: 4, tone: "natural" },
  { code: "4.1", level: 4, tone: "ash" },
  { code: "4.3", level: 4, tone: "gold" },
  { code: "4.2", level: 4, tone: "violet" },
  { code: "4.7", level: 4, tone: "chocolate" },

  { code: "5.0", level: 5, tone: "natural" },
  { code: "5.1", level: 5, tone: "ash" },
  { code: "5.2", level: 5, tone: "violet" },
  { code: "5.3", level: 5, tone: "gold" },
  { code: "5.4", level: 5, tone: "copper" },
  { code: "5.5", level: 5, tone: "red" },
  { code: "5.7", level: 5, tone: "chocolate" },

  { code: "6.0", level: 6, tone: "natural" },
  { code: "6.1", level: 6, tone: "ash" },
  { code: "6.3", level: 6, tone: "gold" },
  { code: "6.2", level: 6, tone: "violet" },
  { code: "6.4", level: 6, tone: "copper" },
  { code: "6.5", level: 6, tone: "red" },
  { code: "6.7", level: 6, tone: "chocolate" },

  { code: "7.0", level: 7, tone: "natural" },
  { code: "7.1", level: 7, tone: "ash" },
  { code: "7.3", level: 7, tone: "gold" },
  { code: "7.2", level: 7, tone: "violet" },
  { code: "7.4", level: 7, tone: "copper" },
  { code: "7.5", level: 7, tone: "red" },
  { code: "7.7", level: 7, tone: "chocolate" },

  { code: "8.0", level: 8, tone: "natural" },
  { code: "8.1", level: 8, tone: "ash" },
  { code: "8.3", level: 8, tone: "gold" },
  { code: "8.2", level: 8, tone: "violet" },
  { code: "8.4", level: 8, tone: "copper" },
  { code: "8.5", level: 8, tone: "red" },
  { code: "8.7", level: 8, tone: "chocolate" },

  { code: "9.0", level: 9, tone: "natural" },
  { code: "9.1", level: 9, tone: "ash" },
  { code: "9.3", level: 9, tone: "gold" },
  { code: "9.4", level: 9, tone: "copper" },
  { code: "9.5", level: 9, tone: "red" },
  { code: "9.2", level: 9, tone: "violet" },
  { code: "9.7", level: 9, tone: "chocolate" },

  { code: "10.0", level: 10, tone: "natural" },
  { code: "10.1", level: 10, tone: "ash" },
  { code: "10.3", level: 10, tone: "gold" },
  { code: "10.2", level: 10, tone: "violet" },
  { code: "10.4", level: 10, tone: "copper" },
  { code: "10.5", level: 10, tone: "red" },
  { code: "10.7", level: 10, tone: "chocolate" },
];
