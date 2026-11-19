import type { ReactNode } from "react";
import { ALL_LEVELS, type Level } from "../../engine/levels";
import { Select } from "./Select";

export interface LevelFieldProps {
  id: string;
  label: string;
  value: Level;
  onChange: (level: Level) => void;
  hint?: string;
  // Optional extra control rendered between the select and the hint -- StartLevelField
  // uses this for PhotoEstimate's "Estimate from photo" trigger (see photoAnalysis).
  action?: ReactNode;
  // The levels to offer, when not all of 1-12 make sense (a bleach target stops at 10).
  levels?: Level[];
}

// The 1-12 depth picker every calculator shows. One component so the option list, the
// `field` wrapper and the label/control wiring can't drift between surfaces.
export function LevelField({ id, label, value, onChange, hint, action, levels = ALL_LEVELS }: LevelFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Select
        id={id}
        value={String(value)}
        onChange={next => onChange(Number(next) as Level)}
        options={levels.map(level => ({ value: String(level), label: String(level) }))}
      />
      {action}
      {hint !== undefined && <p className="field__hint">{hint}</p>}
    </div>
  );
}
