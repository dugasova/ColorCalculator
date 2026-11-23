// Line names whose manufacturer spells them in a way word-by-word capitalization of the id
// cannot produce.
const LINE_LABELS: Readonly<Record<string, string>> = {
  socolor: "SoColor",
};

export const formatLineLabel = (line: string) =>
  LINE_LABELS[line] ??
  line
    .split("-")
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(" ");

// "Wella Koleston Perfect" / "Wella" -- the brand name with its humanized line appended
// when the shade belongs to a named line. Five call sites built this inline before.
export function formatBrandLineLabel(brandName: string, line: string | null): string {
  return line ? `${brandName} ${formatLineLabel(line)}` : brandName;
}
