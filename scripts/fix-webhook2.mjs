import { chromium } from "@playwright/test";

const BASE = "http://localhost:9090";
const ADMIN_USER = "admin";
const ADMIN_PASS = "***REDACTED***";
const WEBHOOK_URL = "http://187.127.105.115:3001/api/webhooks/emailengine";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="username"]', ADMIN_USER);
  await page.fill('input[name="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");

  // Delete old ones via webhooks page
  await page.goto(`${BASE}/admin/webhooks`);
  await page.waitForTimeout(500);
  
  // Navigate to new webhook form
  await page.goto(`${BASE}/admin/webhooks/new`);
  await page.waitForTimeout(500);
  
  await page.fill("#inputName", "mail-platform");
  await page.fill("#inputTargetUrl", WEBHOOK_URL);
  
  // The form has hidden contentFnJson. Enable the webhook by checking the enabled checkbox
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  
  console.log("Webhook submitted. URL:", page.url());
  
  // Verify
  const existing = await page.evaluate(async () => {
    const res = await fetch("/v1/webhookRoutes");
    const d = await res.json();
    return (d.webhooks || []).map(function(w) { return { name: w.name, enabled: w.enabled, url: w.targetUrl }; });
  });
  console.log("Current webhooks:", JSON.stringify(existing));
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
