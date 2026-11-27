// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import "../../i18n";
import { PricingSettingsForm } from "./PricingSettingsForm";
import { usePaletteAdmin, useSalonMarkupMultiplier } from "../../palette";
import { BRANDS } from "../../engine/brands";
import { setBrandPricePerGram, setSalonMarkupMultiplier } from "../../salonSettings";

vi.mock("../../palette", () => ({
  useSalonMarkupMultiplier: vi.fn(),
  usePaletteAdmin: vi.fn(),
}));

vi.mock("../../salonSettings", () => ({
  setSalonMarkupMultiplier: vi.fn(),
  setBrandPricePerGram: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePaletteAdmin).mockReturnValue({
    brands: { wella: { ...BRANDS.wella, pricePerGram: 0.25 }, matrix: BRANDS.matrix },
    customBrands: [],
    overrides: [],
    stock: [],
    pricingSettings: { markupMultiplier: 4, brandPricesPerGram: { wella: 0.25 } },
    calibrationIndex: new Map(),
  });
});

describe("PricingSettingsForm", () => {
  it("saves a valid markup typed into the field on blur", async () => {
    vi.mocked(useSalonMarkupMultiplier).mockReturnValue(4);
    vi.mocked(setSalonMarkupMultiplier).mockResolvedValue(undefined);

    render(<PricingSettingsForm />);

    const input = screen.getByLabelText("Default markup multiplier");
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.blur(input);

    await waitFor(() => expect(setSalonMarkupMultiplier).toHaveBeenCalledWith(3));
  });

  it("rejects a markup of 0, shows the invalid message, and never saves it", async () => {
    vi.mocked(useSalonMarkupMultiplier).mockReturnValue(4);

    render(<PricingSettingsForm />);

    const input = screen.getByLabelText("Default markup multiplier");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);

    expect(await screen.findByText("Enter a markup greater than 0")).toBeInTheDocument();
    expect(setSalonMarkupMultiplier).not.toHaveBeenCalled();
  });

  it("lists every brand's price per gram, saves a typed one with a comma, and resets a salon price", async () => {
    vi.mocked(useSalonMarkupMultiplier).mockReturnValue(4);
    vi.mocked(setBrandPricePerGram).mockResolvedValue(undefined);

    render(<PricingSettingsForm />);
    fireEvent.click(screen.getByRole("button", { name: "Pricing" }));

    const matrix = screen.getByLabelText("Matrix");
    expect(matrix).toHaveValue("0.18");
    fireEvent.change(matrix, { target: { value: "0,22" } });
    fireEvent.blur(matrix);
    await waitFor(() => expect(setBrandPricePerGram).toHaveBeenCalledWith("matrix", 0.22));

    expect(screen.getByLabelText("Wella")).toHaveValue("0.25");
    fireEvent.click(screen.getByRole("button", { name: "Reset to 0.18" }));
    await waitFor(() => expect(setBrandPricePerGram).toHaveBeenCalledWith("wella", null));
  });

  it("rejects an empty or zero price and never saves it", async () => {
    vi.mocked(useSalonMarkupMultiplier).mockReturnValue(4);

    render(<PricingSettingsForm />);

    const matrix = screen.getByLabelText("Matrix");
    fireEvent.change(matrix, { target: { value: "0" } });
    fireEvent.blur(matrix);

    expect(await screen.findByText("Enter a price greater than 0")).toBeInTheDocument();
    expect(setBrandPricePerGram).not.toHaveBeenCalled();
  });
});
