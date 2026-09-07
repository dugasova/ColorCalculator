import { useTranslation } from "react-i18next";
import type { Porosity, HairThickness, ChemicalHistory } from "../../../engine/canvas";
import { Select } from "../../common/Select";

export interface CanvasFieldsProps {
  porosity: Porosity;
  onPorosityChange: (value: Porosity) => void;
  thickness: HairThickness;
  onThicknessChange: (value: HairThickness) => void;
  chemicalHistory: ChemicalHistory[];
  onChemicalHistoryChange: (value: ChemicalHistory[]) => void;
  idSuffix?: string;
}

const POROSITY_OPTIONS: Porosity[] = ["low", "normal", "high"];
const THICKNESS_OPTIONS: HairThickness[] = ["fine", "medium", "coarse"];
const CHEMICAL_HISTORY_OPTIONS: ChemicalHistory[] = ["keratin", "perm", "henna", "direct_dye"];

export function CanvasFields({
  porosity, onPorosityChange,
  thickness, onThicknessChange,
  chemicalHistory, onChemicalHistoryChange,
  idSuffix = ""
}: CanvasFieldsProps) {
  const { t } = useTranslation();

  const handleChemicalHistoryChange = (option: ChemicalHistory) => {
    if (chemicalHistory.includes(option)) {
      onChemicalHistoryChange(chemicalHistory.filter(h => h !== option));
    } else {
      onChemicalHistoryChange([...chemicalHistory, option]);
    }
  };

  return (
    <>
      <div className="field">
        <label htmlFor={`porosity${idSuffix}`}>{t("canvas.porosity.label")}</label>
        <Select
          id={`porosity${idSuffix}`}
          value={porosity}
          onChange={(v) => onPorosityChange(v as Porosity)}
          options={POROSITY_OPTIONS.map(p => ({ value: p, label: t(`canvas.porosity.${p}`) }))}
        />
      </div>

      <div className="field">
        <label htmlFor={`thickness${idSuffix}`}>{t("canvas.thickness.label")}</label>
        <Select
          id={`thickness${idSuffix}`}
          value={thickness}
          onChange={(v) => onThicknessChange(v as HairThickness)}
          options={THICKNESS_OPTIONS.map(th => ({ value: th, label: t(`canvas.thickness.${th}`) }))}
        />
      </div>

      <div className="field chemical-history">
        <label>{t("canvas.chemicalHistory.label")}</label>
        <div className="checkbox-group" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "2px" }}>
          {CHEMICAL_HISTORY_OPTIONS.map(ch => (
            <label key={ch} className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", color: "var(--ink)", cursor: "pointer", fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>
              <input
                type="checkbox"
                checked={chemicalHistory.includes(ch)}
                onChange={() => handleChemicalHistoryChange(ch)}
                style={{ width: "18px", height: "18px", flex: "none", margin: 0, padding: 0 }}
              />
              {t(`canvas.chemicalHistory.${ch}`)}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
