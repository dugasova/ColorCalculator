export const formatLineLabel = (line: string) =>
  line.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");

// "Wella Koleston Perfect" / "Wella" -- the brand name with its humanized line appended
// when the shade belongs to a named line. Five call sites built this inline before.
export function formatBrandLineLabel(brandName: string, line: string | null): string {
  return line ? `${brandName} ${formatLineLabel(line)}` : brandName;
}
