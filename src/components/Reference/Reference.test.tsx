// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "../../i18n";
import { ReferenceIndexPage } from "./ReferenceIndexPage";
import { BRAND_CHEAT_SHEET_IDS } from "../../brandCheatSheets";
import { TECHNIQUE_GUIDE_IDS } from "../../techniqueGuides";

afterEach(cleanup);

describe("ReferenceIndexPage", () => {
  it("links to every known brand's own cheat sheet URL", () => {
    render(
      <MemoryRouter>
        <ReferenceIndexPage />
      </MemoryRouter>
    );

    for (const id of BRAND_CHEAT_SHEET_IDS) {
      const link = screen.getByRole("link", { name: new RegExp(id === "loreal" ? "L.Oréal" : id, "i") });
      expect(link).toHaveAttribute("href", `/${id}`);
    }
  });

  it("links to every known technique guide's own cheat sheet URL", () => {
    render(
      <MemoryRouter>
        <ReferenceIndexPage />
      </MemoryRouter>
    );

    for (const id of TECHNIQUE_GUIDE_IDS) {
      const link = screen.getByRole("link", { name: /Resistant . vitreous gray/i });
      expect(link).toHaveAttribute("href", `/guides/${id}`);
    }
  });

  it("renders both sections under one page, not two separate tabs", () => {
    render(
      <MemoryRouter>
        <ReferenceIndexPage />
      </MemoryRouter>
    );

    const headings = screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent);
    expect(headings.length).toBe(2);
  });
});
