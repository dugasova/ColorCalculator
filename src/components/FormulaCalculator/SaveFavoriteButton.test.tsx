// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "../../i18n";
import type * as FavoriteFormulasModule from "../../favoriteFormulas";
import FormulaCalculator from "./FormulaCalculator";

// Keeps this a pure component-interaction test: no real Firestore/network reachable from
// jsdom, and clients/favorites subscriptions aren't under test here (see
// SessionDetailsPanel.bowlCard.test.tsx for the same clients stub).
vi.mock("../../clients", () => ({
  subscribeToClients: vi.fn((_ownedBy: string, onChange: (clients: unknown[]) => void) => { onChange([]); return () => {}; }),
  createClient: vi.fn().mockResolvedValue("new-client-id"),
  updateClient: vi.fn().mockResolvedValue(undefined),
}));

const createFavoriteFormulaMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../../favoriteFormulas", async () => {
  const actual = await vi.importActual<typeof FavoriteFormulasModule>("../../favoriteFormulas");
  return {
    ...actual,
    createFavoriteFormula: (...args: Parameters<typeof actual.createFavoriteFormula>) => createFavoriteFormulaMock(...args),
  };
});

const APPLIED_BY = "stylist@example.com";

afterEach(() => {
  cleanup();
  createFavoriteFormulaMock.mockClear();
});

describe("SaveFavoriteButton", () => {
  it("saves the current formula under a default name", async () => {
    render(<FormulaCalculator appliedBy={APPLIED_BY} />);

    fireEvent.click(screen.getByRole("button", { name: /Save current formula/ }));
    expect((screen.getByLabelText("Favorite name") as HTMLInputElement).value).toBe("Generic 1.0");

    fireEvent.click(screen.getByRole("button", { name: "Save favorite" }));

    expect(createFavoriteFormulaMock).toHaveBeenCalledWith({
      ownedBy: APPLIED_BY,
      name: "Generic 1.0",
      recipe: expect.objectContaining({
        brandId: "generic",
        line: null,
        targetShadeCode: "1.0",
        applicationZone: "full-head",
        gramsInputMode: "total",
        totalGrams: 80,
      }),
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
