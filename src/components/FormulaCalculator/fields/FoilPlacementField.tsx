import { useTranslation } from "react-i18next";
import {
  FOIL_GROUPS,
  FOIL_GROUP_I18N_KEY,
  FOIL_PERCENT_MAX,
  FOIL_PERCENT_MIN,
  isFoiledStrands,
  normalizeFoilPercent,
  type FoilGroup,
  type FoilPlacement,
} from "../../../engine/foil";
import { Select } from "../../common/Select";

const ALL_HAIR = "all";

export interface FoilPlacementFieldProps {
  // Undefined: the step covers all hair of its zone.
  foil: FoilPlacement | undefined;
  onFoilChange: (foil: FoilPlacement | undefined) => void;
  idSuffix?: string;
}

// Which hair of the zone a Complex Coloring step is applied to: all of it, one of the
// foiled sets of strands, or the hair left outside the foil -- and, for strands, roughly
// how much of the hair they take. Lets a highlights session (bleach on foiled strands, a
// different color on the rest) show as separate groups of hair in the result preview
// instead of one chain (see buildZonePreview).
export function FoilPlacementField({ foil, onFoilChange, idSuffix = "" }: FoilPlacementFieldProps) {
  const { t } = useTranslation();

  const handleGroupChange = (value: string) => {
    if (value === ALL_HAIR) {
      onFoilChange(undefined);
      return;
    }
    const group = value as FoilGroup;
    // The percentage describes foiled strands only; it is kept across the two sets.
    onFoilChange({ group, percent: isFoiledStrands(group) ? (foil?.percent ?? null) : null });
  };

  return (
    <>
      <div className="field">
        <label htmlFor={`foilGroup${idSuffix}`}>{t("fields.foil.label")}</label>
        <Select
          id={`foilGroup${idSuffix}`}
          value={foil?.group ?? ALL_HAIR}
          onChange={handleGroupChange}
          options={[
            { value: ALL_HAIR, label: t("fields.foil.all") },
            ...FOIL_GROUPS.map(group => ({ value: group, label: t(`fields.foil.${FOIL_GROUP_I18N_KEY[group]}`) })),
          ]}
        />
      </div>
      {foil !== undefined && isFoiledStrands(foil.group) && (
        <div className="field">
          <label htmlFor={`foilPercent${idSuffix}`}>{t("fields.foil.percent")}</label>
          <input
            id={`foilPercent${idSuffix}`}
            type="number"
            min={FOIL_PERCENT_MIN}
            max={FOIL_PERCENT_MAX}
            step={5}
            value={foil.percent ?? ""}
            onChange={e =>
              onFoilChange({
                group: foil.group,
                percent: e.target.value === "" ? null : normalizeFoilPercent(Number(e.target.value)),
              })
            }
          />
        </div>
      )}
    </>
  );
}
