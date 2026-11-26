import { useState } from "react";
import type { Shade } from "../../engine/shades";

export const ALL_LINES = "__all__";
export const NO_LINE = "__none__";

function lineValue(shade: Shade): string {
  return shade.line ?? NO_LINE;
}

// Narrows a brand's long shade list (several lines -- permanent, demi, toner -- run well
// over a hundred shades) to one line and to a typed code or name. Shared by the palette's
// shade list and its stock list.
export function useShadeFilter(shades: Shade[]) {
  const [lineFilter, setLineFilter] = useState(ALL_LINES);
  const [query, setQuery] = useState("");

  const lines = [...new Set(shades.map(lineValue))];
  // Another brand may not have the line picked before: show all of it then.
  const effectiveLine = lines.includes(lineFilter) ? lineFilter : ALL_LINES;
  const q = query.trim().toLowerCase();
  const visibleShades = shades.filter(
    shade =>
      (effectiveLine === ALL_LINES || lineValue(shade) === effectiveLine) &&
      (q === "" || shade.code.toLowerCase().includes(q) || (shade.name ?? "").toLowerCase().includes(q)),
  );

  return { lines, effectiveLine, setLineFilter, query, setQuery, visibleShades, total: shades.length };
}

export type ShadeFilterState = ReturnType<typeof useShadeFilter>;
