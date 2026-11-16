import { NEWCOMER, STYLIST, type TestAccount } from "./accounts.ts";

const PROJECT_ID = "demo-formulist";

// "Bearer owner" is the emulators' admin token: it bypasses firestore.rules and Auth's
// own checks, the way the Firebase console does. It means nothing outside an emulator.
const ADMIN_HEADERS = { "Content-Type": "application/json", Authorization: "Bearer owner" };

// `firebase emulators:exec` (npm run test:e2e) sets both of these for the command it runs.
function emulatorHosts(): { auth: string; firestore: string } {
  const auth = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestore = process.env.FIRESTORE_EMULATOR_HOST;
  if (!auth || !firestore) {
    throw new Error("The Firebase emulators are not running. Start the e2e tests with: npm run test:e2e");
  }
  return { auth, firestore };
}

async function post(url: string, body: unknown, method = "POST"): Promise<Record<string, unknown>> {
  const response = await fetch(url, { method, headers: ADMIN_HEADERS, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${method} ${url} failed: ${response.status} ${await response.text()}`);
  return (await response.json()) as Record<string, unknown>;
}

// Creates the accounts the scenarios sign in with, through the emulators' REST APIs
// (plain fetch, so the test runner needs no Firebase Admin SDK). The emulators start
// empty on every run, so there is nothing to clean up first.
export default async function globalSetup(): Promise<void> {
  const hosts = emulatorHosts();
  const authApi = `http://${hosts.auth}/identitytoolkit.googleapis.com/v1`;

  const createVerifiedUser = async (account: TestAccount): Promise<string> => {
    const created = await post(`${authApi}/accounts:signUp?key=e2e`, {
      email: account.email,
      password: account.password,
    });
    const uid = created.localId as string;
    await post(`${authApi}/projects/${PROJECT_ID}/accounts:update`, { localId: uid, emailVerified: true });
    return uid;
  };

  const stylistUid = await createVerifiedUser(STYLIST);
  // The document that makes an account a salon member (see firestore.rules' isMember()).
  await post(
    `http://${hosts.firestore}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${stylistUid}`,
    { fields: { role: { stringValue: "stylist" } } },
    "PATCH",
  );
  await createVerifiedUser(NEWCOMER);
}
