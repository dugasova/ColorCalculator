import { expect, test } from "@playwright/test";
import { STYLIST } from "./accounts.ts";
import { chooseOption, openClientVisits, saveForClient, signInAsMember } from "./app.ts";

// The colorist's everyday path: calculate a formula, save it for a client, find it in
// History and repeat it at the next visit. Runs against the real firestore.rules.
test("a root touch-up is calculated, saved, found in History and repeated", async ({ page }) => {
  await signInAsMember(page, STYLIST);

  await chooseOption(page, "Starting level", "6");
  await chooseOption(page, "Shade", "8.1 ash");
  await chooseOption(page, "Application", "Root touch-up");

  // A root touch-up is 40 g of dye. Lifting 6 -> 8 mixes 1 : 1.5, so 60 g of developer.
  await expect(page.getByLabel("Color, g")).toHaveValue("40");
  await expect(page.getByText("8.1- 40.0 g developer 60.0 g")).toBeVisible();

  // Entered as a total, the same mix is 100 g -- not a flat 40 g (the bug fixed in 0.10.x).
  await chooseOption(page, "Amount entered as", "Total weight (color + developer)");
  await expect(page.getByLabel("Total weight, g")).toHaveValue("100");
  await expect(page.getByText("8.1- 40.0 g developer 60.0 g")).toBeVisible();

  await saveForClient(page, "Anna Rootova");
  // A save clears the calculator for the next client.
  await expect(page.getByLabel("Shade", { exact: true })).toHaveText(/^1\.0 natural/);

  const visits = await openClientVisits(page, "Anna Rootova");
  await expect(visits.getByText("8.1- 40.0 g developer 60.0 g")).toBeVisible();
  await expect(visits.getByText("Application: Root touch-up")).toBeVisible();

  await visits.getByRole("button", { name: "Repeat formula" }).click();

  await expect(page.getByRole("tab", { name: "Calculator" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Starting level")).toHaveText("6");
  await expect(page.getByLabel("Shade", { exact: true })).toHaveText(/^8\.1 ash/);
  await expect(page.getByLabel("Application")).toHaveText("Root touch-up");
  await expect(page.getByText("8.1- 40.0 g developer 60.0 g")).toBeVisible();
});
