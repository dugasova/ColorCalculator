// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import "../../i18n";
import { PhotoEstimate } from "./PhotoEstimate";
import type { Shade } from "../../engine/shades";
import type { Brand, BrandId } from "../../engine/brands";
import { measureGreyCard, measureHairColor } from "../../engine/photoColor";
import { shadeCalibrationId } from "../../engine/shadeCalibration";
import type { Lab } from "../../engine/color";

vi.mock("./readPhotoPixels", () => ({ readPhotoPixels: vi.fn() }));
import { readPhotoPixels } from "./readPhotoPixels";

vi.mock("../../palette", () => ({ usePalette: vi.fn(), useShadeCalibrationIndex: vi.fn() }));
import { usePalette, useShadeCalibrationIndex } from "../../palette";

// Flat opaque RGBA buffer standing in for readPhotoPixels' decoded output -- matches the
// shape measureGreyCard/measureHairColor expect without actually decoding an image file.
function fillSrgb(rgb: [number, number, number], n: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    out[i * 4] = rgb[0]; out[i * 4 + 1] = rgb[1]; out[i * 4 + 2] = rgb[2]; out[i * 4 + 3] = 255;
  }
  return out;
}

// A realistic neutral 18% grey card, in plain sRGB.
const CARD_SRGB: [number, number, number] = [118, 118, 118];
const cardPixels = fillSrgb(CARD_SRGB, 100);

// Runs the real grey-card-corrected measurement (engine/photoColor.ts, not mocked) against
// a chosen hair sRGB color, so a test's fixture calibration Lab is exactly what the
// component will measure for that same color -- not an approximation.
function measuredLab(hairSrgb: [number, number, number]): Lab {
  const card = measureGreyCard(cardPixels);
  if (!card.ok) throw new Error(`fixture card unexpectedly unmeasurable: ${card.reason}`);
  const sample = measureHairColor(fillSrgb(hairSrgb, 100), card.gains);
  if (sample === null) throw new Error("fixture hair sample unexpectedly unmeasurable");
  return sample.lab;
}

const BRAND_ID: BrandId = "brand-a";

function brandWith(shades: Shade[]): Record<BrandId, Brand> {
  return { [BRAND_ID]: { id: BRAND_ID, name: "Brand A", shades, mixingRatio: () => ({ colorParts: 1, developerParts: 1 }), pricePerGram: 0.1 } };
}

