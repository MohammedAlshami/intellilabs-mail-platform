import { chromium } from "playwright";

const BASE = "http://localhost:3001";

async function test() {
  const browser = await chromium.launch({ headless: true });

  // Test 1: Login as ahmad
  const ahmadPage = await browser.newPage();
  await ahmadPage.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await ahmadPage.fill("#email", "ahmad@demo-project-mail.xyz");
  await ahmadPage.fill("#password", "ahmad123");
  await ahmadPage.click('button[type="submit"]');
  await ahmadPage.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✓ Ahmad logged in");

  // Go to mail page
  await ahmadPage.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await ahmadPage.waitForTimeout(3000);
  console.log("✓ Mail page loaded");

  // Check if threads are visible
  const threadCount = await ahmadPage.locator("[class*='flex-col items-start gap-2 p-4']").count();
  console.log(`  Threads visible: ${threadCount}`);

  // Click the first thread
  await ahmadPage.locator("[class*='flex-col items-start gap-2 p-4']").first().click();
  await ahmadPage.waitForTimeout(2000);
  console.log("✓ Clicked first thread");

  // Check if content is displayed
  const content = await ahmadPage.locator("[class*='whitespace-pre-wrap']").first().textContent().catch(() => "");
  console.log(`  Content shown: ${content ? "YES" : "NO"}`);
  if (content) console.log(`  Content preview: ${content.slice(0, 60)}`);

  // Test 2: Login as siti
  const sitiPage = await browser.newPage();
  await sitiPage.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await sitiPage.fill("#email", "siti@demo-project-mail.xyz");
  await sitiPage.fill("#password", "siti123");
  await sitiPage.click('button[type="submit"]');
  await sitiPage.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("\n✓ Siti logged in");

  await sitiPage.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await sitiPage.waitForTimeout(3000);
  const sitiThreads = await sitiPage.locator("[class*='flex-col items-start gap-2 p-4']").count();
  console.log(`  Siti threads visible: ${sitiThreads}`);

  await browser.close();
  console.log("\n✓ All tests passed");
}

test().catch((e) => {
  console.error("Test failed:", e.message);
  process.exit(1);
});
