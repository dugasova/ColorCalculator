import { describe, it, expect, vi, beforeEach } from "vitest";
import { setShadeDisabled, addShadeToBrand, addCustomBrand } from "./palette";

const docMock = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const collectionMock = vi.fn((...args: unknown[]) => { void args; return "collection-ref"; });
const setDocMock = vi.fn();
const deleteDocMock = vi.fn();
const addDocMock = vi.fn();
const onSnapshotMock = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => collectionMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  Timestamp: class Timestamp {},
}));
vi.mock("./firebase", () => ({ db: {} }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setShadeDisabled", () => {
  it("writes a disable override keyed by brand+line+code, URI-encoding a slash in the code", async () => {
    await setShadeDisabled("wella", "Koleston Perfect", "5/41", true);

    expect(docMock).toHaveBeenCalledWith({}, "paletteOverrides", "wella::Koleston%20Perfect::5%2F41");
    expect(setDocMock).toHaveBeenCalledWith(
      { kind: "doc", args: [{}, "paletteOverrides", "wella::Koleston%20Perfect::5%2F41"] },
      { kind: "disable", brandId: "wella", line: "Koleston Perfect", code: "5/41" }
    );
    expect(deleteDocMock).not.toHaveBeenCalled();
  });

  it("collapses a null line to an empty segment, still unambiguous", async () => {
    await setShadeDisabled("generic", null, "7.1", true);

    expect(docMock).toHaveBeenCalledWith({}, "paletteOverrides", "generic::::7.1");
  });

  it("deletes the same-keyed document (and never writes) when re-enabling", async () => {
    await setShadeDisabled("wella", "Koleston Perfect", "5/41", false);

    expect(deleteDocMock).toHaveBeenCalledWith(
      { kind: "doc", args: [{}, "paletteOverrides", "wella::Koleston%20Perfect::5%2F41"] }
    );
    expect(setDocMock).not.toHaveBeenCalled();
  });
});

describe("addShadeToBrand", () => {
  it("adds an 'add' override document to the paletteOverrides collection", async () => {
    const shade = { code: "7.1", level: 7 as const, tone: "ash" as const };

    await addShadeToBrand("wella", shade);

    expect(collectionMock).toHaveBeenCalledWith({}, "paletteOverrides");
    expect(addDocMock).toHaveBeenCalledWith("collection-ref", { kind: "add", brandId: "wella", shade });
  });
});

describe("addCustomBrand", () => {
  it("writes the new brand document under the id the caller supplied", async () => {
    const input = {
      id: "my-brand",
      name: "My Brand",
      pricePerGram: 0.25,
      mixingRatioConfig: { kind: "generic" as const },
    };

    await addCustomBrand(input);

    expect(docMock).toHaveBeenCalledWith({}, "customBrands", "my-brand");
    expect(setDocMock).toHaveBeenCalledWith(
      { kind: "doc", args: [{}, "customBrands", "my-brand"] },
      { name: "My Brand", pricePerGram: 0.25, mixingRatioConfig: { kind: "generic" } }
    );
  });
});
