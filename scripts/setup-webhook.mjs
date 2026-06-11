import { chromium } from "@playwright/test";

const BASE = "http://localhost:9090";
const ADMIN_USER = "admin";
const ADMIN_PASS = "***REDACTED***";
const WEBHOOK_URL = "http://187.127.105.115:3001/api/webhooks/emailengine";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Login
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[type="text"]', ADMIN_USER);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");
  console.log("Logged in");

  // 2. Go to webhook config and enable webhooks
  await page.goto(`${BASE}/admin/config/webhooks`);
  await page.waitForSelector("#webhooks_enabled");
  const isChecked = await page.isChecked("#webhooks_enabled");
  if (!isChecked) {
    await page.check("#webhooks_enabled");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    console.log("Enabled webhooks");
  }

  // 3. Create new webhook route
  await page.goto(`${BASE}/admin/webhooks/new`);
  await page.waitForSelector("#inputName");

  await page.fill("#inputName", "mail-platform-webhook");
  await page.fill("#inputTargetUrl", WEBHOOK_URL);

  // Click submit
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  const url = page.url();
  if (url.includes("/admin/webhooks")) {
    console.log("Webhook created successfully!");
  } else {
    console.log("Unexpected URL after submit:", url);
    const error = await page.textContent("body");
    console.log("Page content (truncated):", error.substring(0, 500));
  }

  await browser.close();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
