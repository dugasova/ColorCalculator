// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "../../i18n";
import { GuideCheatSheetPage } from "./GuideCheatSheetPage";
import { TECHNIQUE_GUIDE_IDS, hasTechniqueGuide } from "../../techniqueGuides";

afterEach(cleanup);

function renderGuidePage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/guides/:guideId" element={<GuideCheatSheetPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("hasTechniqueGuide", () => {
  it("accepts every known guide id and rejects anything else", () => {
    for (const id of TECHNIQUE_GUIDE_IDS) {
      expect(hasTechniqueGuide(id)).toBe(true);
    }
    expect(hasTechniqueGuide("not-a-real-guide")).toBe(false);
  });
});

describe("GuideCheatSheetPage", () => {
  it("renders the resistant-gray guide's title and its practical rules", () => {
    renderGuidePage("/guides/resistant-gray");

    expect(screen.getByRole("heading", { name: /Resistant . vitreous gray/i })).toBeInTheDocument();
    expect(screen.getByText(/never drop below 20 vol/)).toBeInTheDocument();
    expect(screen.getByText(/Pre-soften stubborn patches/)).toBeInTheDocument();
  });

  it("renders every known guide without crashing", () => {
    for (const id of TECHNIQUE_GUIDE_IDS) {
      const { unmount } = renderGuidePage(`/guides/${id}`);
      expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("shows a not-found message (not a crash) for an unknown guide id", () => {
    renderGuidePage("/guides/not-a-real-guide");

    expect(screen.getByRole("alert")).toHaveTextContent(/No guide for "not-a-real-guide"/);
    expect(screen.getByRole("link", { name: "← Back to the app" })).toHaveAttribute("href", "/");
  });
});
