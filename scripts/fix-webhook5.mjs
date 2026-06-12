import { chromium } from "@playwright/test";
const BASE = "http://localhost:9090";
const U = "admin";
const P = "***REDACTED***";
const URL = "http://187.127.105.115:3001/api/webhooks/emailengine";

async function main() {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  
  await p.goto(BASE + "/admin/login");
  await p.fill('input[name="username"]', U);
  await p.fill('input[name="password"]', P);
  await p.click('button[type="submit"]');
  await p.waitForURL("**/admin");
  
  // Delete old
  const ids = await p.evaluate(async () => {
    const r = await fetch("/v1/webhookRoutes");
    const d = await r.json();
    return (d.webhooks || []).map(function(w) { return w.id; });
  });
  for (const id of ids) {
    await p.evaluate(async function(wid) { await fetch("/v1/webhookRoute/" + wid, { method: "DELETE" }); }, id);
  }
  console.log("Deleted " + ids.length + " old webhooks");
  
  // Create via form
  await p.goto(BASE + "/admin/webhooks/new");
  await p.waitForTimeout(500);
  await p.fill("#inputName", "mail-platform");
  await p.fill("#inputTargetUrl", URL);
  await p.check('input[name="enabled"]');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(1000);
  console.log("Created. Checking...");
  
  const list = await p.evaluate(async () => {
    const r = await fetch("/v1/webhookRoutes");
    const d = await r.json();
    return (d.webhooks || []).map(function(w) { return { n: w.name, e: w.enabled }; });
  });
  console.log("Webhooks:", JSON.stringify(list));
  await b.close();
}
main().catch(e => { console.error(e); process.exit(1); });
