import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { addCustomBrand } from "../../palette";
import type { Brand, BrandId } from "../../engine/brands";
import type { MixingRatioConfig } from "../../engine/paletteOverrides";
import { Select } from "../common/Select";

export interface AddBrandFormProps {
  brands: Record<BrandId, Brand>;
  // Lets the caller switch the shade-management section over to the brand that was
  // just created, so an admin can immediately add its first shades without hunting
  // for it in the brand selector.
  onBrandAdded: (id: BrandId) => void;
}

type SubmitStatus = "idle" | "saving" | "saved" | "error";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AddBrandForm({ brands, onBrandAdded }: AddBrandFormProps) {
  const { t } = useTranslation();

  const [brandName, setBrandName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [brandIdTouched, setBrandIdTouched] = useState(false);
  const [pricePerGram, setPricePerGram] = useState(0.15);
  const [mixingKind, setMixingKind] = useState<MixingRatioConfig["kind"]>("fixed");
  const [colorParts, setColorParts] = useState(1);
  const [developerParts, setDeveloperParts] = useState(1);
  const [brandStatus, setBrandStatus] = useState<SubmitStatus>("idle");
  const [brandError, setBrandError] = useState<string | null>(null);

  const handleBrandNameChange = (name: string) => {
    setBrandName(name);
    if (!brandIdTouched) {
      setBrandId(slugify(name));
    }
  };

  const handleAddBrand = async (e: FormEvent) => {
    e.preventDefault();
    setBrandError(null);

    const trimmedName = brandName.trim();
    const id = brandId.trim();
    if (trimmedName === "" || id === "") {
      setBrandError(t("palette.brandFieldsRequired"));
      return;
    }
    if (!/^[a-z0-9-]+$/.test(id)) {
      setBrandError(t("palette.brandIdInvalid"));
      return;
    }
    if (brands[id] !== undefined) {
      setBrandError(t("palette.brandIdTaken"));
      return;
    }

    const mixingRatioConfig: MixingRatioConfig = mixingKind === "fixed"
      ? { kind: "fixed", fixedRatio: { colorParts, developerParts } }
      : { kind: "generic" };

    setBrandStatus("saving");
    try {
      await addCustomBrand({ id, name: trimmedName, pricePerGram, mixingRatioConfig });
      setBrandStatus("saved");
      setBrandName("");
      setBrandId("");
      setBrandIdTouched(false);
      setPricePerGram(0.15);
      setMixingKind("fixed");
      setColorParts(1);
      setDeveloperParts(1);
      onBrandAdded(id);
    } catch {
      setBrandStatus("error");
      setBrandError(t("palette.saveError"));
    }
  };

  return (
    <section className="palette-admin__section">
      <h2 className="results__section-heading">{t("palette.addBrandTitle")}</h2>
      <form className="calculator__form" onSubmit={handleAddBrand}>
        <div className="field">
          <label htmlFor="paletteBrandName">{t("palette.brandName")}</label>
          <input id="paletteBrandName" type="text" value={brandName} onChange={e => handleBrandNameChange(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="paletteBrandId">{t("palette.brandId")}</label>
          <input
            id="paletteBrandId"
            type="text"
            value={brandId}
            onChange={e => { setBrandId(e.target.value); setBrandIdTouched(true); }}
            required
          />
          <small>{t("palette.brandIdHint")}</small>
        </div>
        <div className="field">
          <label htmlFor="paletteBrandPrice">{t("palette.pricePerGram")}</label>
          <input
            id="paletteBrandPrice"
            type="number"
            min={0}
            step={0.01}
            value={pricePerGram}
            onChange={e => setPricePerGram(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="paletteMixingKind">{t("palette.mixingRatioKind")}</label>
          <Select
            id="paletteMixingKind"
            value={mixingKind}
            onChange={value => setMixingKind(value as MixingRatioConfig["kind"])}
            options={[
              { value: "fixed", label: t("palette.mixingRatioFixed") },
              { value: "generic", label: t("palette.mixingRatioGeneric") },
            ]}
          />
        </div>
        {mixingKind === "fixed" && (
          <>
            <div className="field">
              <label htmlFor="paletteColorParts">{t("palette.colorParts")}</label>
              <input id="paletteColorParts" type="number" min={1} value={colorParts} onChange={e => setColorParts(Number(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="paletteDeveloperParts">{t("palette.developerParts")}</label>
              <input id="paletteDeveloperParts" type="number" min={1} value={developerParts} onChange={e => setDeveloperParts(Number(e.target.value))} />
            </div>
          </>
        )}
        {brandError !== null && <p className="warning" role="alert">{brandError}</p>}
        <button type="submit" className="button" disabled={brandStatus === "saving"}>
          {brandStatus === "saving" ? t("palette.saving") : t("palette.addBrand")}
        </button>
        {brandStatus === "saved" && <span className="palette-admin__status" role="status">{t("palette.brandAdded")}</span>}
      </form>
    </section>
  );
}
