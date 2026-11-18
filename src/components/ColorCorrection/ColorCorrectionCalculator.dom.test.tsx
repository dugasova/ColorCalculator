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

  it("doses Igora by its Rule of 11 and adds no mixtone to Royal's 12- series", () => {
    render(<ColorCorrectionCalculator />);
    chooseOption("Brand", "igora");
    // Yellow-orange at level 8, 30 g: 3 cm = 1.5 g, less 40% = 0.9 g, split 0-22 + 0-11
    // and still adding up to 0.9 g; developer 1:1.
    fireEvent.click(screen.getByRole("radio", { name: "Yellow-orange" }));
    expect(screen.getByText("Mixtone amount (Rule of 11, Igora)")).toBeTruthy();
    expect(mixText()).toBe("color- 30.0 g 0-22- 0.5 g 0-11- 0.4 g developer 30.9 g");

    // Yellow at level 9: 0.6 g of 0-11; ticking 0-99 too shares it, half each.
    chooseOption("Target level", "9");
    fireEvent.click(screen.getByRole("radio", { name: "Yellow" }));
    expect(mixText()).toBe("color- 30.0 g 0-11- 0.6 g developer 30.6 g");
    fireEvent.click(screen.getByRole("checkbox", { name: "0-99" }));
    expect(mixText()).toBe("color- 30.0 g 0-11- 0.3 g 0-99- 0.3 g developer 30.6 g");
    // 0-11 can then be unticked, leaving 0-99 alone, which itself cannot be unticked.
    fireEvent.click(screen.getByRole("checkbox", { name: "0-11" }));
    expect(mixText()).toBe("color- 30.0 g 0-99- 0.6 g developer 30.6 g");
    expect((screen.getByRole("checkbox", { name: "0-99" }) as HTMLInputElement).disabled).toBe(true);

    // Green at level 6: 5 cm = 2.5 g of 0-89 by default, 0-88 on the colorist's pick.
    chooseOption("Target level", "6");
    fireEvent.click(screen.getByRole("radio", { name: "Green" }));
    expect(mixText()).toBe("color- 30.0 g 0-89- 2.5 g developer 32.5 g");
    fireEvent.click(screen.getByRole("radio", { name: "0-88" }));
    expect(mixText()).toBe("color- 30.0 g 0-88- 2.5 g developer 32.5 g");

    chooseOption("Target level", "12");
    expect(mixText()).not.toContain("0-");
    expect(screen.getByText(/not added to the 12- Special Blonde/)).toBeTruthy();
  });
});
