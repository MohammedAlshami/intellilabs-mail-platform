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
  console.log("Logged in");

  // Delete all old webhook routes via API (GET works, DELETE might not)
  const ids = await p.evaluate(async () => {
    const r = await fetch("/v1/webhookRoutes");
    const d = await r.json();
    return (d.webhooks || []).map(function(w) { return w.id; });
  });
  console.log("Found " + ids.length + " existing webhooks");

  // Navigate to each webhook edit page and delete via UI
  for (const id of ids) {
    await p.goto(BASE + "/admin/webhooks/webhook/" + id);
    await p.waitForTimeout(300);
    // Click delete button if exists
    const delBtn = p.locator('button:has-text("Delete")');
    if (await delBtn.count() > 0) {
      await delBtn.click();
      await p.waitForTimeout(300);
      // Confirm dialog
      const confirmBtn = p.locator('button:has-text("Yes")');
      if (await confirmBtn.count() > 0) await confirmBtn.click();
      await p.waitForTimeout(300);
      console.log("Deleted: " + id);
    }
  }

  // Create new webhook via admin form
  await p.goto(BASE + "/admin/webhooks/new");
  await p.waitForTimeout(500);
  await p.fill("#inputName", "mail-platform");
  await p.fill("#inputTargetUrl", "http://187.127.105.115:3001/api/webhooks/emailengine");
  
  // Check the enabled checkbox
  const enabledCb = p.locator('input[name="enabled"]');
  if (await enabledCb.count() > 0) {
    await enabledCb.check();
    console.log("Enabled checkbox checked");
  }
  
  await p.click('button[type="submit"]');
  await p.waitForTimeout(1000);
  console.log("Submitted. URL:", p.url());

  // Verify
  const list = await p.evaluate(async () => {
    const r = await fetch("/v1/webhookRoutes");
    const d = await r.json();
    return (d.webhooks || []).map(function(w) { return { name: w.name, enabled: w.enabled, url: w.targetUrl }; });
  });
  console.log("Webhooks:", JSON.stringify(list));
  
  await b.close();
}
main().catch(e => { console.error(e); process.exit(1); });
