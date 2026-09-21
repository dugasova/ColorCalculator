import { useTranslation } from "react-i18next";
import { STRAND_ZONES, STRAND_ZONE_I18N_KEY, type StrandZone } from "../../../engine/strandZone";
import { Select } from "../../common/Select";

export interface StrandZoneFieldProps {
  strandZone: StrandZone;
  onStrandZoneChange: (zone: StrandZone) => void;
  idSuffix?: string;
}

// Which part of the strand this step's formula applies to (root/mid-lengths/ends/whole
// head) -- distinct from ApplicationZoneField's full-head-vs-root-touch-up (a
// product-quantity hint for a single application). This field lets a multi-step
// complex-coloring session (e.g. balayage: a different starting level and target per
// zone) label each step, both in the UI and in the saved formula text/history recap --
// see formatSession.ts.
export function StrandZoneField({ strandZone, onStrandZoneChange, idSuffix = "" }: StrandZoneFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="field">
      <label htmlFor={`strandZone${idSuffix}`}>{t("fields.strandZone.label")}</label>
      <Select
        id={`strandZone${idSuffix}`}
        value={strandZone}
        onChange={value => onStrandZoneChange(value as StrandZone)}
        options={STRAND_ZONES.map(zone => ({ value: zone, label: t(`fields.strandZone.${STRAND_ZONE_I18N_KEY[zone]}`) }))}
      />
    </div>
  );
}
