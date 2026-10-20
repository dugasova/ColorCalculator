import { describe, it, expect } from "vitest";
import { computeStockConsumption, findStockShortages } from "./consumption";
import { developerStockId, shadeStockId } from "./products";
import type { StockRecord } from "./types";
import type { HistoryStep } from "../history";
import type { Shade } from "../engine/shades";
import { COLOR_FULL_FORMULA, makeBleachStep } from "../testFixtures";
import { makeColorStep } from "./testFixtures";

const bleachStep = makeBleachStep();

describe("computeStockConsumption", () => {
  it("charges the primary shade and the developer volume actually used", () => {
    const consumptions = computeStockConsumption([makeColorStep()]);
    expect(consumptions).toEqual(
      expect.arrayContaining([
        { id: shadeStockId("wella", "Koleston Perfect", "7/1"), kind: "shade", code: "7/1", grams: 30 },
        { id: developerStockId("wella", null, 20), kind: "developer", code: "20", grams: 60 },
      ])
    );
    expect(consumptions).toHaveLength(2);
  });

  it("subtracts a discretionary additional shade from the primary and charges it separately", () => {
    const additionalShade: Shade = { code: "0/11", level: 1, tone: "ash" };
    const step = makeColorStep({ additionalShade, additionalShadeGrams: 6 });
    const consumptions = computeStockConsumption([step]);
    const byId = new Map(consumptions.map(c => [c.id, c]));
    expect(byId.get(shadeStockId("wella", "Koleston Perfect", "7/1"))?.grams).toBe(24);
    expect(byId.get(shadeStockId("wella", null, "0/11"))?.grams).toBe(6);
  });

  it("charges a substitute blend's two component shades instead of the target shade", () => {
    const shadeA: Shade = { code: "7/71", level: 7, tone: "ash" };
    const shadeB: Shade = { code: "7/17", level: 7, tone: "ash" };
    const step = makeColorStep({ blend: { shadeA, shadeAGrams: 21, shadeB, shadeBGrams: 9 } });
    const consumptions = computeStockConsumption([step]);
    const byId = new Map(consumptions.map(c => [c.id, c]));
    expect(byId.get(shadeStockId("wella", null, "7/71"))?.grams).toBe(21);
    expect(byId.get(shadeStockId("wella", null, "7/17"))?.grams).toBe(9);
    expect(byId.has(shadeStockId("wella", "Koleston Perfect", "7/1"))).toBe(false);
  });

  it("skips a bleach step, a step without brandId, and a step with no computed grams", () => {
    const noBrandId = makeColorStep({ brandId: undefined });
    const noGrams = makeColorStep({ result: { ...makeColorStep().result, grams: null } });
    const steps: HistoryStep[] = [bleachStep, noBrandId, noGrams];
    expect(computeStockConsumption(steps)).toEqual([]);
  });

  it("sums grams for the same product used across multiple steps", () => {
    const consumptions = computeStockConsumption([makeColorStep(), makeColorStep()]);
    const shade = consumptions.find(c => c.kind === "shade");
    expect(shade?.grams).toBe(60);
  });

  it("scales shade and developer grams by a recorded actual figure", () => {
    const consumptions = computeStockConsumption([makeColorStep({ actualColorGrams: 45 })]);
    const byId = new Map(consumptions.map(c => [c.id, c]));
    expect(byId.get(shadeStockId("wella", "Koleston Perfect", "7/1"))?.grams).toBe(45);
    expect(byId.get(developerStockId("wella", null, 20))?.grams).toBe(90);
  });

  it("charges the unscaled computed grams when no actual figure is recorded", () => {
    const consumptions = computeStockConsumption([makeColorStep({ actualColorGrams: undefined })]);
    const byId = new Map(consumptions.map(c => [c.id, c]));
    expect(byId.get(shadeStockId("wella", "Koleston Perfect", "7/1"))?.grams).toBe(30);
    expect(byId.get(developerStockId("wella", null, 20))?.grams).toBe(60);
  });

  it("charges a scoped line's developer separately from the rest of its brand -- INOA vs Majirel/Dia", () => {
    const inoaStep = makeColorStep({
      brandId: "loreal", line: "inoa",
      result: { ...COLOR_FULL_FORMULA, developerVolume: 20, grams: { colorGrams: 30, developerGrams: 30 } },
    });
    const majirelStep = makeColorStep({
      brandId: "loreal", line: "majirel",
      result: { ...COLOR_FULL_FORMULA, developerVolume: 20, grams: { colorGrams: 30, developerGrams: 45 } },
    });
    const consumptions = computeStockConsumption([inoaStep, majirelStep]);
    const byId = new Map(consumptions.map(c => [c.id, c]));
    expect(byId.get(developerStockId("loreal", "inoa", 20))?.grams).toBe(30);
    expect(byId.get(developerStockId("loreal", null, 20))?.grams).toBe(45);
  });
});

describe("findStockShortages", () => {
  const shadeRecord = (remainingGrams: number): StockRecord => ({
    id: shadeStockId("wella", "Koleston Perfect", "7/1"),
    kind: "shade",
    brandId: "wella",
    line: "Koleston Perfect",
    code: "7/1",
    remainingGrams,
  });

  it("flags a product the session needs more of than the salon has on hand", () => {
    const shortages = findStockShortages([makeColorStep()], [shadeRecord(10)]);
    expect(shortages).toHaveLength(1);
    expect(shortages[0].consumption.grams).toBe(30);
    expect(shortages[0].remainingGrams).toBe(10);
  });

  it("is not a shortage when remaining stock exactly covers what's needed", () => {
    expect(findStockShortages([makeColorStep()], [shadeRecord(30)])).toEqual([]);
  });

  it("treats a product with no stock record at all as untracked, not short", () => {
    expect(findStockShortages([makeColorStep()], [])).toEqual([]);
  });
});

describe("computeStockConsumption with a gray-coverage natural base", () => {
  const natural: Shade = { code: "7/0", level: 7, tone: "natural", line: "Koleston Perfect" };

  it("charges the natural base to its own shade and takes it out of the primary, keeping the total", () => {
    const consumptions = computeStockConsumption([makeColorStep({ naturalBase: { shade: natural, grams: 10 } })]);
    const byId = new Map(consumptions.map(c => [c.id, c]));
    expect(byId.get(shadeStockId("wella", "Koleston Perfect", "7/1"))?.grams).toBe(20);
    expect(byId.get(shadeStockId("wella", "Koleston Perfect", "7/0"))?.grams).toBe(10);
  });

  it("scales the natural base by a recorded actual figure like every other share", () => {
    const consumptions = computeStockConsumption([makeColorStep({ naturalBase: { shade: natural, grams: 10 }, actualColorGrams: 45 })]);
    const byId = new Map(consumptions.map(c => [c.id, c]));
    expect(byId.get(shadeStockId("wella", "Koleston Perfect", "7/1"))?.grams).toBe(30);
    expect(byId.get(shadeStockId("wella", "Koleston Perfect", "7/0"))?.grams).toBe(15);
  });

  it("charges nothing extra for a step saved before the option existed", () => {
    expect(computeStockConsumption([makeColorStep({ naturalBase: undefined })])).toHaveLength(2);
  });
});
