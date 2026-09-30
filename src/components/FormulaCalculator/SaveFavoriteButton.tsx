import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../common/Modal";
import type { Brand, BrandId } from "../../engine/brands";
import { createFavoriteFormula, defaultFavoriteName, type FavoriteFormulaRecipe } from "../../favoriteFormulas";

export interface SaveFavoriteButtonProps {
  appliedBy: string;
  brands: Record<BrandId, Brand>;
  currentRecipe: FavoriteFormulaRecipe;
}

// The only favorites-related control left on the calculator page (see FavoritesPage for
// the list/apply/manage UI, moved out to its own /favorites nav tab so it doesn't
// crowd the calculator) -- saving still needs to live here because it's the only place
// with a live `currentRecipe` to snapshot.
export function SaveFavoriteButton({ appliedBy, brands, currentRecipe }: SaveFavoriteButtonProps) {
  const { t } = useTranslation();
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");

  function openSaveDialog() {
    setSaveName(defaultFavoriteName(currentRecipe, brands));
    setSaveStatus("idle");
    setIsSaveOpen(true);
  }

  async function handleSave() {
    setSaveStatus("saving");
    try {
      await createFavoriteFormula({ ownedBy: appliedBy, name: saveName, recipe: currentRecipe });
      setIsSaveOpen(false);
    } catch (err) {
      console.error("Failed to save favorite formula:", err);
      setSaveStatus("error");
    }
  }

  return (
    <>
      <button type="button" className="button button--secondary favorites__save-trigger" onClick={openSaveDialog}>
        {t("favorites.saveCurrent")}
      </button>

      {isSaveOpen && (
        <Modal title={t("favorites.saveTitle")} onClose={() => setIsSaveOpen(false)}>
          <div className="field">
            <label htmlFor="favoriteName">{t("favorites.nameLabel")}</label>
            <input
              id="favoriteName"
              type="text"
              maxLength={80}
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
            />
          </div>
          {saveStatus === "error" && <p className="warning" role="alert">{t("favorites.saveError")}</p>}
          <button
            type="button"
            className="button"
            disabled={saveName.trim() === "" || saveStatus === "saving"}
            onClick={() => { void handleSave(); }}
          >
            {saveStatus === "saving" ? t("favorites.saving") : t("favorites.saveButton")}
          </button>
        </Modal>
      )}
    </>
  );
}
