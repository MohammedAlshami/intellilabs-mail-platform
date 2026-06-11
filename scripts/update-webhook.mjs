import { chromium } from "@playwright/test";

const BASE = "http://localhost:9090";
const ADMIN_USER = "admin";
const ADMIN_PASS = "***REDACTED***";
const NEW_URL = "http://172.18.0.1:3001/api/webhooks/emailengine";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[type="text"]', ADMIN_USER);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");
  console.log("Logged in");

  // Go to webhooks list
  await page.goto(`${BASE}/admin/webhooks`);
  await page.waitForTimeout(1000);

  // Click on the existing webhook to edit it
  const link = page.locator('a:has-text("mail-platform-webhook")');
  if (await link.count() > 0) {
    await link.first().click();
    await page.waitForTimeout(1000);

    // Update the URL
    await page.fill("#inputTargetUrl", NEW_URL);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    console.log("Webhook URL updated to:", NEW_URL);
  } else {
    console.log("Webhook not found, creating new one");
    await page.goto(`${BASE}/admin/webhooks/new`);
    await page.fill("#inputName", "mail-platform-webhook");
    await page.fill("#inputTargetUrl", NEW_URL);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    console.log("Webhook created with URL:", NEW_URL);
  }

  await browser.close();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
