// The accounts every e2e run starts with (created by global-setup.ts in the Auth
// emulator). They exist only inside the emulator; the passwords protect nothing.

export interface TestAccount {
  email: string;
  password: string;
}

// An approved salon member: has a `users/{uid}` document, so firestore.rules lets them in.
export const STYLIST: TestAccount = { email: "stylist@e2e.test", password: "e2e-password" };

// A verified account nobody has approved yet: no `users/{uid}` document.
export const NEWCOMER: TestAccount = { email: "newcomer@e2e.test", password: "e2e-password" };
