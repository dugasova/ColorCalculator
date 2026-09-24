import { ALL_LEVELS, type Level } from "../../engine/levels";
import { Select } from "./Select";

export interface LevelFieldProps {
  id: string;
  label: string;
  value: Level;
  onChange: (level: Level) => void;
}

// The 1-12 depth picker every calculator shows. One component so the option list, the
// `field` wrapper and the label/control wiring can't drift between surfaces.
export function LevelField({ id, label, value, onChange }: LevelFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Select
        id={id}
        value={String(value)}
        onChange={next => onChange(Number(next) as Level)}
        options={ALL_LEVELS.map(level => ({ value: String(level), label: String(level) }))}
      />
    </div>
  );
}
