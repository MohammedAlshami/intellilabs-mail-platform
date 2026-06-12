import { chromium } from "@playwright/test";
const BASE = "http://localhost:9090";

async function main() {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  
  await p.goto(BASE + "/admin/login");
  await p.fill('input[name="username"]', "admin");
  await p.fill('input[name="password"]', "***REDACTED***");
  await p.click('button[type="submit"]');
  await p.waitForURL("**/admin");
  
  // Delete old, create new, ensure enabled
  await p.goto(BASE + "/admin/webhooks");
  await p.waitForTimeout(500);
  
  // Click "Create webhook route" button
  await p.click('a:has-text("Create webhook route")');
  await p.waitForTimeout(500);
  
  await p.fill("#inputName", "mail-platform");
  await p.fill("#inputTargetUrl", "http://187.127.105.115:3001/api/webhooks/emailengine");
  
  // Check enabled
  const cb = p.locator('input[name="enabled"]');
  const checked = await cb.isChecked();
  if (!checked) {
    await cb.check({ force: true });
    console.log("Enabled checkbox checked");
  } else {
    console.log("Already checked");
  }
  
  await p.click('button[type="submit"]');
  await p.waitForTimeout(1000);
  console.log("Submitted");
  
  // Now go to the edit page and verify enabled is checked
  const url = p.url();
  console.log("Edit URL:", url);
  
  if (url.includes("/admin/webhooks/webhook/")) {
    await p.waitForTimeout(500);
    const isChecked = await p.isChecked('input[name="enabled"]');
    console.log("Webhook enabled on edit page:", isChecked);
  }
  
  await b.close();
}
main().catch(e => { console.error(e); process.exit(1); });
