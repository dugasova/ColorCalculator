import { shadeLabel, type Shade } from "../../../engine/shades";
import { shadeToHexColor } from "../../../engine/color";
import { Select } from "../../common/Select";

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
        <Select
          id={id}
          value={shadeCode ?? ''}
          onChange={value => onShadeCodeChange(value === '' ? null : value)}
          options={[
            { value: '', label: placeholder },
            ...candidates.map(candidate => ({
              value: candidate.code,
              label: shadeLabel(candidate),
              searchText: candidate.code,
              swatchColor: shadeToHexColor(candidate),
            })),
          ]}
        />
        {shade !== null && (
          <span
            className="shade-swatch"
            style={{ backgroundColor: shadeToHexColor(shade) }}
            title={shadeLabel(shade)}
          />
        )}
      </div>
    </div>
  );
}
