import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient, updateClient, fetchClients } from "./clients";

const addDocMock = vi.fn();
const updateDocMock = vi.fn();
const docMock = vi.fn((...args: unknown[]) => ({ kind: "doc", args }));
const getDocsMock = vi.fn();
const orderByMock = vi.fn((...args: unknown[]) => ({ kind: "orderBy", field: args[0] }));
const whereMock = vi.fn((...args: unknown[]) => ({ kind: "where", field: args[0], op: args[1], value: args[2] }));
const queryMock = vi.fn((...args: unknown[]) => ({ kind: "query", args }));

vi.mock("firebase/firestore", () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: vi.fn(() => "collection-ref"),
  doc: (...args: unknown[]) => docMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  serverTimestamp: vi.fn(() => "server-timestamp"),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
}));
vi.mock("./firebase", () => ({ db: {} }));

beforeEach(() => {
  vi.clearAllMocks();
  addDocMock.mockResolvedValue({ id: "new-doc-id" });
  updateDocMock.mockResolvedValue(undefined);
  getDocsMock.mockResolvedValue({ docs: [] });
});

describe("createClient", () => {
  it("creates a brand-new profile via a real Firestore-assigned id, not a name-derived one", async () => {
    const id = await createClient({
      ownedBy: "stylist@salon.test",
      name: "  Anna K.  ",
      phone: " +1 555 0100 ",
      allergyNotes: "PPD sensitivity",
      canvas: { porosity: "high", thickness: "fine", chemicalHistory: ["keratin"] },
    });

    expect(id).toBe("new-doc-id");
    expect(addDocMock).toHaveBeenCalledWith("collection-ref", {
      ownedBy: "stylist@salon.test",
      name: "Anna K.",
      phone: "+1 555 0100",
      allergyNotes: "PPD sensitivity",
      lastCanvas: { porosity: "high", thickness: "fine", chemicalHistory: ["keratin"] },
      updatedAt: "server-timestamp",
    });
  });

  // Two real clients sharing a name must never collide into one profile -- calling
  // createClient twice for "Anna K." (e.g. two different people, same name) has to
  // produce two independent ids, since nothing here derives the id from the name.
  it("creates a distinct id on every call, even for the exact same name", async () => {
    addDocMock.mockResolvedValueOnce({ id: "anna-1" }).mockResolvedValueOnce({ id: "anna-2" });

    const first = await createClient({ ownedBy: "stylist@salon.test", name: "Anna K.", phone: "", allergyNotes: "", canvas: null });
    const second = await createClient({ ownedBy: "stylist@salon.test", name: "Anna K.", phone: "", allergyNotes: "", canvas: null });

    expect(first).not.toBe(second);
    expect(addDocMock).toHaveBeenCalledTimes(2);
  });
});

describe("updateClient", () => {
  it("writes to the given client's own real id", async () => {
    await updateClient("anna-1", {
      name: "Anna K.",
      phone: "+1 555 0100",
      allergyNotes: "PPD sensitivity",
      canvas: { porosity: "normal", thickness: "medium", chemicalHistory: [] },
    });

    expect(docMock).toHaveBeenCalledWith({}, "clients", "anna-1");
    expect(updateDocMock).toHaveBeenCalledWith(
      { kind: "doc", args: [{}, "clients", "anna-1"] },
      {
        name: "Anna K.",
        phone: "+1 555 0100",
        allergyNotes: "PPD sensitivity",
        lastCanvas: { porosity: "normal", thickness: "medium", chemicalHistory: [] },
        updatedAt: "server-timestamp",
      }
    );
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
