// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import "../../i18n";
import { BRANDS } from "../../engine/brands";
import type { FavoriteFormula, FavoriteFormulaRecipe } from "../../favoriteFormulas";
import type * as FavoriteFormulasModule from "../../favoriteFormulas";
import { FavoritesPage } from "./FavoritesPage";

let favoritesListener: ((favorites: FavoriteFormula[]) => void) | null = null;
const renameFavoriteFormulaMock = vi.fn().mockResolvedValue(undefined);
const deleteFavoriteFormulaMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../../favoriteFormulas", async () => {
  const actual = await vi.importActual<typeof FavoriteFormulasModule>("../../favoriteFormulas");
  return {
    ...actual,
    subscribeToFavoriteFormulas: vi.fn((_ownedBy: string, onChange: (favorites: FavoriteFormula[]) => void) => {
      favoritesListener = onChange;
      onChange([]);
      return () => {};
    }),
    renameFavoriteFormula: (...args: Parameters<typeof actual.renameFavoriteFormula>) => renameFavoriteFormulaMock(...args),
    deleteFavoriteFormula: (...args: Parameters<typeof actual.deleteFavoriteFormula>) => deleteFavoriteFormulaMock(...args),
  };
});

const APPLIED_BY = "stylist@example.com";

const WELLA_FAVORITE: FavoriteFormula = {
  id: "fav-1",
  ownedBy: APPLIED_BY,
  name: "Wella 7/1 blonde",
  recipe: {
    brandId: "wella",
    line: "koleston-perfect",
    targetShadeCode: "7/1",
    additionalShadeCode: null,
    additionalShadeGrams: 0,
    additionalShade2Code: null,
    additionalShade2Grams: 0,
    blendShadeACode: null,
    blendShadeBCode: null,
    blendPrimaryPercent: 70,
    manualDeveloperVolume: null,
    manualMixingRatio: null,
    manualProcessingMinutes: null,
    applicationZone: "full-head",
    gramsInputMode: "total",
    totalGrams: 60,
    colorGrams: 60,
  },
};

afterEach(() => {
  cleanup();
  favoritesListener = null;
  renameFavoriteFormulaMock.mockClear();
  deleteFavoriteFormulaMock.mockClear();
});

describe("FavoritesPage apply", () => {
  it("hands the chosen favorite's recipe to onApply", () => {
    const onApply = vi.fn();
    render(<FavoritesPage appliedBy={APPLIED_BY} brands={BRANDS} onApply={onApply} />);
    act(() => favoritesListener!([WELLA_FAVORITE]));

    fireEvent.click(screen.getByRole("button", { name: "Wella 7/1 blonde" }));

    expect(onApply).toHaveBeenCalledWith(WELLA_FAVORITE.recipe);
  });

  it("refuses to hand off a favorite whose shade is no longer in the palette", () => {
    const onApply = vi.fn();
    const recipe: FavoriteFormulaRecipe = { ...WELLA_FAVORITE.recipe, targetShadeCode: "7/999" };
    render(<FavoritesPage appliedBy={APPLIED_BY} brands={BRANDS} onApply={onApply} />);
    act(() => favoritesListener!([{ ...WELLA_FAVORITE, recipe }]));

    fireEvent.click(screen.getByRole("button", { name: "Wella 7/1 blonde" }));

    expect(screen.getByText(/can't be inserted: 7\/999/)).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });
});

describe("FavoritesPage manage", () => {
  it("renames and deletes a favorite from the manage dialog", () => {
    render(<FavoritesPage appliedBy={APPLIED_BY} brands={BRANDS} onApply={vi.fn()} />);
    act(() => favoritesListener!([WELLA_FAVORITE]));

    fireEvent.click(screen.getByRole("button", { name: "Manage favorites" }));
    fireEvent.change(screen.getByLabelText("Name of Wella 7/1 blonde"), { target: { value: "Blonde" } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(renameFavoriteFormulaMock).toHaveBeenCalledWith("fav-1", "Blonde");

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(deleteFavoriteFormulaMock).toHaveBeenCalledWith("fav-1");
  });
});
