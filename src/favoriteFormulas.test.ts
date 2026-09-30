import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFavoriteFormula,
  renameFavoriteFormula,
  deleteFavoriteFormula,
  subscribeToFavoriteFormulas,
  checkFavoriteAvailability,
  defaultFavoriteName,
  type FavoriteFormulaRecipe,
} from "./favoriteFormulas";
import { BRANDS } from "./engine/brands";

let autoIdCounter = 0;
const setDocMock = vi.fn();
const updateDocMock = vi.fn();
const deleteDocMock = vi.fn();
// Real `doc(collectionRef)` (one arg) auto-generates a fresh id each call; `doc(db, path, id)`
// (three args) addresses an existing document by the id given. Mirrors both shapes so
// createFavoriteFormula's `doc(collection(db, ...))` and renameFavoriteFormula/
// deleteFavoriteFormula's `doc(db, ..., id)` each get back what the real SDK would hand them.
const docMock = vi.fn((...args: unknown[]) =>
  args.length === 1 ? { kind: "doc", id: `auto-${++autoIdCounter}` } : { kind: "doc", args }
);
const onSnapshotMock = vi.fn();
const orderByMock = vi.fn((...args: unknown[]) => ({ kind: "orderBy", field: args[0] }));
const whereMock = vi.fn((...args: unknown[]) => ({ kind: "where", field: args[0], op: args[1], value: args[2] }));
const queryMock = vi.fn((...args: unknown[]) => ({ kind: "query", args }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "collection-ref"),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  serverTimestamp: vi.fn(() => "server-timestamp"),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
}));
vi.mock("./firebase", () => ({ db: {} }));

beforeEach(() => {
  vi.clearAllMocks();
  autoIdCounter = 0;
  setDocMock.mockResolvedValue(undefined);
  updateDocMock.mockResolvedValue(undefined);
  deleteDocMock.mockResolvedValue(undefined);
  onSnapshotMock.mockImplementation(() => () => {});
});

const RECIPE: FavoriteFormulaRecipe = {
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
};

describe("createFavoriteFormula", () => {
  it("creates a new favorite via a real Firestore-assigned id, trimming the name", async () => {
    await createFavoriteFormula({ ownedBy: "stylist@salon.test", name: "  Blonde  ", recipe: RECIPE });

    expect(setDocMock).toHaveBeenCalledWith(
      { kind: "doc", id: "auto-1" },
      { ownedBy: "stylist@salon.test", name: "Blonde", recipe: RECIPE, updatedAt: "server-timestamp" }
    );
  });
});

describe("renameFavoriteFormula", () => {
  it("writes the trimmed new name to the given favorite's own real id", async () => {
    await renameFavoriteFormula("fav-1", " New ");

    expect(docMock).toHaveBeenCalledWith({}, "favoriteFormulas", "fav-1");
    expect(updateDocMock).toHaveBeenCalledWith(
      { kind: "doc", args: [{}, "favoriteFormulas", "fav-1"] },
      { name: "New", updatedAt: "server-timestamp" }
    );
  });
});

describe("deleteFavoriteFormula", () => {
  it("deletes the given favorite's own real id", async () => {
    await deleteFavoriteFormula("fav-1");

    expect(docMock).toHaveBeenCalledWith({}, "favoriteFormulas", "fav-1");
    expect(deleteDocMock).toHaveBeenCalledWith({ kind: "doc", args: [{}, "favoriteFormulas", "fav-1"] });
  });
});

describe("subscribeToFavoriteFormulas", () => {
  it("scopes the query to the given owner and orders by name", () => {
    subscribeToFavoriteFormulas("stylist@salon.test", () => {}, () => {});

    expect(whereMock).toHaveBeenCalledWith("ownedBy", "==", "stylist@salon.test");
    expect(orderByMock).toHaveBeenCalledWith("name");
    expect(queryMock).toHaveBeenCalledWith(
      "collection-ref",
      { kind: "where", field: "ownedBy", op: "==", value: "stylist@salon.test" },
      { kind: "orderBy", field: "name" }
    );
  });

  it("skips a malformed document instead of throwing or poisoning the rest of the list", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    onSnapshotMock.mockImplementation((_q, next) => {
      next({
        docs: [
          { id: "good", data: () => ({ ownedBy: "s@t", name: "Blonde", recipe: RECIPE }) },
          { id: "bad", data: () => ({ ownedBy: "s@t" }) }, // missing required fields
        ],
      });
      return () => {};
    });

    const onChange = vi.fn();
    subscribeToFavoriteFormulas("s@t", onChange, () => {});

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([{ id: "good", ownedBy: "s@t", name: "Blonde", recipe: RECIPE }]);
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});

describe("checkFavoriteAvailability", () => {
  it("is available when every recipe shade exists in the brand/line's current pool", () => {
    expect(checkFavoriteAvailability(RECIPE, BRANDS)).toEqual({ kind: "available" });
  });

  it("flags a brand no longer in the catalog", () => {
    expect(checkFavoriteAvailability({ ...RECIPE, brandId: "nope" }, BRANDS)).toEqual({ kind: "brand-missing" });
  });

  it("flags every missing shade code, deduplicated and in order", () => {
    expect(checkFavoriteAvailability({ ...RECIPE, targetShadeCode: "7/999" }, BRANDS)).toEqual({
      kind: "shades-missing",
      codes: ["7/999"],
    });
  });
});

describe("defaultFavoriteName", () => {
  it("names a favorite after its brand, line, and shade code", () => {
    expect(defaultFavoriteName(RECIPE, BRANDS)).toBe("Wella Koleston Perfect 7/1");
  });

  it("appends the additional shade code when present", () => {
    expect(defaultFavoriteName({ ...RECIPE, additionalShadeCode: "7/3" }, BRANDS)).toBe("Wella Koleston Perfect 7/1 + 7/3");
  });

  it("omits the line for a brand with no sub-lines", () => {
    expect(defaultFavoriteName({ ...RECIPE, brandId: "generic", line: null, targetShadeCode: "1.0" }, BRANDS)).toBe("Generic 1.0");
  });
});
