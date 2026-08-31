import type { Shade } from "../../../engine/shades";
import { shadeToHexColor } from "../../../engine/color";

export interface BlendComponentFieldProps {
  label: string;
  placeholder: string;
  candidates: Shade[];
  shadeCode: string | null;
  onShadeCodeChange: (code: string | null) => void;
  id: string;
}

// One half of a substitute blend (see BlendModeField/BlendRatioField): picks one real
// shade to stand in as either component. Used twice -- once per component -- with
// `candidates` pre-filtered by the caller to shades `canBlendShades` accepts against the
// target (same level/line/mixing chemistry), so any pairing here is physically valid.
export function BlendComponentField({ label, placeholder, candidates, shadeCode, onShadeCodeChange, id }: BlendComponentFieldProps) {
  const shade = candidates.find(s => s.code === shadeCode) ?? null;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="shade-field">
        <select
          name={id}
          id={id}
          value={shadeCode ?? ''}
          onChange={e => onShadeCodeChange(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">{placeholder}</option>
          {candidates.map(candidate => (
            <option key={candidate.code} value={candidate.code}>
              {candidate.code} {candidate.tone}{candidate.secondaryTone ? `/${candidate.secondaryTone}` : ''}
            </option>
          ))}
        </select>
        {shade !== null && (
          <span
            className="shade-swatch"
            style={{ backgroundColor: shadeToHexColor(shade) }}
            title={`${shade.code} ${shade.tone}${shade.secondaryTone ? '/' + shade.secondaryTone : ''}`}
          />
        )}
      </div>
    </div>
  );
}
