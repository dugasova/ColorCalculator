// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within, fireEvent } from "@testing-library/react";
import "../../i18n";
import { HistoryView } from "./HistoryView";
import { fetchFormulaHistory } from "../../history";
import { fetchClients } from "../../clients";
import type { FormulaHistoryEntry, ColorHistoryStep } from "../../history";
import type { ClientProfile } from "../../clients";

vi.mock("../../history", async () => {
  const actual = await vi.importActual<typeof import("../../history")>("../../history");
  return {
    ...actual,
    fetchFormulaHistory: vi.fn(),
    buildRepeatFormulaRequest: vi.fn().mockReturnValue(null),
  };
});
vi.mock("../../clients", () => ({
  fetchClients: vi.fn(),
}));

afterEach(cleanup);

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

function renderHistoryView() {
  return render(<HistoryView onRepeat={vi.fn()} isAdmin={false} currentUserEmail="stylist@salon.test" />);
}

describe("HistoryView client grouping", () => {
  it("groups every visit under one card per client, with an accurate visit count", async () => {
    vi.mocked(fetchFormulaHistory).mockResolvedValue([
      makeEntry({ id: "1", clientName: "Anna K." }),
      makeEntry({ id: "2", clientName: "Anna K." }),
      makeEntry({ id: "3", clientName: "Boris P." }),
    ]);
    vi.mocked(fetchClients).mockResolvedValue([]);

    renderHistoryView();

    // One card per distinct client, not per visit -- "Anna K."/"Boris P." also appear
    // inside each visit's own entry card, so this counts <details role="group"> cards
    // rather than matching the (ambiguous, repeated) name text directly.
    await waitFor(() => expect(screen.getAllByRole("group")).toHaveLength(2));
    expect(screen.getByText(/^Visits: 2/)).toBeInTheDocument();
    expect(screen.getByText(/^Visits: 1/)).toBeInTheDocument();
  });

  it("treats names differing only by case/whitespace as the same client", async () => {
    vi.mocked(fetchFormulaHistory).mockResolvedValue([
      makeEntry({ id: "1", clientName: "anna k." }),
      makeEntry({ id: "2", clientName: "  Anna K.  " }),
    ]);
    vi.mocked(fetchClients).mockResolvedValue([]);

    renderHistoryView();

    await waitFor(() => expect(screen.getAllByRole("group")).toHaveLength(1));
    expect(screen.getByText(/^Visits: 2/)).toBeInTheDocument();
  });

  it("shows the stylist's own saved phone/allergy notes for a matched client", async () => {
    vi.mocked(fetchFormulaHistory).mockResolvedValue([makeEntry({ id: "1", clientName: "Anna K." })]);
    const profile: ClientProfile = {
      id: "c1",
      ownedBy: "stylist@salon.test",
      name: "Anna K.",
      phone: "+1 555 0100",
      allergyNotes: "PPD sensitivity",
      lastCanvas: null,
    };
    vi.mocked(fetchClients).mockResolvedValue([profile]);

    renderHistoryView();

    const card = await screen.findByRole("group");
    expect(within(card).getByText(/\+1 555 0100/)).toBeInTheDocument();
    expect(within(card).getByText(/PPD sensitivity/)).toBeInTheDocument();
  });

  it("starts every client card collapsed, then auto-expands the one left after search narrows to a single client", async () => {
    vi.mocked(fetchFormulaHistory).mockResolvedValue([
      makeEntry({ id: "1", clientName: "Anna K." }),
      makeEntry({ id: "2", clientName: "Boris P." }),
    ]);
    vi.mocked(fetchClients).mockResolvedValue([]);

    renderHistoryView();
    await waitFor(() => expect(screen.getAllByRole("group")).toHaveLength(2));
    for (const group of screen.getAllByRole("group")) {
      expect((group as HTMLDetailsElement).open).toBe(false);
    }

    fireEvent.change(screen.getByLabelText("Search by client name"), { target: { value: "Anna" } });

    await waitFor(() => expect(screen.getAllByRole("group")).toHaveLength(1));
    expect((screen.getByRole("group") as HTMLDetailsElement).open).toBe(true);
  });

  it("keeps two real clients who happen to share a name in separate cards, each with its own real clientId", async () => {
    vi.mocked(fetchFormulaHistory).mockResolvedValue([
      makeEntry({ id: "1", clientName: "Anna K.", clientId: "anna-1" }),
      makeEntry({ id: "2", clientName: "Anna K.", clientId: "anna-2" }),
    ]);
    vi.mocked(fetchClients).mockResolvedValue([]);

    renderHistoryView();

    // Two distinct people with the same display name must never merge into one card --
    // that would silently mix their formula history/visit counts together.
    await waitFor(() => expect(screen.getAllByRole("group")).toHaveLength(2));
    const visitCounts = screen.getAllByText(/^Visits: 1/);
    expect(visitCounts).toHaveLength(2);
  });

  it("matches each card's saved-client profile by its own clientId, not by the shared name", async () => {
    vi.mocked(fetchFormulaHistory).mockResolvedValue([
      makeEntry({ id: "1", clientName: "Anna K.", clientId: "anna-1" }),
      makeEntry({ id: "2", clientName: "Anna K.", clientId: "anna-2" }),
    ]);
    vi.mocked(fetchClients).mockResolvedValue([
      { id: "anna-1", ownedBy: "stylist@salon.test", name: "Anna K.", phone: "+1 555 0100", allergyNotes: "", lastCanvas: null },
      { id: "anna-2", ownedBy: "stylist@salon.test", name: "Anna K.", phone: "+1 555 0200", allergyNotes: "", lastCanvas: null },
    ]);

    renderHistoryView();

    const cards = await screen.findAllByRole("group");
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
    vi.mocked(fetchFormulaHistory).mockResolvedValue([
      makeEntry({ id: "1", clientName: "Anna K.", clientId: "anna-1" }),
    ]);
    vi.mocked(fetchClients).mockResolvedValue([
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
    vi.mocked(fetchFormulaHistory).mockResolvedValue([makeEntry({ id: "1", clientName: "Anna K." })]);
    vi.mocked(fetchClients).mockResolvedValue([]);
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
