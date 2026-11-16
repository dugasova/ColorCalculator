import { defineConfig, devices } from "@playwright/test";

const PORT = 5199;

// End-to-end smoke tests: the real app in a real browser, against the Firebase Auth and
// Firestore emulators with the real firestore.rules. Run with `npm run test:e2e`, which
// starts the emulators around this; Playwright itself starts the app below.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // The scenarios share one emulator database and one account, so they run in order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `--mode e2e` loads .env.e2e: placeholder Firebase config plus the emulator flag.
    command: `npx vite --mode e2e --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
