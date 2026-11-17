// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "../../i18n";
import { chooseOption } from "../../testDom";
import { ColorCorrectionCalculator } from "./ColorCorrectionCalculator";

afterEach(cleanup);

function mixText(): string {
  return document.querySelector(".correction__mix")?.textContent ?? "";
}

describe("ColorCorrectionCalculator with a brand", () => {
  it("mixes the brand's correctors for a blend and takes the grams the colorist types", () => {
    render(<ColorCorrectionCalculator />);
    chooseOption("Brand", "wella");
    fireEvent.click(screen.getByRole("radio", { name: "Yellow-orange" }));

    // Koleston at level 8, 30 g: 2 g by the Rule of 10, half blue, half violet, 1:1.
    expect(mixText()).toBe("color- 30.0 g 0/88- 1.0 g 0/66- 1.0 g developer 32.0 g");

    fireEvent.change(screen.getByLabelText("Amount of 0/66, g"), { target: { value: "1,5" } });
    expect(mixText()).toBe("color- 30.0 g 0/88- 1.0 g 0/66- 1.5 g developer 32.5 g");
    // The Rule of 10 row keeps the recommendation.
    expect(screen.getByText("2 g of corrector per 30 g of base color")).toBeTruthy();
  });

  it("warms green back with the level's own Wella corrector and resets typed grams", () => {
    render(<ColorCorrectionCalculator />);
    chooseOption("Brand", "wella");
    fireEvent.click(screen.getByRole("radio", { name: "Green" }));
    expect(mixText()).toBe("color- 30.0 g 0/65- 2.0 g developer 32.0 g");

    fireEvent.change(screen.getByLabelText("Amount of 0/65, g"), { target: { value: "4" } });
    expect(mixText()).toContain("0/65- 4.0 g");

    // Level 7: the stronger 0/44, and the Rule of 10 again (3 g), not the typed 4 g.
    chooseOption("Target level", "7");
    expect(mixText()).toBe("color- 30.0 g 0/44- 3.0 g developer 33.0 g");
  });
});
