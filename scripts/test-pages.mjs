import { chromium } from "@playwright/test";

const BASE = "http://localhost:3001";
const EMAIL = "ahmad@demo-project-mail.xyz";
const PASS = "***REDACTED***";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // Login
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  console.log("✅ Login works");

  // Dashboard
  await page.waitForTimeout(1000);
  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log("✅ /mail");

  // Campaigns
  await page.goto(`${BASE}/campaign`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log("✅ /campaign");

  // Templates
  await page.goto(`${BASE}/email-templates`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log("✅ /email-templates");

  // Signatures
  await page.goto(`${BASE}/email-signatures`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log("✅ /email-signatures");

  // Sending history
  await page.goto(`${BASE}/sending-history`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log("✅ /sending-history");

  // Bounce monitor
  await page.goto(`${BASE}/bounce-monitor`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log("✅ /bounce-monitor");

  // Audit trail
  await page.goto(`${BASE}/audit-trail`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log("✅ /audit-trail");

  // Check for errors
  const errors = await page.evaluate(() => {
    return window.__NEXT_DATA__?.props?.pageProps?.err ? "ERROR" : "OK";
  });
  console.log("Page errors:", errors);

  await browser.close();
  console.log("\nAll tests passed ✅");
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
