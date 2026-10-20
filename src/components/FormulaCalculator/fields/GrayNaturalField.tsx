import { useTranslation } from "react-i18next";
import { shadeLabel, type Shade } from "../../../engine/shades";
import { shadeToHexColor } from "../../../engine/color";
import { isPureNatural } from "../../../engine/formula";
import { Select } from "../../common/Select";
import "./fields.css";

export interface GrayNaturalFieldProps {
  // The gray-coverage natural share the client's gray % calls for (see
  // getGrayCoverageStrategy) -- 0 below the light-gray threshold, where this renders nothing.
  naturalRatio: number;
  targetShade: Shade;
  // See findNaturalBaseCandidates: double naturals first, so the first is the default.
  candidates: Shade[];
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  // The colorist's own pick, or null for the default candidate.
  shadeCode: string | null;
  onShadeCodeChange: (code: string | null) => void;
  idSuffix?: string;
}

// Opt-in for actually blending the gray-coverage natural base into the mix, the same
// checkbox pattern as the neutralization/pre-pigmentation toggles. Checked, the natural
// shade's share is carved out of the base color weight (see splitNaturalBase), so the
// total, developer and cost don't change. Renders nothing when the gray % calls for no
// natural dose or the target is itself natural; a short note instead when the line has no
// natural at the target's level to blend in.
export function GrayNaturalField({
  naturalRatio, targetShade, candidates, enabled, onEnabledChange, shadeCode, onShadeCodeChange, idSuffix = "",
}: GrayNaturalFieldProps) {
  const { t } = useTranslation();
  if (naturalRatio === 0 || isPureNatural(targetShade)) return null;
  if (candidates.length === 0) {
    return <p className="field__hint">{t("fields.grayNaturalUnavailable", { level: targetShade.level })}</p>;
  }

  const effectiveCode = candidates.some(s => s.code === shadeCode) ? shadeCode! : candidates[0].code;

  return (
    <div className="field">
      <label className="blend-toggle" htmlFor={`grayNaturalApplied${idSuffix}`}>
        <input
          type="checkbox"
          id={`grayNaturalApplied${idSuffix}`}
          checked={enabled}
          onChange={e => onEnabledChange(e.target.checked)}
        />
        {t("fields.grayNatural", { natural: Math.round(naturalRatio * 100) })}
      </label>
      {enabled && candidates.length > 1 && (
        <>
          <label htmlFor={`naturalBaseShade${idSuffix}`}>{t("fields.grayNaturalShade")}</label>
          <Select
            id={`naturalBaseShade${idSuffix}`}
            value={effectiveCode}
            onChange={onShadeCodeChange}
            options={candidates.map(candidate => ({
              value: candidate.code,
              label: shadeLabel(candidate),
              swatchColor: shadeToHexColor(candidate),
            }))}
          />
        </>
      )}
    </div>
  );
}
