// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "../../i18n";
import { SessionDetailsPanel } from "./SessionDetailsPanel";
import { fetchClients, createClient, updateClient } from "../../clients";

vi.mock("../../clients", () => ({
  fetchClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
}));

const APPLIED_BY = "stylist@salon.test";
const ANNA_1 = {
  id: "anna-1",
  ownedBy: APPLIED_BY,
  name: "Anna K.",
  phone: "+1 555 0100",
  allergyNotes: "PPD sensitivity",
  lastCanvas: { porosity: "high" as const, thickness: "fine" as const, chemicalHistory: ["keratin" as const] },
};
const ANNA_2 = {
  id: "anna-2",
  ownedBy: APPLIED_BY,
  name: "Anna K.",
  phone: "+1 555 0200",
  allergyNotes: "",
  lastCanvas: null,
};

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function openModal() {
  fireEvent.click(screen.getByRole("button", { name: "Client & visit details" }));
}

async function waitForClientListLoaded(count: number) {
  await waitFor(() => expect(screen.getAllByRole("button", { name: /\+1 555|no phone on file/ })).toHaveLength(count));
}

describe("SessionDetailsPanel client disambiguation", () => {
  it("offers both namesakes as separate picks and links to only the one actually clicked", async () => {
    vi.mocked(fetchClients).mockResolvedValue([ANNA_1, ANNA_2]);
    vi.mocked(updateClient).mockResolvedValue(undefined);
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SessionDetailsPanel formulaText="Test formula" processingMinutes={30} onSave={onSave} appliedBy={APPLIED_BY} />);
    openModal();

    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "Anna" } });
    await waitForClientListLoaded(2);

    // Pick the second Anna specifically (different phone) -- not the first.
    fireEvent.click(screen.getByRole("button", { name: /\+1 555 0200/ }));

    expect(screen.getByText(/Linked to saved client: Anna K\./)).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toHaveValue("+1 555 0200");
    // The suggestion list is gone once a specific client is confirmed.
    expect(screen.queryByRole("button", { name: /\+1 555 0100/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Patch test not required (no new product, no reaction history)"));
    fireEvent.click(screen.getByRole("button", { name: "Save to history" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(updateClient).toHaveBeenCalledWith("anna-2", expect.objectContaining({ name: "Anna K." }));
    expect(createClient).not.toHaveBeenCalled();
    expect(onSave.mock.calls[0][0]).toMatchObject({ clientId: "anna-2" });
  });

  it("re-shows the suggestion list (and drops the previous link) once the name is edited again", async () => {
    vi.mocked(fetchClients).mockResolvedValue([ANNA_1, ANNA_2]);
    render(<SessionDetailsPanel formulaText="Test formula" processingMinutes={30} onSave={vi.fn()} appliedBy={APPLIED_BY} />);
    openModal();

    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "Anna" } });
    await waitForClientListLoaded(2);
    fireEvent.click(screen.getByRole("button", { name: /\+1 555 0100/ }));
    expect(screen.getByText(/Linked to saved client: Anna K\./)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "Anna K.2" } });

    expect(screen.queryByText(/Linked to saved client/)).not.toBeInTheDocument();
  });

  it("lets the colorist explicitly detach from a wrongly picked namesake via \"not this person\"", async () => {
    vi.mocked(fetchClients).mockResolvedValue([ANNA_1]);
    render(<SessionDetailsPanel formulaText="Test formula" processingMinutes={30} onSave={vi.fn()} appliedBy={APPLIED_BY} />);
    openModal();

    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "Anna K." } });
    await waitForClientListLoaded(1);
    fireEvent.click(screen.getByRole("button", { name: /\+1 555 0100/ }));
    expect(screen.getByText(/Linked to saved client/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Not this person? Use a new profile" }));

    expect(screen.queryByText(/Linked to saved client/)).not.toBeInTheDocument();
    // The name text itself is untouched -- only the link is cleared.
    expect(screen.getByLabelText("Client name")).toHaveValue("Anna K.");
  });

  it("creates a brand-new profile (not an update) for a name with no matching suggestion, and links the entry to the new id", async () => {
    vi.mocked(fetchClients).mockResolvedValue([]);
    vi.mocked(createClient).mockResolvedValue("brand-new-id");
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SessionDetailsPanel formulaText="Test formula" processingMinutes={30} onSave={onSave} appliedBy={APPLIED_BY} />);
    openModal();

    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "Brand New Client" } });
    fireEvent.click(screen.getByLabelText("Patch test not required (no new product, no reaction history)"));
    fireEvent.click(screen.getByRole("button", { name: "Save to history" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({ ownedBy: APPLIED_BY, name: "Brand New Client" }));
    expect(updateClient).not.toHaveBeenCalled();
    expect(onSave.mock.calls[0][0]).toMatchObject({ clientId: "brand-new-id" });
  });

  it("shows the picked client's last visit hint only once a specific match is confirmed", async () => {
    vi.mocked(fetchClients).mockResolvedValue([ANNA_1, ANNA_2]);
    render(<SessionDetailsPanel formulaText="Test formula" processingMinutes={30} onSave={vi.fn()} appliedBy={APPLIED_BY} />);
    openModal();

    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "Anna" } });
    await waitForClientListLoaded(2);
    expect(screen.queryByText("Last visit's hair profile")).not.toBeInTheDocument();

    // ANNA_1 has a lastCanvas; ANNA_2 doesn't.
    fireEvent.click(screen.getByRole("button", { name: /\+1 555 0100/ }));
    expect(screen.getByText("Last visit's hair profile")).toBeInTheDocument();
  });
});
