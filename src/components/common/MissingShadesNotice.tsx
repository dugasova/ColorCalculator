import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface MissingShadesNoticeProps {
  // The repeated visit's shades the palette no longer has (see findMissingShadeCodes).
  codes: string[] | undefined;
}

// Shown after History's Repeat or Compare when the visit used a shade that has since left
// the palette: the calculator put the line's first shade in its place, so the colorist
// has to pick the replacement before saving. Each Repeat builds a fresh list, so a
// dismissal only hides the list it was made for.
export function MissingShadesNotice({ codes }: MissingShadesNoticeProps) {
  const { t } = useTranslation();
  const [dismissedCodes, setDismissedCodes] = useState<string[] | undefined>(undefined);
  if (codes === undefined || codes.length === 0 || dismissedCodes === codes) return null;

  return (
    <div className="warning missing-shades" role="alert">
      <p>{t("history.missingShadesNotice", { codes: codes.join(", ") })}</p>
      <button type="button" className="link-button" onClick={() => setDismissedCodes(codes)}>
        {t("history.missingShadesDismiss")}
      </button>
    </div>
  );
}
