import { test, expect } from "@playwright/test";

test.describe("Inbox folder visibility", () => {
  test("mail list panel should be visible on /mail", async ({ page }) => {
    await page.goto("/mail");
    const input = page.locator('input[placeholder="Type to search..."]');
    await expect(input).toBeVisible({ timeout: 10000 });
  });

  test("mail list panel should NOT be visible on /email-list", async ({ page }) => {
    await page.goto("/email-list");
    const input = page.locator('input[placeholder="Type to search..."]');
    await expect(input).not.toBeVisible({ timeout: 10000 });
  });

  test("mail list panel should NOT be visible on /campaign", async ({ page }) => {
    await page.goto("/campaign");
    const input = page.locator('input[placeholder="Type to search..."]');
    await expect(input).not.toBeVisible({ timeout: 10000 });
  });
});
