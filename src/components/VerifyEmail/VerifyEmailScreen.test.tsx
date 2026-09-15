// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "../../i18n";
import { VerifyEmailScreen } from "./VerifyEmailScreen";
import type { User } from "firebase/auth";

const reloadMock = vi.fn();
const getIdTokenMock = vi.fn();
const sendEmailVerificationMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("firebase/auth", () => ({
  reload: (...args: unknown[]) => reloadMock(...args),
  getIdToken: (...args: unknown[]) => getIdTokenMock(...args),
  sendEmailVerification: (...args: unknown[]) => sendEmailVerificationMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));
vi.mock("../../firebase", () => ({ auth: {} }));

function fakeUser(emailVerified: boolean): User {
  return { email: "stylist@salon.test", emailVerified } as User;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("VerifyEmailScreen", () => {
  it("forces an ID token refresh before signaling the gate is clear, so Firestore's rules see the new email_verified claim immediately instead of on the token's next natural refresh", async () => {
    const user = fakeUser(true);
    reloadMock.mockResolvedValue(undefined);
    getIdTokenMock.mockResolvedValue("fresh-token");
    const onRefreshed = vi.fn();

    render(<VerifyEmailScreen user={user} onRefreshed={onRefreshed} />);
    fireEvent.click(screen.getByRole("button", { name: /verified/i }));

    await waitFor(() => expect(onRefreshed).toHaveBeenCalledTimes(1));
    expect(getIdTokenMock).toHaveBeenCalledWith(user, true);
    // The refresh must complete before the caller is told it's safe to proceed --
    // otherwise AuthenticatedApp's Firestore reads/writes could still race the old token.
    const idTokenOrder = getIdTokenMock.mock.invocationCallOrder[0];
    const onRefreshedOrder = onRefreshed.mock.invocationCallOrder[0];
    expect(idTokenOrder).toBeLessThan(onRefreshedOrder);
  });

  it("does not refresh the token or signal the gate is clear when still unverified", async () => {
    const user = fakeUser(false);
    reloadMock.mockResolvedValue(undefined);
    const onRefreshed = vi.fn();

    render(<VerifyEmailScreen user={user} onRefreshed={onRefreshed} />);
    fireEvent.click(screen.getByRole("button", { name: /verified/i }));

    await screen.findByRole("alert");
    expect(getIdTokenMock).not.toHaveBeenCalled();
    expect(onRefreshed).not.toHaveBeenCalled();
  });
});
