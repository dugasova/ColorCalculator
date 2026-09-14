// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "../../i18n";
import { SessionDetailsPanel } from "./SessionDetailsPanel";
import { fetchClients, upsertClient } from "../../clients";

vi.mock("../../clients", () => ({
  fetchClients: vi.fn(),
  upsertClient: vi.fn(),
}));

const APPLIED_BY = "stylist@salon.test";
const SAVED_CLIENT = {
  id: "c1",
  ownedBy: APPLIED_BY,
  name: "Anna K.",
  phone: "+1 555 0100",
  allergyNotes: "PPD sensitivity",
  lastCanvas: { porosity: "high" as const, thickness: "fine" as const, chemicalHistory: ["keratin" as const] },
};

afterEach(cleanup);

function openModal() {
  fireEvent.click(screen.getByRole("button", { name: "Client & visit details" }));
}

// Waits for the async fetchClients() load to land in the datalist before the test drives
// the client-name field -- otherwise typing a matching name can race the fetch and find
// no match yet, and the assertions below would flake based on timing.
async function waitForClientListLoaded() {
  await waitFor(() => {
    expect(document.getElementById("savedClientNames")?.children.length).toBe(1);
  });
}

describe("SessionDetailsPanel client profile", () => {
  it("autofills phone and allergy notes for a client the stylist has saved before", async () => {
    vi.mocked(fetchClients).mockResolvedValue([SAVED_CLIENT]);
    render(
      <SessionDetailsPanel formulaText="Test formula" processingMinutes={30} onSave={vi.fn()} appliedBy={APPLIED_BY} />
    );
    openModal();
    await waitForClientListLoaded();

    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "Anna K." } });

    expect(screen.getByLabelText("Phone")).toHaveValue("+1 555 0100");
    expect(screen.getByLabelText("Known allergies")).toHaveValue("PPD sensitivity");
  });

  it("never overwrites a phone/allergy value the colorist already typed this visit", async () => {
    vi.mocked(fetchClients).mockResolvedValue([SAVED_CLIENT]);
    render(
      <SessionDetailsPanel formulaText="Test formula" processingMinutes={30} onSave={vi.fn()} appliedBy={APPLIED_BY} />
    );
    openModal();
    await waitForClientListLoaded();

    fireEvent.change(screen.getByLabelText("Known allergies"), { target: { value: "Also nickel, seen today" } });
    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "Anna K." } });

    // Phone was blank, so it still autofills...
    expect(screen.getByLabelText("Phone")).toHaveValue("+1 555 0100");
    // ...but the note the colorist just typed for today's visit survives untouched.
    expect(screen.getByLabelText("Known allergies")).toHaveValue("Also nickel, seen today");
  });

  it("shows the matched client's last known hair profile as a read-only hint", async () => {
    vi.mocked(fetchClients).mockResolvedValue([SAVED_CLIENT]);
    render(
      <SessionDetailsPanel formulaText="Test formula" processingMinutes={30} onSave={vi.fn()} appliedBy={APPLIED_BY} />
    );
    openModal();
    await waitForClientListLoaded();

    expect(screen.queryByText("Last visit's hair profile")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "Anna K." } });

    expect(screen.getByText("Last visit's hair profile")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("High");
  });

  it("upserts the client profile (phone, allergy notes, current canvas) after a successful save", async () => {
    vi.mocked(fetchClients).mockResolvedValue([]);
    vi.mocked(upsertClient).mockResolvedValue(undefined);
    const onSave = vi.fn().mockResolvedValue(undefined);
    const canvas = { porosity: "normal" as const, thickness: "medium" as const, chemicalHistory: [] };
    render(
      <SessionDetailsPanel
        formulaText="Test formula"
        processingMinutes={30}
        onSave={onSave}
        appliedBy={APPLIED_BY}
        canvas={canvas}
      />
    );
    openModal();

    fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "New Client" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "555-0199" } });
    fireEvent.click(screen.getByLabelText("Patch test not required (no new product, no reaction history)"));
    fireEvent.click(screen.getByRole("button", { name: "Save to history" }));

    await waitFor(() => expect(upsertClient).toHaveBeenCalledTimes(1));
    expect(upsertClient).toHaveBeenCalledWith({
      ownedBy: APPLIED_BY,
      name: "New Client",
      phone: "555-0199",
      allergyNotes: "",
      canvas,
    });
  });
});
