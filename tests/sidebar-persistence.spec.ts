import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/dashboard", title: "Dashboard" },
  { path: "/reports", title: "Reports" },
  { path: "/campaign", title: "Campaigns" },
  { path: "/email-list", title: "Email Lists" },
  { path: "/sending-history", title: "Sending History" },
  { path: "/bounce-monitor", title: "Bounce Monitor" },
  { path: "/websites", title: "Websites" },
  { path: "/leads", title: "Leads" },
  { path: "/removal-list", title: "Removal List" },
  { path: "/audit-trail", title: "Audit Trail" },
  { path: "/roles", title: "Roles" },
  { path: "/users", title: "Users" },
];

test.describe("Sidebar persistence across pages", () => {
  test("sidebar nav should be visible on every page", async ({ page }) => {
    for (const { path } of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      // Sidebar should have the Campaigns nav link on every page
      const campaignsLink = page.locator('text=Campaigns').first();
      await expect(campaignsLink).toBeVisible({ timeout: 8000 });

      // Sidebar should have the Email group label
      const emailLabel = page.locator('text=Email').first();
      await expect(emailLabel).toBeVisible({ timeout: 5000 });
    }
  });

  test("navigating between pages keeps the sidebar mounted", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Check nav link in sidebar
    const dashboardNav = page.locator('text=Dashboard').first();
    await expect(dashboardNav).toBeVisible();

    // Navigate to another page
    await page.goto("/campaign");
    await page.waitForLoadState("networkidle");

    // Sidebar should still have the same nav links
    await expect(dashboardNav).toBeVisible();
    await expect(page.locator('text=Campaigns').first()).toBeVisible();
  });

  test("clicking sidebar nav links navigates correctly", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill("admin@intellilabs.com");
    await page.locator('input[type="password"]').fill("admin123");
    await page.locator('button:has-text("Sign in")').click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Click "Websites" in the sidebar
    await page.locator('text=Websites').first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/websites");

    // Click "Campaigns" in the sidebar
    await page.locator('text=Campaigns').first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/campaign");

    // Click "Email Lists" in the sidebar
    await page.locator('text=Email Lists').first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/email-list");

    // Click "Leads" in the sidebar
    await page.locator('text=Leads').first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/leads");
  });
});
