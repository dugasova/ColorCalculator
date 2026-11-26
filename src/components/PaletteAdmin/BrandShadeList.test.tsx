// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "../../i18n";
import { BrandShadeList } from "./BrandShadeList";
import { BRANDS } from "../../engine/brands";
import { chooseOption } from "../../testDom";

vi.mock("../../palette", () => ({
  useShadeCalibrationIndex: () => new Map(),
  setShadeDisabled: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../shadeCalibrations", () => ({ deleteShadeCalibration: vi.fn() }));

afterEach(cleanup);

const matrix = BRANDS.matrix.shades;

function renderList() {
  render(
    <BrandShadeList
      brands={BRANDS}
      brandIds={["matrix"]}
      selectedBrandId="matrix"
      onSelectBrand={() => {}}
      shades={matrix}
      disabledKeys={new Set()}
    />,
  );
}

const codes = () => Array.from(document.querySelectorAll(".palette-admin__shade-code")).map(el => el.textContent);

describe("BrandShadeList filter", () => {
  it("narrows the list to one line", () => {
    renderList();
    expect(codes()).toHaveLength(matrix.length);

    chooseOption("Line", "super-sync");
    const superSync = matrix.filter(shade => shade.line === "super-sync").length;
    expect(codes()).toHaveLength(superSync);
    expect(screen.getByText(`Showing ${superSync} of ${matrix.length}`)).toBeInTheDocument();
  });

  it("finds a shade by code or name, within the picked line", () => {
    renderList();
    chooseOption("Line", "socolor");
    fireEvent.change(screen.getByLabelText("Find a shade"), { target: { value: "10a" } });
    expect(codes()).toEqual(["10AV"]);

    fireEvent.change(screen.getByLabelText("Find a shade"), { target: { value: "zzz" } });
    expect(screen.getByText("No shades match the filter.")).toBeInTheDocument();
  });

  it("offers no line filter for a brand with a single line", () => {
    render(
      <BrandShadeList
        brands={BRANDS}
        brandIds={["generic"]}
        selectedBrandId="generic"
        onSelectBrand={() => {}}
        shades={BRANDS.generic.shades}
        disabledKeys={new Set()}
      />,
    );
    expect(screen.queryByLabelText("Line")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Find a shade")).toBeInTheDocument();
  });
});
