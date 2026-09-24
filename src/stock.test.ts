import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeStockConsumption, consumeStock, reconcileStockConsumption, developerStockId, shadeStockId, getStockStatus, getShadeTubeSizeGrams, restockOneTube, findStockShortages, type StockRecord } from "./stock";
import type { ColorHistoryStep, HistoryStep } from "./history";
import type { Shade } from "./engine/shades";
import { COLOR_FULL_FORMULA, makeColorStep as makeSharedColorStep, makeBleachStep } from "./testFixtures";

const docMock = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const getDocMock = vi.fn();
const setDocMock = vi.fn();
const updateDocMock = vi.fn();
const deleteDocMock = vi.fn();
const onSnapshotMock = vi.fn();
const incrementMock = vi.fn((n: number) => ({ kind: "increment", n }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "collection-ref"),
  doc: (...args: unknown[]) => docMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  increment: (n: number) => incrementMock(n),
}));
vi.mock("./firebase", () => ({ db: {} }));

beforeEach(() => {
  vi.clearAllMocks();
});

function makeColorStep(overrides: Partial<ColorHistoryStep> = {}): ColorHistoryStep {
  return makeSharedColorStep({
    brandId: "wella",
    brandName: "Wella",
    line: "Koleston Perfect",
    targetShade: { code: "7/1", level: 7, tone: "ash", line: "Koleston Perfect" },
    startLevel: 6,
    result: { ...COLOR_FULL_FORMULA, mixingRatio: { colorParts: 1, developerParts: 2 }, grams: { colorGrams: 30, developerGrams: 60 } },
    pricePerGram: 0.2,
    ...overrides,
  });
}

const bleachStep = makeBleachStep();

describe("computeStockConsumption", () => {
  it("charges the primary shade and the developer volume actually used", () => {
    const consumptions = computeStockConsumption([makeColorStep()]);
    expect(consumptions).toEqual(
      expect.arrayContaining([
        { id: shadeStockId("wella", "Koleston Perfect", "7/1"), kind: "shade", code: "7/1", grams: 30 },
        { id: developerStockId("wella", 20), kind: "developer", code: "20", grams: 60 },
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
    expect(byId.get(developerStockId("wella", 20))?.grams).toBe(90);
  });

  it("charges the unscaled computed grams when no actual figure is recorded", () => {
    const consumptions = computeStockConsumption([makeColorStep({ actualColorGrams: undefined })]);
    const byId = new Map(consumptions.map(c => [c.id, c]));
    expect(byId.get(shadeStockId("wella", "Koleston Perfect", "7/1"))?.grams).toBe(30);
    expect(byId.get(developerStockId("wella", 20))?.grams).toBe(60);
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

describe("consumeStock", () => {
  it("leaves an untracked product untouched instead of creating a new document", async () => {
    getDocMock.mockResolvedValue({ exists: () => false });
    await consumeStock([{ id: "shade::wella::x::y", kind: "shade", code: "y", grams: 30 }]);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("atomically decrements a tracked product's remaining grams", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });
    await consumeStock([{ id: "shade::wella::x::y", kind: "shade", code: "y", grams: 30 }]);
    expect(incrementMock).toHaveBeenCalledWith(-30);
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), { remainingGrams: { kind: "increment", n: -30 } });
  });
});

describe("restockOneTube", () => {
  it("does nothing for an untracked product instead of creating one", async () => {
    getDocMock.mockResolvedValue({ exists: () => false });
    await restockOneTube("shade::wella::x::y", 60);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("atomically adds exactly one tube's worth of grams to a tracked product", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });
    await restockOneTube("shade::loreal::majirel::7.1", 50);
    expect(incrementMock).toHaveBeenCalledWith(50);
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), { remainingGrams: { kind: "increment", n: 50 } });
  });
});

describe("getStockStatus", () => {
  it("reports out at or below zero, low up to the default threshold, and ok above it", () => {
    expect(getStockStatus(0)).toBe("out");
    expect(getStockStatus(-5)).toBe("out");
    expect(getStockStatus(60)).toBe("low");
    expect(getStockStatus(61)).toBe("ok");
  });

  it("honors a smaller explicit threshold, e.g. a 50 g tube line", () => {
    expect(getStockStatus(50, 50)).toBe("low");
    expect(getStockStatus(51, 50)).toBe("ok");
  });
});

describe("getShadeTubeSizeGrams", () => {
  it("uses the 50 g override for Majirel, Dia Light, and Dia Richesse", () => {
    expect(getShadeTubeSizeGrams("loreal", "majirel")).toBe(50);
    expect(getShadeTubeSizeGrams("loreal", "dia-light")).toBe(50);
    expect(getShadeTubeSizeGrams("loreal", "dia-richesse")).toBe(50);
  });

  it("falls back to the standard 60 g tube for every other line, including L'Oréal's own INOA", () => {
    expect(getShadeTubeSizeGrams("loreal", "inoa")).toBe(60);
    expect(getShadeTubeSizeGrams("wella", "Koleston Perfect")).toBe(60);
    expect(getShadeTubeSizeGrams("generic", null)).toBe(60);
  });
});

describe("reconcileStockConsumption", () => {
  it("charges only the difference when a recorded actual figure changes an already-saved session's grams", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });
    const before = [makeColorStep({ actualColorGrams: undefined })];
    const after = [makeColorStep({ actualColorGrams: 45 })];
    await reconcileStockConsumption(before, after);
    expect(incrementMock).toHaveBeenCalledWith(-15);
    expect(updateDocMock).toHaveBeenCalledWith(
      expect.anything(),
      { remainingGrams: { kind: "increment", n: -15 } }
    );
  });

  it("issues no update at all when the two step arrays consume the same grams", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });
    const before = [makeColorStep()];
    const after = [makeColorStep()];
    await reconcileStockConsumption(before, after);
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});
