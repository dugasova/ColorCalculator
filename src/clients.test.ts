import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchClients, upsertClient } from "./clients";

const setDocMock = vi.fn();
const docMock = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const getDocsMock = vi.fn();
const orderByMock = vi.fn((...args: unknown[]) => ({ kind: "orderBy", field: args[0] }));
const whereMock = vi.fn((...args: unknown[]) => ({ kind: "where", field: args[0], op: args[1], value: args[2] }));
const queryMock = vi.fn((...args: unknown[]) => ({ kind: "query", args }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "collection-ref"),
  doc: (...args: unknown[]) => docMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  serverTimestamp: vi.fn(() => "server-timestamp"),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
}));
vi.mock("./firebase", () => ({ db: {} }));

beforeEach(() => {
  vi.clearAllMocks();
  setDocMock.mockResolvedValue(undefined);
  getDocsMock.mockResolvedValue({ docs: [] });
});

describe("upsertClient", () => {
  it("writes a deterministic id keyed by owner + normalized name, so the same client upserts instead of duplicating", async () => {
    await upsertClient({
      ownedBy: "stylist@salon.test",
      name: "  Anna K.  ",
      phone: " +1 555 0100 ",
      allergyNotes: "PPD sensitivity",
      canvas: { porosity: "high", thickness: "fine", chemicalHistory: ["keratin"] },
    });

    expect(docMock).toHaveBeenCalledWith(
      {},
      "clients",
      `${encodeURIComponent("stylist@salon.test")}::${encodeURIComponent("anna k.")}`
    );
    expect(setDocMock).toHaveBeenCalledWith(
      { kind: "doc", args: [{}, "clients", `${encodeURIComponent("stylist@salon.test")}::${encodeURIComponent("anna k.")}`] },
      {
        ownedBy: "stylist@salon.test",
        name: "Anna K.",
        nameKey: "anna k.",
        phone: "+1 555 0100",
        allergyNotes: "PPD sensitivity",
        lastCanvas: { porosity: "high", thickness: "fine", chemicalHistory: ["keratin"] },
        updatedAt: "server-timestamp",
      }
    );
  });

  it("is a no-op for a blank name -- there's nothing to key the profile by", async () => {
    await upsertClient({ ownedBy: "stylist@salon.test", name: "   ", phone: "", allergyNotes: "", canvas: null });

    expect(setDocMock).not.toHaveBeenCalled();
  });
});

describe("fetchClients", () => {
  it("scopes the query to the given owner and orders by name", async () => {
    await fetchClients("stylist@salon.test");

    expect(whereMock).toHaveBeenCalledWith("ownedBy", "==", "stylist@salon.test");
    expect(orderByMock).toHaveBeenCalledWith("name");
    expect(queryMock).toHaveBeenCalledWith(
      "collection-ref",
      { kind: "where", field: "ownedBy", op: "==", value: "stylist@salon.test" },
      { kind: "orderBy", field: "name" }
    );
  });

  it("skips a malformed document instead of throwing or poisoning the rest of the list", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    getDocsMock.mockResolvedValue({
      docs: [
        { id: "good", data: () => ({ ownedBy: "s@t", name: "Anna", phone: "", allergyNotes: "", lastCanvas: null }) },
        { id: "bad", data: () => ({ ownedBy: "s@t" }) }, // missing required fields
      ],
    });

    const result = await fetchClients("s@t");

    expect(result).toEqual([{ id: "good", ownedBy: "s@t", name: "Anna", phone: "", allergyNotes: "", lastCanvas: null }]);
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
