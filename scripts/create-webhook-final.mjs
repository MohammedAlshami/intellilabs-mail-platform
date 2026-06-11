import { chromium } from "@playwright/test";

const BASE = "http://localhost:9090";
const ADMIN_USER = "admin";
const ADMIN_PASS = "***REDACTED***";
const WEBHOOK_URL = "http://187.127.105.115:3001/api/webhooks/emailengine";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="username"]', ADMIN_USER);
  await page.fill('input[name="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");
  console.log("Logged in");

  // Enable webhooks in config
  await page.goto(`${BASE}/admin/config/webhooks`);
  await page.waitForTimeout(500);

  const webhookEnabled = await page.isChecked("#webhooks_enabled");
  if (!webhookEnabled) {
    await page.check("#webhooks_enabled");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    console.log("Enabled webhooks");
  }

  // Delete existing webhook routes via REST API
  const existing = await page.evaluate(async () => {
    const res = await fetch("/v1/webhookRoutes");
    const data = await res.json();
    return (data.webhooks || []).map(function(w) { return w.id; });
  });

  for (const id of existing) {
    await page.evaluate(async function(wid) {
      await fetch("/v1/webhookRoute/" + wid, { method: "DELETE" });
    }, id);
  }
  if (existing.length > 0) console.log("Deleted " + existing.length + " existing webhooks");

  // Create new webhook route via REST API from browser context (has session cookie)
  const result = await page.evaluate(async function(url) {
    const res = await fetch("/v1/webhookRoute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "mail-platform",
        targetUrl: url,
        enabled: true,
        contentFn: "return true;",
      }),
    });
    return res.ok ? await res.json() : { error: res.status };
  }, WEBHOOK_URL);

  console.log("Webhook created:", JSON.stringify(result));

  // Verify
  const list = await page.evaluate(async function() {
    const res = await fetch("/v1/webhookRoutes");
    const data = await res.json();
    return (data.webhooks || []).map(function(w) {
      return { name: w.name, enabled: w.enabled, url: w.targetUrl };
    });
  });

  console.log("Current webhooks:", JSON.stringify(list));

  await browser.close();
}

main().catch(function(err) {
  console.error("Failed:", err);
  process.exit(1);
});
