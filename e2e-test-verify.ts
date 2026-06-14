import { chromium } from "playwright";

const BASE = "http://localhost:3001";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login as siti
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "siti@demo-project-mail.xyz");
  await page.fill("#password", "siti123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✓ Logged in as siti");

  // Go to mail - should see the email from ahmad
  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  // Check what's in the inbox
  let bodyText = await page.locator("body").innerText();
  console.log("=== Inbox content ===");
  console.log(bodyText.substring(0, 1000));

  // Click on the email from ahmad
  const emailLink = page.locator("a:has-text('Test ahmad to siti')").first();
  const exists = await emailLink.isVisible().catch(() => false);
  console.log(`\n'Test ahmad to siti' visible: ${exists}`);

  if (!exists) {
    console.log("Email not found, trying other subjects...");
    const allLinks = await page.locator("a span.truncate").allTextContents().catch(() => []);
    console.log("Available names:", allLinks);
  }

  await browser.close();
  console.log("\n✓ Test complete");
}

test().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
