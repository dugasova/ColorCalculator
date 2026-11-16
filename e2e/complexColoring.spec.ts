import { expect, test } from "@playwright/test";
import { STYLIST } from "./accounts.ts";
import { chooseOption, openClientVisits, saveForClient, signInAsMember } from "./app.ts";

// Highlights: bleach on foiled strands, a different color on the hair left outside the
// foil. The two are separate groups of hair and must show as separate rows, from the
// calculator through the saved visit to a repeat of it.
test("a highlights session keeps foiled strands and the rest of the hair apart", async ({ page }) => {
  await signInAsMember(page, STYLIST);
  await page.getByRole("tab", { name: "Complex color" }).click();

  await page.getByRole("button", { name: "+ Add bleach step" }).click();
  const bleach = page.locator(".step-card").filter({ has: page.getByRole("heading", { name: "Bleach step" }) });
  await chooseOption(bleach, "Current level", "4");
  await chooseOption(bleach, "Target level", "8");
  await chooseOption(bleach, "Coverage", "Strands 1 (in foil)");
  await bleach.getByLabel("Hair in foil, % (approx.)").fill("30");

  await page.getByRole("button", { name: "+ Add color step" }).click();
  const color = page.locator(".step-card").filter({ has: page.getByRole("heading", { name: "Color step" }) });
  await chooseOption(color, "Starting level", "4");
  await chooseOption(color, "Shade", "5.7 chocolate");
  await chooseOption(color, "Coverage", "Hair outside the foil");

  const previewRows = page.locator(".zone-preview__row");
  await expect(previewRows).toHaveCount(2);
  await expect(previewRows.nth(0)).toHaveText(/Full head · Strands 1 \(in foil\), ~30%\s*4\s*→\s*8$/);
  await expect(previewRows.nth(1)).toHaveText(/Full head · Hair outside the foil\s*4\s*→\s*5\.7$/);

  await saveForClient(page, "Maria Foilenko");

  const visits = await openClientVisits(page, "Maria Foilenko");
  await expect(visits.getByText("Step 1 — Full head · Strands 1 (in foil), ~30%")).toBeVisible();
  await expect(visits.getByText("Step 2 — Full head · Hair outside the foil")).toBeVisible();
  await expect(visits.locator(".zone-preview__row")).toHaveCount(2);

  await visits.getByRole("button", { name: "Repeat formula" }).click();

  await expect(page.getByRole("heading", { name: "Complex Coloring" })).toBeVisible();
  await expect(bleach.getByLabel("Coverage")).toHaveText("Strands 1 (in foil)");
  await expect(bleach.getByLabel("Hair in foil, % (approx.)")).toHaveValue("30");
  await expect(color.getByLabel("Coverage")).toHaveText("Hair outside the foil");
  await expect(previewRows).toHaveCount(2);
});
