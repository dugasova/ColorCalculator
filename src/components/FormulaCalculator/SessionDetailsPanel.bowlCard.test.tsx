// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import "../../i18n";
import { SessionDetailsPanel } from "./SessionDetailsPanel";

// Keeps this a pure component-interaction test: no real Firestore/network reachable from
// jsdom, and no bearing on what's under test here (the bowl-card open/close behavior).
vi.mock("../../clients", () => ({
  fetchClients: vi.fn().mockResolvedValue([]),
  createClient: vi.fn().mockResolvedValue("new-client-id"),
  updateClient: vi.fn().mockResolvedValue(undefined),
}));

const APPLIED_BY = "stylist@salon.test";

// See ColorStepCard.interaction.test.tsx for why this project needs an explicit
// afterEach(cleanup): it doesn't set vitest's `test.globals: true`.
afterEach(cleanup);

function typeClientName(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Client & visit details" }));
  fireEvent.change(screen.getByLabelText("Client name"), { target: { value: name } });
  // Closes the details modal so only the bowl card (opened below) ends up as the sole
  // open dialog when its own assertions run.
  fireEvent.keyDown(document, { key: "Escape" });
}

describe("SessionDetailsPanel bowl card", () => {
  it("shows no clickable client name until one has been typed", () => {
    render(<SessionDetailsPanel formulaText="Formula text" processingMinutes={40} onSave={vi.fn()} appliedBy={APPLIED_BY} />);
    expect(screen.queryByRole("button", { name: /Show a large formula card/ })).not.toBeInTheDocument();
  });

  it("opens a large card with the composition, processing time, and client name on a tap of the client name", async () => {
    render(
      <SessionDetailsPanel
        formulaText="Wella 7/1 30.0 g developer 30.0 g"
        processingMinutes={40}
        onSave={vi.fn()}
        appliedBy={APPLIED_BY}
      />
    );

    typeClientName("Anna K.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Show a large formula card for Anna K." })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Show a large formula card for Anna K." }));

    const card = await screen.findByRole("dialog");
    expect(within(card).getByText("Anna K.")).toBeInTheDocument();
    expect(within(card).getByText("Wella 7/1 30.0 g developer 30.0 g")).toBeInTheDocument();
    expect(within(card).getByText("Processing time: 40 min")).toBeInTheDocument();
  });

  it("closes the bowl card on Escape, returning to the plain results panel", async () => {
    render(<SessionDetailsPanel formulaText="Formula text" processingMinutes={40} onSave={vi.fn()} appliedBy={APPLIED_BY} />);

    typeClientName("Anna K.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Show a large formula card for Anna K." })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Show a large formula card for Anna K." }));
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
