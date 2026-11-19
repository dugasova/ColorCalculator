import { expect, test } from "@playwright/test";
import { STYLIST } from "./accounts.ts";
import { chooseOption, expectNoHorizontalOverflow, signInAsMember } from "./app.ts";

// What jsdom cannot see: real layout. On a phone no screen may be wider than the
// viewport -- a horizontal scrollbar means a block overflows (as the page title and a
// palette row once did).
test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

test("the main screens fit a phone without horizontal scrolling", async ({ page }) => {
  await signInAsMember(page, STYLIST);
  const nav = page.getByRole("navigation", { name: "Primary navigation" });

  await expectNoHorizontalOverflow(page);

  // The comparison table keeps its two columns within the screen.
  await page.getByRole("button", { name: "Compare with another formula" }).click();
  await chooseOption(page, "Shade", "8.1 ash");
  await expect(page.locator(".comparison__row--differs").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await nav.getByRole("button", { name: "Complex color" }).click();
  await page.getByRole("button", { name: "+ Add bleach step" }).click();
  const bleach = page.locator(".step-card");
  // The longest row label the result preview can show.
  await chooseOption(bleach, "Coverage", "Strands 1 (in foil)");
  await bleach.getByLabel("Hair in foil, % (approx.)").fill("30");
  await expect(page.locator(".zone-preview__row")).toHaveCount(2);
  await expectNoHorizontalOverflow(page);

  await nav.getByRole("button", { name: "More" }).click();
  await nav.getByRole("button", { name: "Pre-pigment" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await nav.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "Client History" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
