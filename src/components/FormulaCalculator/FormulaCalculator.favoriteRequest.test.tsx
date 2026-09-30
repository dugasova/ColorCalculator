// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "../../i18n";
import type { FavoriteFormulaRecipe } from "../../favoriteFormulas";
import FormulaCalculator from "./FormulaCalculator";

// Keeps this a pure component-interaction test: no real Firestore/network reachable from
// jsdom (see SessionDetailsPanel.bowlCard.test.tsx for the same stubs).
vi.mock("../../clients", () => ({
  subscribeToClients: vi.fn((_ownedBy: string, onChange: (clients: unknown[]) => void) => { onChange([]); return () => {}; }),
  createClient: vi.fn().mockResolvedValue("new-client-id"),
  updateClient: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../favoriteFormulas", async () => {
  const actual = await vi.importActual<typeof import("../../favoriteFormulas")>("../../favoriteFormulas");
  return { ...actual, subscribeToFavoriteFormulas: vi.fn(() => () => {}) };
});

// The custom Select (see components/common/Select) has no native <select> "change" event
// -- it opens on a click of its trigger button and commits a value on a click of the
// matching option, identified by the `data-value` the component stamps on each
// <li role="option">.
function chooseOption(labelText: string, value: string) {
  fireEvent.click(screen.getByLabelText(labelText));
  const option = document.querySelector(`[role="option"][data-value="${value}"]`);
  if (option === null) throw new Error(`No option with value "${value}" in the "${labelText}" dropdown`);
  fireEvent.click(option);
}

afterEach(cleanup);

const WELLA_RECIPE: FavoriteFormulaRecipe = {
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

describe("FormulaCalculator favoriteRequest replay", () => {
  it("inserts a favorite's recipe while keeping the current start level", () => {
    const { rerender } = render(<FormulaCalculator appliedBy="stylist@example.com" />);
    chooseOption("Starting level", "5");

    rerender(<FormulaCalculator appliedBy="stylist@example.com" favoriteRequest={WELLA_RECIPE} />);

    expect(screen.getByLabelText("Brand").textContent).toContain("Wella");
    expect(screen.getByLabelText("Shade").textContent).toContain("7/1");
    expect((screen.getByLabelText("Total weight, g") as HTMLInputElement).value).toBe("60");
    expect(screen.getByLabelText("Starting level").textContent).toContain("5");
  });
});
