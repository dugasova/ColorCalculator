// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "../../i18n";
import { SessionDetailsPanel } from "./SessionDetailsPanel";
import { subscribeToClients, createClient, updateClient, type ClientProfile } from "../../clients";
import type { RepeatFormulaRequest } from "../../history";

vi.mock("../../clients", () => ({
  subscribeToClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
}));

const APPLIED_BY = "stylist@salon.test";
const ANNA_1 = { id: "anna-1", ownedBy: APPLIED_BY, name: "Anna K.", phone: "+1 555 0100", allergyNotes: "PPD sensitivity", lastCanvas: null };

// Only clientName/clientId are read by SessionDetailsPanel; the rest are dummy values
// satisfying RepeatFormulaRequest's full shape (the calculator-state fields this panel
// never touches).
function makeRepeatRequest(overrides: Partial<Pick<RepeatFormulaRequest, "clientName" | "clientId">>): RepeatFormulaRequest {
  return {
    clientName: "Anna K.",
    clientId: "anna-1",
    brandId: "generic",
    line: null,
    targetShadeCode: "7.1",
    startLevel: 7,
    grayPercent: 0,
    totalGrams: 60,
    manualDeveloperVolume: undefined,
    additionalShadeCode: null,
    additionalShadeGrams: 0,
    blendShadeACode: null,
    blendShadeBCode: null,
    blendPrimaryPercent: 70,
    processingMinutes: 30,
    applicationZone: "full-head",
    pricePerGram: 0.18,
    markupMultiplier: 4,
    servicePrice: undefined,
    prePigmentationEnabled: false,
    ...overrides,
  };
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function mockClients(clients: ClientProfile[]) {
  vi.mocked(subscribeToClients).mockImplementation((_ownedBy, onChange) => {
    onChange(clients);
    return () => {};
  });
}

function openModal() {
  fireEvent.click(screen.getByRole("button", { name: "Client & visit details" }));
}

// Regression: repeating a returning client's past visit used to leave the client name
// field blank, so an easy-to-miss unlinked Save created a second, duplicate client
// profile for the exact same person -- double-counting them as a new "unique client" in
// both History's grouping and AnalyticsView's retention figures.
describe("SessionDetailsPanel repeatRequest client link", () => {
  it("pre-fills the client name and re-links to the matched saved profile, without any suggestion click", async () => {
    mockClients([ANNA_1]);
    render(
      <SessionDetailsPanel
        formulaText="Test formula"
        processingMinutes={30}
        onSave={vi.fn()}
        appliedBy={APPLIED_BY}
        repeatRequest={makeRepeatRequest({})}
      />
    );
    openModal();

    expect(screen.getByLabelText("Client name")).toHaveValue("Anna K.");
    await waitFor(() => expect(screen.getByText(/Linked to saved client: Anna K\./)).toBeInTheDocument());
  });

  it("re-links Save to the same client profile via updateClient, never creating a duplicate", async () => {
    mockClients([ANNA_1]);
    vi.mocked(updateClient).mockResolvedValue(undefined);
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SessionDetailsPanel
        formulaText="Test formula"
        processingMinutes={30}
        onSave={onSave}
        appliedBy={APPLIED_BY}
        repeatRequest={makeRepeatRequest({})}
      />
    );
    openModal();
    await waitFor(() => expect(screen.getByText(/Linked to saved client: Anna K\./)).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Patch test not required (no new product, no reaction history)"));
    fireEvent.click(screen.getByRole("button", { name: "Save to history" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(updateClient).toHaveBeenCalledWith("anna-1", expect.objectContaining({ name: "Anna K." }));
    expect(createClient).not.toHaveBeenCalled();
    expect(onSave.mock.calls[0][0]).toMatchObject({ clientId: "anna-1", clientName: "Anna K." });
  });

  it("backfills phone/allergy notes from the matched saved profile once it loads", async () => {
    mockClients([ANNA_1]);
    render(
      <SessionDetailsPanel
        formulaText="Test formula"
        processingMinutes={30}
        onSave={vi.fn()}
        appliedBy={APPLIED_BY}
        repeatRequest={makeRepeatRequest({})}
      />
    );
    openModal();

    await waitFor(() => expect(screen.getByLabelText("Phone")).toHaveValue("+1 555 0100"));
    expect(screen.getByLabelText("Known allergies")).toHaveValue("PPD sensitivity");
  });

  it("does not create a duplicate profile for a legacy entry with no clientId, matching pre-fix behavior", async () => {
    mockClients([]);
    vi.mocked(createClient).mockResolvedValue("new-id");
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SessionDetailsPanel
        formulaText="Test formula"
        processingMinutes={30}
        onSave={onSave}
        appliedBy={APPLIED_BY}
        repeatRequest={makeRepeatRequest({ clientId: null })}
      />
    );
    openModal();

    // No clientId to link to -- the name is still restored, but there's genuinely no
    // existing profile to attach to (pre-dates clientId, or was explicitly unlinked).
    expect(screen.getByLabelText("Client name")).toHaveValue("Anna K.");
    expect(screen.queryByText(/Linked to saved client/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Patch test not required (no new product, no reaction history)"));
    fireEvent.click(screen.getByRole("button", { name: "Save to history" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