beforeEach(() => {
  URL.createObjectURL = vi.fn().mockReturnValue("blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.body.style.overflow = "";
});

async function pickPhoto(file: File) {
  const input = screen.getByLabelText("Photo") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("PhotoEstimate, startLevel mode", () => {
  it("estimates the closest calibrated level and applies it on click", async () => {
    const hairLab = measuredLab([140, 95, 70]);
    vi.mocked(usePalette).mockReturnValue(brandWith([
      { code: "5.0", level: 5, tone: "natural" },
      { code: "7.0", level: 7, tone: "natural" },
    ]));
    vi.mocked(useShadeCalibrationIndex).mockReturnValue(new Map<string, Lab>([
      [shadeCalibrationId(BRAND_ID, null, "5.0"), [hairLab[0] - 20, hairLab[1], hairLab[2]]],
      [shadeCalibrationId(BRAND_ID, null, "7.0"), hairLab],
    ]));
    vi.mocked(readPhotoPixels).mockResolvedValue([fillSrgb([140, 95, 70], 100), cardPixels]);

    const onApplyLevel = vi.fn();
    render(<PhotoEstimate mode="startLevel" onApplyLevel={onApplyLevel} />);

    fireEvent.click(screen.getByRole("button", { name: "Estimate from photo" }));
    await pickPhoto(new File(["x"], "a.jpg", { type: "image/jpeg" }));
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(screen.getByText("Level 7, undertone: neutral")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Apply level 7" }));

    expect(onApplyLevel).toHaveBeenCalledWith(7);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("shows no analyze control when no natural shades are calibrated", () => {
    vi.mocked(usePalette).mockReturnValue(brandWith([{ code: "6.0", level: 6, tone: "natural" }]));
    vi.mocked(useShadeCalibrationIndex).mockReturnValue(new Map());

    render(<PhotoEstimate mode="startLevel" onApplyLevel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Estimate from photo" }));

    expect(screen.getByText("No natural shades are calibrated yet — an admin can calibrate them in Palette.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Analyze" })).not.toBeInTheDocument();
  });

  it("shows an alert when the grey card is overexposed", async () => {
    vi.mocked(usePalette).mockReturnValue(brandWith([{ code: "6.0", level: 6, tone: "natural" }]));
    vi.mocked(useShadeCalibrationIndex).mockReturnValue(new Map<string, Lab>([[shadeCalibrationId(BRAND_ID, null, "6.0"), [50, 0, 0]]]));
    vi.mocked(readPhotoPixels).mockResolvedValue([fillSrgb([140, 95, 70], 100), fillSrgb([255, 255, 255], 100)]);

    render(<PhotoEstimate mode="startLevel" onApplyLevel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Estimate from photo" }));
    await pickPhoto(new File(["x"], "a.jpg", { type: "image/jpeg" }));
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("The grey card is overexposed"));
  });

  it("shows a decode error when reading the photo fails", async () => {
    vi.mocked(usePalette).mockReturnValue(brandWith([{ code: "6.0", level: 6, tone: "natural" }]));
    vi.mocked(useShadeCalibrationIndex).mockReturnValue(new Map<string, Lab>([[shadeCalibrationId(BRAND_ID, null, "6.0"), [50, 0, 0]]]));
    vi.mocked(readPhotoPixels).mockRejectedValue(new Error("boom"));

    render(<PhotoEstimate mode="startLevel" onApplyLevel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Estimate from photo" }));
    await pickPhoto(new File(["x"], "a.jpg", { type: "image/jpeg" }));
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Couldn't read this photo"));
  });
});

describe("PhotoEstimate, targetShade mode", () => {
  const lineShades: Shade[] = [
    { code: "5.0", level: 5, tone: "natural" },
    { code: "8.3", level: 8, tone: "gold" },
    { code: "10.1", level: 10, tone: "ash" },
  ];

  it("ranks the calibrated shade closest to the photo first and applies it on click", async () => {
    const hairLab = measuredLab([170, 110, 60]);
    vi.mocked(usePalette).mockReturnValue({});
    vi.mocked(useShadeCalibrationIndex).mockReturnValue(new Map<string, Lab>([
      [shadeCalibrationId(BRAND_ID, null, "5.0"), [hairLab[0] - 30, hairLab[1], hairLab[2]]],
      [shadeCalibrationId(BRAND_ID, null, "8.3"), hairLab],
    ]));
    vi.mocked(readPhotoPixels).mockResolvedValue([fillSrgb([170, 110, 60], 100), cardPixels]);

    const onApplyShade = vi.fn();
    render(<PhotoEstimate mode="targetShade" brandId={BRAND_ID} lineShades={lineShades} onApplyShade={onApplyShade} />);

    fireEvent.click(screen.getByRole("button", { name: "Pick shade from photo" }));
    await pickPhoto(new File(["x"], "a.jpg", { type: "image/jpeg" }));
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("8.3"));

    fireEvent.click(screen.getAllByRole("button", { name: "Use this" })[0]);

    expect(onApplyShade).toHaveBeenCalledWith("8.3");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows no sampler when no shades in the line are calibrated", () => {
    vi.mocked(usePalette).mockReturnValue({});
    vi.mocked(useShadeCalibrationIndex).mockReturnValue(new Map());

    render(<PhotoEstimate mode="targetShade" brandId={BRAND_ID} lineShades={lineShades} onApplyShade={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Pick shade from photo" }));

    expect(screen.getByText("No shades in this line are calibrated yet — an admin can calibrate them in Palette.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Analyze" })).not.toBeInTheDocument();
  });
});
