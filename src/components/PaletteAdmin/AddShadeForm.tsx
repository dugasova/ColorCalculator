import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { addShadeToBrand } from "../../palette";
import type { BrandId } from "../../engine/brands";
import { shadeKey } from "../../engine/paletteOverrides";
import type { Level } from "../../engine/levels";
import type { Shade, ToneFamily } from "../../engine/shades";
import { Select } from "../common/Select";

export interface AddShadeFormProps {
  // The brand the new shade is added to — see PaletteAdminView's `effectiveSelectedBrandId`.
  brandId: BrandId;
  // That brand's current shades (including discontinued ones), used only to reject a
  // duplicate (line, code) pair before writing — see `shadeKey`.
  existingShades: Shade[];
}

const LEVELS: Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TONE_FAMILIES: ToneFamily[] = ["natural", "ash", "cendré", "matt", "gold", "copper", "red", "violet", "chocolate", "pearl", "slate-grey", "mahogany"];

type SubmitStatus = "idle" | "saving" | "saved" | "error";

export function AddShadeForm({ brandId, existingShades }: AddShadeFormProps) {
  const { t } = useTranslation();

  const [shadeCode, setShadeCode] = useState("");
  const [shadeLevel, setShadeLevel] = useState<Level>(6);
  const [shadeTone, setShadeTone] = useState<ToneFamily>("natural");
  const [shadeSecondaryTone, setShadeSecondaryTone] = useState<ToneFamily | "">("");
  const [shadeName, setShadeName] = useState("");
  const [shadeLine, setShadeLine] = useState("");
  const [shadeStatus, setShadeStatus] = useState<SubmitStatus>("idle");
  const [shadeError, setShadeError] = useState<string | null>(null);

  const handleAddShade = async (e: FormEvent) => {
    e.preventDefault();
    setShadeError(null);

    const code = shadeCode.trim();
    if (code === "") {
      setShadeError(t("palette.shadeCodeRequired"));
      return;
    }
    if (existingShades.some(s => shadeKey(s) === shadeKey({ code, line: shadeLine.trim() || undefined }))) {
      setShadeError(t("palette.shadeCodeTaken"));
      return;
    }

    const shade: Shade = {
      code,
      level: shadeLevel,
      tone: shadeTone,
      ...(shadeSecondaryTone !== "" ? { secondaryTone: shadeSecondaryTone } : {}),
      ...(shadeName.trim() !== "" ? { name: shadeName.trim() } : {}),
      ...(shadeLine.trim() !== "" ? { line: shadeLine.trim() } : {}),
    };

    setShadeStatus("saving");
    try {
      await addShadeToBrand(brandId, shade);
      setShadeStatus("saved");
      setShadeCode("");
      setShadeLine("");
      setShadeSecondaryTone("");
      setShadeName("");
    } catch {
      setShadeStatus("error");
      setShadeError(t("palette.saveError"));
    }
  };

  return (
    <section className="palette-admin__section">
      <h2 className="results__section-heading">{t("palette.addShadeTitle")}</h2>
      <form className="calculator__form" onSubmit={handleAddShade}>
        <div className="field">
          <label htmlFor="paletteShadeCode">{t("palette.shadeCode")}</label>
          <input id="paletteShadeCode" type="text" value={shadeCode} onChange={e => setShadeCode(e.target.value)} required />
          <small>{t("palette.shadeCodeHint")}</small>
        </div>
        <div className="field">
          <label htmlFor="paletteShadeLevel">{t("palette.level")}</label>
          <Select
            id="paletteShadeLevel"
            value={String(shadeLevel)}
            onChange={value => setShadeLevel(Number(value) as Level)}
            options={LEVELS.map(level => ({ value: String(level), label: String(level) }))}
          />
        </div>
        <div className="field">
          <label htmlFor="paletteShadeTone">{t("palette.tone")}</label>
          <Select
            id="paletteShadeTone"
            value={shadeTone}
            onChange={value => setShadeTone(value as ToneFamily)}
            options={TONE_FAMILIES.map(tone => ({ value: tone, label: t(`palette.toneFamily.${tone}`) }))}
          />
        </div>
        <div className="field">
          <label htmlFor="paletteShadeSecondaryTone">{t("palette.secondaryTone")}</label>
          <Select
            id="paletteShadeSecondaryTone"
            value={shadeSecondaryTone}
            onChange={value => setShadeSecondaryTone(value as ToneFamily | "")}
            options={[
              { value: "", label: t("palette.secondaryToneNone") },
              ...TONE_FAMILIES.map(tone => ({ value: tone, label: t(`palette.toneFamily.${tone}`) })),
            ]}
          />
        </div>
        <div className="field">
          <label htmlFor="paletteShadeName">{t("palette.shadeName")}</label>
          <input id="paletteShadeName" type="text" value={shadeName} onChange={e => setShadeName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="paletteShadeLine">{t("palette.line")}</label>
          <input id="paletteShadeLine" type="text" value={shadeLine} onChange={e => setShadeLine(e.target.value)} />
        </div>
        {shadeError !== null && <p className="warning" role="alert">{shadeError}</p>}
        <button type="submit" className="button" disabled={shadeStatus === "saving"}>
          {shadeStatus === "saving" ? t("palette.saving") : t("palette.addShade")}
        </button>
        {shadeStatus === "saved" && <span className="palette-admin__status" role="status">{t("palette.shadeAdded")}</span>}
      </form>
    </section>
  );
}
