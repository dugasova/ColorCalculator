// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "../../i18n";
import { BrandsIndexPage } from "./BrandsIndexPage";
import { BrandCheatSheetPage } from "./BrandCheatSheetPage";
import { BRAND_CHEAT_SHEET_IDS, hasBrandCheatSheet } from "../../brandCheatSheets";

afterEach(cleanup);

function renderBrandPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:brandId" element={<BrandCheatSheetPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("hasBrandCheatSheet", () => {
  it("accepts every known brand id and rejects anything else", () => {
    for (const id of BRAND_CHEAT_SHEET_IDS) {
      expect(hasBrandCheatSheet(id)).toBe(true);
    }
    expect(hasBrandCheatSheet("not-a-real-brand")).toBe(false);
  });
});

describe("BrandsIndexPage", () => {
  it("links to every known brand's own cheat sheet URL", () => {
    render(
      <MemoryRouter>
        <BrandsIndexPage />
      </MemoryRouter>
    );

    for (const id of BRAND_CHEAT_SHEET_IDS) {
      const link = screen.getByRole("link", { name: new RegExp(id === "loreal" ? "L.Oréal" : id, "i") });
      expect(link).toHaveAttribute("href", `/${id}`);
    }
  });
});

describe("BrandCheatSheetPage", () => {
  it("renders the brand's title and its short list of nuances", () => {
    renderBrandPage("/loreal");

    expect(screen.getByRole("heading", { name: "L'Oréal" })).toBeInTheDocument();
    expect(screen.getByText(/Majirel: fixed 1:1\.5/)).toBeInTheDocument();
    expect(screen.getByText(/INOA: fixed 1:1/)).toBeInTheDocument();
  });

  it("renders every known brand without crashing", () => {
    for (const id of BRAND_CHEAT_SHEET_IDS) {
      const { unmount } = renderBrandPage(`/${id}`);
      expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("shows a not-found message (not a crash) for an unknown brand id", () => {
    renderBrandPage("/not-a-real-brand");

    expect(screen.getByRole("alert")).toHaveTextContent(/No cheat sheet for "not-a-real-brand"/);
    expect(screen.getByRole("link", { name: "← Back to the app" })).toHaveAttribute("href", "/");
  });
});
