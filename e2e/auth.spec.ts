import { expect, test } from "@playwright/test";
import { NEWCOMER, STYLIST } from "./accounts.ts";
import { signIn } from "./app.ts";

test("an approved stylist signs in and lands on the calculator", async ({ page }) => {
  await signIn(page, STYLIST);

  await expect(page.getByRole("tab", { name: "Calculator" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Shade", { exact: true })).toBeVisible();
});

// firestore.rules lets a verified account in only once it has a `users/{uid}` document.
test("a verified account nobody approved yet is held at the pending screen", async ({ page }) => {
  await signIn(page, NEWCOMER);

  await expect(page.getByText(NEWCOMER.email)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByLabel("Shade", { exact: true })).toHaveCount(0);
});
