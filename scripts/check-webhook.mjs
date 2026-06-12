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
  
  // Go to webhooks list page
  await p.goto(BASE + "/admin/webhooks");
  await p.waitForTimeout(1000);
  
  // Get page content to find webhook links
  const content = await p.content();
  
  // Check for webhook routes
  const hasRoutes = content.includes("webhook/AAAB");
  console.log("Has webhook routes:", hasRoutes);
  
  // Try to find any mail-platform webhook
  const hasMailPlatform = content.includes("mail-platform");
  console.log("Has mail-platform:", hasMailPlatform);
  
  // Check the newly created webhook
  await p.goto(BASE + "/admin/webhooks/webhook/AAABnrlmOCkAAAAJ");
  await p.waitForTimeout(500);
  
  const isEnabled = await p.isChecked('input[name="enabled"]');
  console.log("New webhook enabled:", isEnabled);
  
  const url = await p.inputValue("#inputTargetUrl");
  console.log("Target URL:", url);
  
  await b.close();
}
main().catch(e => { console.error(e); process.exit(1); });
