// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within, fireEvent } from "@testing-library/react";
import "../../i18n";
import { HistoryView } from "./HistoryView";
import { subscribeToFormulaHistory, setActualColorGrams, deleteHistoryEntry, updateHistoryEntryDetails } from "../../history";
import { subscribeToClients, deleteClient } from "../../clients";
import type { FormulaHistoryEntry, ColorHistoryStep } from "../../history";
import type { ClientProfile } from "../../clients";

vi.mock("../../history", async () => {
  const actual = await vi.importActual<typeof import("../../history")>("../../history");
  return {
    ...actual,
    subscribeToFormulaHistory: vi.fn(),
    buildRepeatFormulaRequest: vi.fn().mockReturnValue(null),
    setActualColorGrams: vi.fn(),
    deleteHistoryEntry: vi.fn(),
    updateHistoryEntryDetails: vi.fn(),
  };
});
vi.mock("../../clients", () => ({
  subscribeToClients: vi.fn(),
  deleteClient: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const colorStep: ColorHistoryStep = {
  kind: "color",
  brandName: "Generic",
  line: null,
  targetShade: { code: "7.1", level: 7, tone: "ash" },
  startLevel: 6,
  grayPercent: 0,
  applicationZone: "full-head",
  result: {
    developerVolume: 20,
    mixingRatio: { colorParts: 1, developerParts: 1 },
    grayCoverage: { naturalRatio: 0, fashionRatio: 1, note: "apply the fashion tone as-is" },
    achievedLevel: 7,
    underlyingPigment: "pale-yellow",
    recommendedCorrectiveTone: null,
    correctorGrams: 0,
    recommendedProcessingMinutes: 30,
    toneWarning: null,
    eligibilityWarning: null,
    liftUnsupportedWarning: null,
    grams: { colorGrams: 30, developerGrams: 30 },
  },
  additionalShade: null,
  additionalShadeGrams: null,
  blend: null,
  prePigmentation: null,
  neutralizationApplied: false,
  processingMinutes: 30,
  pricePerGram: 0.2,
};

function makeEntry(overrides: Partial<FormulaHistoryEntry> & { id: string; clientName: string }): FormulaHistoryEntry {
  return {
    clientId: null,
    note: "",
    appliedBy: "stylist@salon.test",
    appliedAt: { toDate: () => new Date("2024-03-01") } as unknown as FormulaHistoryEntry["appliedAt"],
    steps: [colorStep],
    markupMultiplier: 4,
    productCost: null,
    servicePrice: null,
    patchTestDate: "",
    allergyNotes: "",
    patchTestOverride: true,
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    ...overrides,
  };
}

function renderHistoryView(overrides: Partial<{ isAdmin: boolean }> = {}) {
  return render(<HistoryView onRepeat={vi.fn()} isAdmin={overrides.isAdmin ?? false} currentUserEmail="stylist@salon.test" />);
}

function mockHistory(entries: FormulaHistoryEntry[]) {
  vi.mocked(subscribeToFormulaHistory).mockImplementation((_scope, onChange) => {
    onChange(entries);
    return () => {};
  });
}

function mockClients(clients: ClientProfile[]) {
  vi.mocked(subscribeToClients).mockImplementation((_ownedBy, onChange) => {
    onChange(clients);
    return () => {};
  });
}

describe("HistoryView client grouping", () => {
  it("groups every visit under one card per client, with an accurate visit count", async () => {
    mockHistory([
      makeEntry({ id: "1", clientName: "Anna K." }),
      makeEntry({ id: "2", clientName: "Anna K." }),
      makeEntry({ id: "3", clientName: "Boris P." }),
    ]);
    mockClients([]);

    renderHistoryView();

    // One card per distinct client, not per visit -- each card is a button carrying its
    // own "Visits: N" text in its accessible name, so this counts those rather than
    // matching the (ambiguous, repeated) name text directly.
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Visits: \d/ })).toHaveLength(2));
    expect(screen.getByText(/^Visits: 2/)).toBeInTheDocument();
    expect(screen.getByText(/^Visits: 1/)).toBeInTheDocument();
  });

  it("treats names differing only by case/whitespace as the same client", async () => {
    mockHistory([
      makeEntry({ id: "1", clientName: "anna k." }),
      makeEntry({ id: "2", clientName: "  Anna K.  " }),
    ]);
    mockClients([]);

    renderHistoryView();

    await waitFor(() => expect(screen.getAllByRole("button", { name: /Visits: \d/ })).toHaveLength(1));
    expect(screen.getByText(/^Visits: 2/)).toBeInTheDocument();
  });

  it("shows the stylist's own saved phone/allergy notes for a matched client", async () => {
    mockHistory([makeEntry({ id: "1", clientName: "Anna K." })]);
    const profile: ClientProfile = {
      id: "c1",
      ownedBy: "stylist@salon.test",
      name: "Anna K.",
      phone: "+1 555 0100",
      allergyNotes: "PPD sensitivity",
      lastCanvas: null,
    };
    mockClients([profile]);

    renderHistoryView();

    // Contact info sits directly on the collapsed card -- no need to open the modal for it.
    const card = await screen.findByRole("button", { name: /Visits: \d/ });
    expect(within(card).getByText(/\+1 555 0100/)).toBeInTheDocument();
    expect(within(card).getByText(/PPD sensitivity/)).toBeInTheDocument();
  });

  it("keeps every client card collapsed until clicked, opening only that client's visits in a modal", async () => {
    mockHistory([
      makeEntry({ id: "1", clientName: "Anna K." }),
      makeEntry({ id: "2", clientName: "Boris P." }),
    ]);
    mockClients([]);

    renderHistoryView();
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Visits: \d/ })).toHaveLength(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Anna K\./ }));

    // The dialog's accessible name is the modal title, set to the clicked client's own
    // display name -- confirms it opened the right client's visits, not the other one's.
    const dialog = await screen.findByRole("dialog", { name: "Anna K." });
    expect(within(dialog).queryByText("Boris P.")).not.toBeInTheDocument();
  });

  it("closes the modal on Escape, returning to the collapsed card list", async () => {
    mockHistory([makeEntry({ id: "1", clientName: "Anna K." })]);
    mockClients([]);

    renderHistoryView();
    fireEvent.click(await screen.findByRole("button", { name: /^Anna K\./ }));
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps two real clients who happen to share a name in separate cards, each with its own real clientId", async () => {
    mockHistory([
      makeEntry({ id: "1", clientName: "Anna K.", clientId: "anna-1" }),
      makeEntry({ id: "2", clientName: "Anna K.", clientId: "anna-2" }),
    ]);
    mockClients([]);

    renderHistoryView();

    // Two distinct people with the same display name must never merge into one card --
    // that would silently mix their formula history/visit counts together.
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Visits: \d/ })).toHaveLength(2));
    const visitCounts = screen.getAllByText(/^Visits: 1/);
    expect(visitCounts).toHaveLength(2);
  });

  it("matches each card's saved-client profile by its own clientId, not by the shared name", async () => {
    mockHistory([
      makeEntry({ id: "1", clientName: "Anna K.", clientId: "anna-1" }),
      makeEntry({ id: "2", clientName: "Anna K.", clientId: "anna-2" }),
    ]);
    mockClients([
      { id: "anna-1", ownedBy: "stylist@salon.test", name: "Anna K.", phone: "+1 555 0100", allergyNotes: "", lastCanvas: null },
      { id: "anna-2", ownedBy: "stylist@salon.test", name: "Anna K.", phone: "+1 555 0200", allergyNotes: "", lastCanvas: null },
    ]);

    renderHistoryView();

    const cards = await screen.findAllByRole("button", { name: /Visits: \d/ });
    expect(cards).toHaveLength(2);
    const cardPhones = cards.map(card => within(card).getByText(/\+1 555/).textContent);
    expect(cardPhones.sort()).toEqual([expect.stringContaining("+1 555 0100"), expect.stringContaining("+1 555 0200")]);
    // Each card shows only its own person's phone, never the namesake's.
    for (const card of cards) {
      expect(within(card).queryAllByText(/\+1 555/)).toHaveLength(1);
    }
  });
});

