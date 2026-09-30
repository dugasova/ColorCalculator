import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../common/Modal";
import type { Brand, BrandId } from "../../engine/brands";
import {
  checkFavoriteAvailability,
  deleteFavoriteFormula,
  renameFavoriteFormula,
  subscribeToFavoriteFormulas,
  type FavoriteFormula,
  type FavoriteFormulaRecipe,
} from "../../favoriteFormulas";
import "./FormulaCalculator.css";

export interface FavoritesPageProps {
  appliedBy: string;
  brands: Record<BrandId, Brand>;
  // Mirrors HistoryView's onRepeat: the actual insertion into the live calculator form
  // happens back on "/" (see AuthenticatedApp's handleApplyFavorite +
  // FormulaCalculator's favoriteRequest prop) -- this page only picks which recipe.
  onApply: (recipe: FavoriteFormulaRecipe) => void;
}

// A stylist's own library of one-tap formula shortcuts (see src/favoriteFormulas.ts) --
// its own nav tab, distinct from the calculator page it used to be embedded in, so
// applying or managing favorites doesn't crowd the main formula form. Saving still
// happens on the calculator page (see SaveFavoriteButton) since only it has a live
// "current recipe" to snapshot.
export function FavoritesPage({ appliedBy, brands, onApply }: FavoritesPageProps) {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<FavoriteFormula[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const [isManageOpen, setIsManageOpen] = useState(false);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [manageError, setManageError] = useState(false);

  useEffect(() => subscribeToFavoriteFormulas(appliedBy, list => {
    setFavorites(list);
    setLoadError(false);
  }, err => {
    console.error("Failed to load favorite formulas:", err);
    setLoadError(true);
  }), [appliedBy]);

  function handleApply(favorite: FavoriteFormula) {
    const availability = checkFavoriteAvailability(favorite.recipe, brands);
    if (availability.kind === "available") {
      onApply(favorite.recipe);
      setApplyError(null);
      return;
    }
    if (availability.kind === "brand-missing") {
      setApplyError(t("favorites.brandMissing", { name: favorite.name }));
      return;
    }
    setApplyError(t("favorites.shadesMissing", { name: favorite.name, codes: availability.codes.join(", ") }));
  }

  function openManageDialog() {
    setRenameDrafts(Object.fromEntries(favorites.map(f => [f.id, f.name])));
    setPendingDeleteId(null);
    setManageError(false);
    setIsManageOpen(true);
  }

  async function handleRename(id: string) {
    const draft = renameDrafts[id];
    if (draft === undefined) return;
    try {
      await renameFavoriteFormula(id, draft);
    } catch (err) {
      console.error("Failed to rename favorite formula:", err);
      setManageError(true);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFavoriteFormula(id);
      setPendingDeleteId(null);
    } catch (err) {
      console.error("Failed to delete favorite formula:", err);
      setManageError(true);
    }
  }

  return (
    <section className="calculator" aria-labelledby="favorites-title">
      <h1 id="favorites-title" className="calculator__title">{t("favorites.title")}</h1>

      {loadError && <p className="warning" role="alert">{t("favorites.loadError")}</p>}

      {favorites.length === 0 && !loadError ? (
        <p className="favorites__empty">{t("favorites.empty")}</p>
      ) : (
        <ul className="favorites__list">
          {favorites.map(favorite => (
            <li key={favorite.id}>
              <button type="button" className="favorites__chip" onClick={() => handleApply(favorite)}>
                {favorite.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {applyError !== null && <p className="warning" role="alert">{applyError}</p>}

      {favorites.length > 0 && (
        <div className="favorites__actions">
          <button type="button" className="button button--secondary" onClick={openManageDialog}>
            {t("favorites.manage")}
          </button>
        </div>
      )}

      {isManageOpen && (
        <Modal title={t("favorites.manageTitle")} onClose={() => setIsManageOpen(false)}>
          {manageError && <p className="warning" role="alert">{t("favorites.writeError")}</p>}
          <ul className="favorites__manage-list">
            {favorites.map(favorite => {
              const draft = renameDrafts[favorite.id] ?? favorite.name;
              return (
                <li key={favorite.id} className="favorites__manage-item">
                  <input
                    type="text"
                    maxLength={80}
                    aria-label={t("favorites.renameLabel", { name: favorite.name })}
                    value={draft}
                    onChange={e => setRenameDrafts(drafts => ({ ...drafts, [favorite.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={draft.trim() === "" || draft === favorite.name}
                    onClick={() => { void handleRename(favorite.id); }}
                  >
                    {t("favorites.renameButton")}
                  </button>
                  {pendingDeleteId !== favorite.id ? (
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => setPendingDeleteId(favorite.id)}
                    >
                      {t("favorites.deleteButton")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => { void handleDelete(favorite.id); }}
                    >
                      {t("favorites.deleteConfirmButton")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
    </section>
  );
}
