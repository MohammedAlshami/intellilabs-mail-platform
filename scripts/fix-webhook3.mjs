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

  await page.goto(`${BASE}/admin/config/webhooks`);
  await page.waitForTimeout(500);
  const whEnabled = await page.isChecked("#webhooks_enabled");
  if (!whEnabled) {
    await page.check("#webhooks_enabled");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    console.log("Enabled webhooks config");
  }

  await page.goto(`${BASE}/admin/webhooks/new`);
  await page.waitForTimeout(500);
  await page.fill("#inputName", "mail-platform");
  await page.fill("#inputTargetUrl", WEBHOOK_URL);
  const cb = page.locator("#inputEnabled");
  if (cb) await cb.check();
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  console.log("Submitted. URL:", page.url());

  const list = await page.evaluate(async () => {
    const r = await fetch("/v1/webhookRoutes");
    const d = await r.json();
    return (d.webhooks || []).map(function(w) { return { n: w.name, e: w.enabled, u: w.targetUrl }; });
  });
  console.log("Webhooks:", JSON.stringify(list));
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