describe("HistoryView revisit reminders", () => {
  it("opens a WhatsApp link addressed to the client's saved phone, prefilled with their name and recommended date", async () => {
    mockHistory([
      makeEntry({ id: "1", clientName: "Anna K.", clientId: "anna-1" }),
    ]);
    mockClients([
      { id: "anna-1", ownedBy: "stylist@salon.test", name: "Anna K.", phone: "+380 50 123 4567", allergyNotes: "", lastCanvas: null },
    ]);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    renderHistoryView();

    const remindButton = await screen.findByRole("button", { name: /Remind via WhatsApp/ });
    fireEvent.click(remindButton);

    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url.startsWith("https://wa.me/380501234567?text=")).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toContain("Anna K.");
    openSpy.mockRestore();
  });

  it("opens a Telegram share link when the Remind via Telegram button is clicked", async () => {
    mockHistory([makeEntry({ id: "1", clientName: "Anna K." })]);
    mockClients([]);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    renderHistoryView();

    const remindButton = await screen.findByRole("button", { name: /Remind via Telegram/ });
    fireEvent.click(remindButton);

    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url.startsWith("https://t.me/share/url?url=")).toBe(true);
    openSpy.mockRestore();
  });
});

describe("HistoryView actual grams", () => {
  it("records a typed actual-grams figure on blur and renders the entry's updated product cost", async () => {
    const entry = makeEntry({ id: "1", clientName: "Anna K." });
    mockHistory([entry]);
    mockClients([]);
    vi.mocked(setActualColorGrams).mockResolvedValue({ steps: entry.steps, productCost: 18 });

    renderHistoryView();

    fireEvent.click(await screen.findByRole("button", { name: /^Anna K\./ }));
    await screen.findByRole("dialog");

    const input = await screen.findByLabelText("Actually used 7.1, g");
    fireEvent.change(input, { target: { value: "45" } });
    fireEvent.blur(input);

    await waitFor(() =>
      expect(setActualColorGrams).toHaveBeenCalledWith({
        id: "1",
        steps: entry.steps,
        stepIndex: 0,
        actualColorGrams: 45,
      })
    );
    await waitFor(() => expect(screen.getByText(/Product cost: 18\.00/)).toBeInTheDocument());
  });
});

