import { chromium } from "@playwright/test";
const BASE = "http://localhost:9090";

async function main() {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  
  // Login
  await p.goto(BASE + "/admin/login");
  await p.fill('input[name="username"]', "admin");
  await p.fill('input[name="password"]', "***REDACTED***");
  await p.click('button[type="submit"]');
  await p.waitForURL("**/admin");
  
  // Delete all existing webhook routes via the browser's fetch (has session cookies)
  let existing = await p.evaluate(async () => {
    const r = await fetch("/v1/webhookRoutes");
    const d = await r.json();
    return (d.webhooks || []).map(w => w.id);
  });
  for (const id of existing) {
    await p.evaluate(async (wid) => {
      await fetch("/v1/webhookRoute/" + wid, { method: "DELETE" });
    }, id);
  }
  console.log("Deleted " + existing.length + " old webhooks");

  // Create webhook via browser's authenticated fetch
  const result = await p.evaluate(async () => {
    const r = await fetch("/v1/webhookRoute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "mail-platform",
        targetUrl: "http://187.127.105.115:3001/api/webhooks/emailengine",
        enabled: true,
        contentFn: "return true;"
      })
    });
    return r.ok ? await r.json() : { error: r.status, text: await r.text() };
  });
  console.log("Created:", JSON.stringify(result));

  // Verify
  const list = await p.evaluate(async () => {
    const r = await fetch("/v1/webhookRoutes");
    const d = await r.json();
    return (d.webhooks || []).map(w => ({ name: w.name, enabled: w.enabled }));
  });
  console.log("Webhooks:", JSON.stringify(list));
  
  await b.close();
}
main().catch(e => { console.error(e); process.exit(1); });
