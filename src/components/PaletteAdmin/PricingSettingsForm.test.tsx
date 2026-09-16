// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import "../../i18n";
import { PricingSettingsForm } from "./PricingSettingsForm";
import { useSalonMarkupMultiplier } from "../../palette";
import { setSalonMarkupMultiplier } from "../../salonSettings";

vi.mock("../../palette", () => ({
  useSalonMarkupMultiplier: vi.fn(),
}));

vi.mock("../../salonSettings", () => ({
  setSalonMarkupMultiplier: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
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
});