describe("HistoryView delete client", () => {
  it("hides the delete-client action for a non-admin stylist", async () => {
    mockHistory([makeEntry({ id: "1", clientName: "Anna K.", clientId: "anna-1" })]);
    mockClients([]);

    renderHistoryView({ isAdmin: false });
    fireEvent.click(await screen.findByRole("button", { name: /^Anna K\./ }));
    await screen.findByRole("dialog");

    expect(screen.queryByRole("button", { name: "Delete client" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting, and does nothing on Cancel", async () => {
    mockHistory([makeEntry({ id: "1", clientName: "Anna K.", clientId: "anna-1" })]);
    mockClients([]);

    renderHistoryView({ isAdmin: true });
    fireEvent.click(await screen.findByRole("button", { name: /^Anna K\./ }));
    await screen.findByRole("dialog", { name: "Anna K." });

    fireEvent.click(screen.getByRole("button", { name: "Delete client" }));
    const confirmDialog = await screen.findByRole("dialog", { name: /Delete Anna K\.\?/ });
    expect(within(confirmDialog).getByText(/1 saved visit/)).toBeInTheDocument();

    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Delete Anna K\.\?/ })).not.toBeInTheDocument());
    expect(deleteHistoryEntry).not.toHaveBeenCalled();
    expect(deleteClient).not.toHaveBeenCalled();
    // The client card behind the (now-dismissed) confirm dialog is untouched.
    expect(screen.getByRole("dialog", { name: "Anna K." })).toBeInTheDocument();
  });

  it("deletes every visit and the saved profile on confirm, then removes the client from the list", async () => {
    mockHistory([
      makeEntry({ id: "1", clientName: "Anna K.", clientId: "anna-1" }),
      makeEntry({ id: "2", clientName: "Anna K.", clientId: "anna-1" }),
      makeEntry({ id: "3", clientName: "Boris P." }),
    ]);
    mockClients([
      { id: "anna-1", ownedBy: "stylist@salon.test", name: "Anna K.", phone: "", allergyNotes: "", lastCanvas: null },
    ]);
    vi.mocked(deleteHistoryEntry).mockResolvedValue(undefined);
    vi.mocked(deleteClient).mockResolvedValue(undefined);

    renderHistoryView({ isAdmin: true });
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Visits: \d/ })).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: /^Anna K\./ }));
    await screen.findByRole("dialog", { name: "Anna K." });

    fireEvent.click(screen.getByRole("button", { name: "Delete client" }));
    const confirmDialog = await screen.findByRole("dialog", { name: /Delete Anna K\.\?/ });
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Delete permanently" }));

    await waitFor(() => expect(deleteClient).toHaveBeenCalledWith("anna-1"));
    expect(deleteHistoryEntry).toHaveBeenCalledTimes(2);

    // Both dialogs close and Anna's card is gone -- Boris's is untouched.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Visits: \d/ })).toHaveLength(1));
    expect(screen.getByRole("button", { name: /^Boris P\./ })).toBeInTheDocument();
  });

  it("shows an error and keeps the client listed when the delete fails", async () => {
    mockHistory([makeEntry({ id: "1", clientName: "Anna K.", clientId: "anna-1" })]);
    mockClients([]);
    vi.mocked(deleteHistoryEntry).mockRejectedValue(new Error("offline"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    renderHistoryView({ isAdmin: true });
    fireEvent.click(await screen.findByRole("button", { name: /^Anna K\./ }));
    await screen.findByRole("dialog", { name: "Anna K." });
    fireEvent.click(screen.getByRole("button", { name: "Delete client" }));
    const confirmDialog = await screen.findByRole("dialog", { name: /Delete Anna K\.\?/ });
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Delete permanently" }));

    await waitFor(() => expect(screen.getByText(/Could not delete this client/)).toBeInTheDocument());
    // The confirm dialog stays open and the client is still listed -- nothing was lost.
    expect(screen.getByRole("dialog", { name: /Delete Anna K\.\?/ })).toBeInTheDocument();
    expect(deleteClient).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe("HistoryView edit visit details", () => {
  async function openEditDialog(entries: FormulaHistoryEntry[]) {
    mockHistory(entries);
    mockClients([]);
    renderHistoryView();
    fireEvent.click(await screen.findByRole("button", { name: /^Anna K\./ }));
    await screen.findByRole("dialog", { name: "Anna K." });
    fireEvent.click(screen.getByRole("button", { name: /^Edit visit/ }));
    return screen.findByRole("dialog", { name: /Edit visit — Anna K\./ });
  }

  it("saves an edited note and shows it on the visit card, closing the edit dialog", async () => {
    vi.mocked(updateHistoryEntryDetails).mockResolvedValue({
      note: "Allergic to ammonia", patchTestDate: "", allergyNotes: "", patchTestOverride: true,
      beforePhotoUrl: null, afterPhotoUrl: null,
    });
    const dialog = await openEditDialog([makeEntry({ id: "1", clientName: "Anna K.", note: "typo" })]);

    const note = within(dialog).getByLabelText("Note");
    expect(note).toHaveValue("typo");
    fireEvent.change(note, { target: { value: "Allergic to ammonia" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateHistoryEntryDetails).toHaveBeenCalledWith(expect.objectContaining({
      entry: expect.objectContaining({ id: "1" }),
      note: "Allergic to ammonia",
      beforePhoto: { kind: "keep" },
      afterPhoto: { kind: "keep" },
    })));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Edit visit/ })).not.toBeInTheDocument());
    expect(screen.getByText("Allergic to ammonia")).toBeInTheDocument();
  });

  it("marks a stored photo for removal and sends a 'remove' edit for just that slot", async () => {
    vi.mocked(updateHistoryEntryDetails).mockResolvedValue({
      note: "", patchTestDate: "", allergyNotes: "", patchTestOverride: true,
      beforePhotoUrl: null, afterPhotoUrl: "https://x/after.jpg",
    });
    const dialog = await openEditDialog([makeEntry({
      id: "1", clientName: "Anna K.", beforePhotoUrl: "https://x/before.jpg", afterPhotoUrl: "https://x/after.jpg",
    })]);

    fireEvent.click(within(dialog).getAllByRole("button", { name: "Remove photo" })[0]);
    expect(within(dialog).getByText("Photo will be removed on save")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateHistoryEntryDetails).toHaveBeenCalledWith(expect.objectContaining({
      beforePhoto: { kind: "remove" },
      afterPhoto: { kind: "keep" },
    })));
  });

  it("lets the colorist undo a pending photo removal before saving", async () => {
    const dialog = await openEditDialog([makeEntry({
      id: "1", clientName: "Anna K.", beforePhotoUrl: "https://x/before.jpg",
    })]);

    fireEvent.click(within(dialog).getByRole("button", { name: "Remove photo" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Undo" }));

    expect(within(dialog).queryByText("Photo will be removed on save")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
  });

  it("sends a newly picked photo as a 'replace' edit", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:preview");
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    vi.mocked(updateHistoryEntryDetails).mockResolvedValue({
      note: "", patchTestDate: "", allergyNotes: "", patchTestOverride: true,
      beforePhotoUrl: null, afterPhotoUrl: "https://x/new.jpg",
    });
    const dialog = await openEditDialog([makeEntry({ id: "1", clientName: "Anna K." })]);
    const file = new File(["x"], "after.jpg", { type: "image/jpeg" });

    fireEvent.change(within(dialog).getByLabelText("After photo"), { target: { files: [file] } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateHistoryEntryDetails).toHaveBeenCalledWith(expect.objectContaining({
      beforePhoto: { kind: "keep" },
      afterPhoto: { kind: "replace", file },
    })));
  });

  it("blocks saving a patch test that is under 48h before the visit, judged against the visit date rather than today", async () => {
    // Visit on 2024-03-01 (see makeEntry); a test one day earlier is too recent for it,
    // however old it is relative to today.
    const dialog = await openEditDialog([makeEntry({
      id: "1", clientName: "Anna K.", patchTestOverride: false, patchTestDate: "2024-02-29T12:00",
    })]);

    expect(within(dialog).getByRole("alert")).toHaveTextContent(/at least 48h before this visit/);
    expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText("Patch test date & time"), { target: { value: "2024-02-27T10:00" } });
    expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("keeps the dialog open with an error when saving fails, so nothing typed is lost", async () => {
    vi.mocked(updateHistoryEntryDetails).mockRejectedValue(new Error("offline"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const dialog = await openEditDialog([makeEntry({ id: "1", clientName: "Anna K." })]);

    fireEvent.change(within(dialog).getByLabelText("Note"), { target: { value: "new note" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent(/Could not save the changes/));
    expect(within(dialog).getByLabelText("Note")).toHaveValue("new note");
    expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeEnabled();

    consoleError.mockRestore();
  });
});
