// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { BRANDS } from "../../engine/brands";
import type { StartingBase } from "../../engine/startingBase";
import type { ColorHistoryStep } from "../../history";
import { useShadeFormulaState } from "../FormulaCalculator/useShadeFormulaState";
import { useColorStepReport } from "./useColorStepReport";

// See ColorStepCard.interaction.test.tsx for why this project needs an explicit cleanup.
afterEach(cleanup);

interface HarnessProps {
  pricePerGram: number;
  prePigmentationEnabled: boolean;
  onChange: (step: ColorHistoryStep) => void;
}

// Hoisted, not an inline literal: in ColorStepCard this is useState, so its identity is
// stable across renders -- a fresh object per render would itself re-fire the report effect.
const STARTING_BASE: StartingBase = { kind: "natural" };

// A real useShadeFormulaState feeding the hook, the same way ColorStepCard wires them --
// defaults are Generic 1.0 from start level 10, a drop that warrants pre-pigmentation.
function renderReport(initialProps: HarnessProps) {
  return renderHook(({ pricePerGram, prePigmentationEnabled, onChange }: HarnessProps) => {
    const formula = useShadeFormulaState({ brands: BRANDS });
    return useColorStepReport({
      brands: BRANDS, formula, strandZone: "full-head", startingBase: STARTING_BASE,
      pricePerGram, prePigmentationEnabled, onChange,
    });
  }, { initialProps });
}

describe("useColorStepReport", () => {
  it("reports the computed step once on mount, without pre-pigmentation until opted in", () => {
    const onChange = vi.fn();
    const { result } = renderReport({ pricePerGram: 0.18, prePigmentationEnabled: false, onChange });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatchObject({ kind: "color", prePigmentation: null, pricePerGram: 0.18 });
    expect(result.current.prePigmentationNeed).not.toBe("none");
    expect(result.current.prePigmentationResult).toBeNull();
  });

  it("does not re-report on a re-render with unchanged inputs -- a fresh parent onChange included", () => {
    const onChange = vi.fn();
    const { rerender } = renderReport({ pricePerGram: 0.18, prePigmentationEnabled: true, onChange });
    rerender({ pricePerGram: 0.18, prePigmentationEnabled: true, onChange: step => onChange(step) });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("re-reports with the filler step once pre-pigmentation is enabled", () => {
    const onChange = vi.fn();
    const { rerender, result } = renderReport({ pricePerGram: 0.18, prePigmentationEnabled: false, onChange });
    rerender({ pricePerGram: 0.18, prePigmentationEnabled: true, onChange });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].prePigmentation).not.toBeNull();
    expect(result.current.prePigmentationResult).not.toBeNull();
  });

  it("re-reports a changed price per gram", () => {
    const onChange = vi.fn();
    const { rerender } = renderReport({ pricePerGram: 0.18, prePigmentationEnabled: false, onChange });
    rerender({ pricePerGram: 0.25, prePigmentationEnabled: false, onChange });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ pricePerGram: 0.25 }));
  });
});
