import { expect, type Locator, type Page } from "@playwright/test";
import type { TestAccount } from "./accounts.ts";

// Steps several scenarios share, written the way a colorist performs them.

export async function signIn(page: Page, account: TestAccount): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
}

// Signs in and waits until the calculator is on screen.
export async function signInAsMember(page: Page, account: TestAccount): Promise<void> {
  await signIn(page, account);
  await expect(page.getByLabel("Shade", { exact: true })).toBeVisible();
}

// Picks an option in the app's custom Select (components/common/Select): a click on its
// trigger opens the list, a click on the option commits it.
// `scope` narrows the lookup to one block when the page repeats a label (step cards).
export async function chooseOption(scope: Page | Locator, label: string, option: string | RegExp): Promise<void> {
  await scope.getByLabel(label, { exact: true }).click();
  await scope.getByRole("option", { name: option, exact: true }).click();
}

// Opens the save dialog, fills the two things a save needs, and waits for the
// confirmation. Leaves the dialog to close by itself, as it does for a colorist.
export async function saveForClient(page: Page, clientName: string): Promise<void> {
  await page.getByRole("button", { name: "Save for a client…" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Client name").fill(clientName);
  await dialog.getByLabel(/Patch test not required/).check();
  await dialog.getByRole("button", { name: "Save to history" }).click();
  await expect(dialog.getByRole("button", { name: "Saved" })).toBeVisible();
  await expect(dialog).toBeHidden();
}

// Opens a client's visits from the History list.
export async function openClientVisits(page: Page, clientName: string): Promise<Locator> {
  await page.getByRole("tab", { name: "History" }).click();
  await page.getByRole("button", { name: new RegExp(`^${clientName} Visits:`) }).click();
  return page.getByRole("dialog");
}

// The page must never be wider than the screen: a horizontal scrollbar on a phone means
// some block overflows its container.
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page is wider than the viewport").toBeLessThanOrEqual(0);
}
