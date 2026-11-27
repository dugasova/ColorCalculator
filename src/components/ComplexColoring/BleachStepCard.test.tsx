// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, type Mock } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "../../i18n";
import { BleachStepCard } from "./BleachStepCard";
import { calculateBleachFormula } from "../../engine/bleach";
import type { BleachHistoryStep, BleachStepSeed } from "../../history";
import { chooseOption } from "../../testDom";

afterEach(cleanup);

// Pins what a bleach step shows and reports to the session, so the fields and calculation
// it shares with the standalone BleachCalculator can move without changing either screen.

type StepChangeMock = Mock<(step: BleachHistoryStep) => void>;

function renderStep(seed?: BleachStepSeed) {
  const onChange: StepChangeMock = vi.fn();
  const onRemove: Mock<() => void> = vi.fn();
  const view = render(<BleachStepCard stepId="1" seed={seed} onChange={onChange} onRemove={onRemove} />);
  return { onChange, onRemove, view };
}

function lastStep(onChange: StepChangeMock): BleachHistoryStep {
  return onChange.mock.calls[onChange.mock.calls.length - 1][0];
}

describe("BleachStepCard", () => {
  it("reports the default 6 -> 8 step with the recommended time and the default price", () => {
    const { onChange } = renderStep();
    const result = calculateBleachFormula(6, 8, 60);

    expect(lastStep(onChange)).toEqual({
      kind: "bleach",
      startLevel: 6,
      targetLevel: 8,
      result,
      processingMinutes: result.recommendedProcessingMinutes,
      pricePerGram: 0.1,
      canvas: { porosity: "normal", thickness: "medium", chemicalHistory: [] },
      strandZone: "full-head",
      startingBase: { kind: "natural" },
    });
    expect(screen.getByText(/20\.0 g bleach powder/)).toBeInTheDocument();
    expect(screen.getByText("1.9% (6 vol)")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("recalculates the mix when the levels or the amount change", () => {
    const { onChange } = renderStep();

    fireEvent.change(screen.getByLabelText("Total weight, g"), { target: { value: "90" } });
    expect(lastStep(onChange).result).toEqual(calculateBleachFormula(6, 8, 90));
    expect(screen.getByText(/30\.0 g bleach powder/)).toBeInTheDocument();

    chooseOption("Target level", "9");
    chooseOption("Current level", "5");
    expect(lastStep(onChange)).toMatchObject({
      startLevel: 5,
      targetLevel: 9,
      result: calculateBleachFormula(5, 9, 90),
    });
  });

  it("keeps a processing time typed by hand and follows the recommendation otherwise", () => {
    const { onChange } = renderStep();

    chooseOption("Target level", "9");
    expect(lastStep(onChange).processingMinutes).toBe(calculateBleachFormula(6, 9, 60).recommendedProcessingMinutes);

    fireEvent.change(screen.getByLabelText("Processing time, min"), { target: { value: "25" } });
    chooseOption("Target level", "8");
    expect(lastStep(onChange).processingMinutes).toBe(25);

    fireEvent.change(screen.getByLabelText("Price per gram"), { target: { value: "0.25" } });
    expect(lastStep(onChange).pricePerGram).toBe(0.25);
  });

  it("warns and hides the mix, time and price when there is nothing to lift", () => {
    renderStep();

    chooseOption("Target level", "6");

    expect(screen.getByRole("alert")).toHaveTextContent("choose a target level above your current level");
    expect(screen.queryByText(/g bleach powder/)).toBeNull();
    expect(screen.queryByLabelText("Processing time, min")).toBeNull();
    expect(screen.queryByLabelText("Price per gram")).toBeNull();
  });

  it("warns that a lift too large for one session needs several", () => {
    renderStep();

    chooseOption("Current level", "4");
    chooseOption("Target level", "10");

    expect(screen.getByRole("alert")).toHaveTextContent("Today, lift to level 7");
    expect(screen.getByText(/Session 2: 7 → 10/)).toBeInTheDocument();
    // This visit's mix is the first session's.
    expect(screen.getByText(/g bleach powder/)).toBeInTheDocument();
  });

  it("starts from a repeated visit's values", () => {
    const { onChange } = renderStep({
      kind: "bleach",
      startLevel: 4,
      targetLevel: 7,
      totalGrams: 90,
      processingMinutes: 35,
      pricePerGram: 0.3,
      strandZone: "roots",
      startingBase: { kind: "natural" },
    });

    expect(lastStep(onChange)).toMatchObject({
      startLevel: 4,
      targetLevel: 7,
      result: calculateBleachFormula(4, 7, 90),
      processingMinutes: 35,
      pricePerGram: 0.3,
      strandZone: "roots",
    });
  });

  it("restores a hand-picked developer from a repeated visit, and lets it go back to Auto", () => {
    const { onChange } = renderStep({
      kind: "bleach",
      startLevel: 5,
      targetLevel: 8,
      totalGrams: 60,
      processingMinutes: 35,
      pricePerGram: 0.1,
      manualDeveloperVolume: 20,
    });
    expect(lastStep(onChange).result.developerVolume).toBe(20);

    chooseOption("Developer", "auto");
    expect(lastStep(onChange).result.manualDeveloperVolume).toBeNull();
    expect(lastStep(onChange).result.developerVolume).toBe(6);
  });

  it("does not report an unchanged step again when only the callback changes", () => {
    const { onChange, view } = renderStep();
    const calls = onChange.mock.calls.length;
    const next: StepChangeMock = vi.fn();

    view.rerender(<BleachStepCard stepId="1" onChange={next} onRemove={() => {}} />);

    expect(onChange.mock.calls.length).toBe(calls);
    expect(next).not.toHaveBeenCalled();
  });

  it("asks to be removed", () => {
    const { onRemove } = renderStep();
    fireEvent.click(screen.getByRole("button", { name: "Remove step" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  // Highlights: the step is applied to foiled strands, not to all hair of the zone.
  it("reports no foil placement until the colorist picks one, then the group and the percentage", () => {
    const { onChange } = renderStep();
    expect("foil" in lastStep(onChange)).toBe(false);
    expect(screen.queryByLabelText("Hair in foil, % (approx.)")).toBeNull();

    chooseOption("Coverage", "strands-1");
    expect(lastStep(onChange).foil).toEqual({ group: "strands-1", percent: null });

    fireEvent.change(screen.getByLabelText("Hair in foil, % (approx.)"), { target: { value: "30" } });
    expect(lastStep(onChange).foil).toEqual({ group: "strands-1", percent: 30 });

    // the estimate stays with the strands when the set is renumbered
    chooseOption("Coverage", "strands-2");
    expect(lastStep(onChange).foil).toEqual({ group: "strands-2", percent: 30 });

    // hair outside the foil has no percentage of its own
    chooseOption("Coverage", "outside");
    expect(lastStep(onChange).foil).toEqual({ group: "outside", percent: null });
    expect(screen.queryByLabelText("Hair in foil, % (approx.)")).toBeNull();

    chooseOption("Coverage", "all");
    expect("foil" in lastStep(onChange)).toBe(false);
  });

  it("keeps the percentage a whole number between 1 and 100, and clears it when emptied", () => {
    const { onChange } = renderStep({
      kind: "bleach",
      startLevel: 4,
      targetLevel: 8,
      totalGrams: 60,
      processingMinutes: 30,
      pricePerGram: 0.1,
      foil: { group: "strands-1", percent: 30 },
    });
    expect(lastStep(onChange).foil).toEqual({ group: "strands-1", percent: 30 });
    const input = screen.getByLabelText("Hair in foil, % (approx.)");

    fireEvent.change(input, { target: { value: "250" } });
    expect(lastStep(onChange).foil?.percent).toBe(100);
    fireEvent.change(input, { target: { value: "12.6" } });
    expect(lastStep(onChange).foil?.percent).toBe(13);
    fireEvent.change(input, { target: { value: "" } });
    expect(lastStep(onChange).foil?.percent).toBeNull();
  });

  it("does not change the mix: the percent in foil is a note only", () => {
    const { onChange } = renderStep();
    const before = lastStep(onChange).result;

    chooseOption("Coverage", "strands-1");
    const inFoil = lastStep(onChange).result;
    // Foil keeps the powder off the scalp: a single session's mix stays the same.
    expect(inFoil.grams).toEqual(before.grams);
    expect(inFoil.developerVolume).toBe(before.developerVolume);

    fireEvent.change(screen.getByLabelText("Hair in foil, % (approx.)"), { target: { value: "30" } });
    expect(lastStep(onChange).result).toEqual(inFoil);
  });

  it("lifts strands in foil past the scalp's 3 levels in one session", () => {
    const { onChange } = renderStep();

    chooseOption("Current level", "4");
    chooseOption("Target level", "8");
    expect(lastStep(onChange).result.multiStepRequired).toBe(true);

    chooseOption("Coverage", "strands-1");
    expect(lastStep(onChange).result.multiStepRequired).toBe(false);
    expect(screen.queryByText(/Session plan/)).toBeNull();
  });
});
