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

  // Delete all existing webhook routes
  const existing = await page.evaluate(async () => {
    const res = await fetch("/v1/webhookRoutes");
    const d = await res.json();
    return (d.webhooks || []).map(function(w) { return w.id; });
  });
  for (const id of existing) {
    await page.evaluate(async function(wid) { await fetch("/v1/webhookRoute/" + wid, { method: "DELETE" }); }, id);
  }
  console.log("Deleted " + existing.length + " old webhooks");

  // Create one properly enabled webhook
  const r = await page.evaluate(async function(url) {
    const res = await fetch("/v1/webhookRoute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "mail-platform", targetUrl: url, enabled: true, contentFn: "return true;" })
    });
    return res.ok ? await res.json() : { error: res.status };
  }, WEBHOOK_URL);
  console.log("Created:", JSON.stringify(r));
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
