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

  // Navigate directly to the sent email URL
  await page.goto(`${BASE}/mail?id=%3Cce1aadf3-c279-a145-2151-90a3a8f18b08%40demo-project-mail.xyz%3E`, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  // Get the entire page content
  const bodyText = await page.locator("body").innerText();
  console.log("=== PAGE BODY TEXT ===");
  console.log(bodyText.substring(0, 2000));
  console.log("=== END ===");

  // Look for From:
  const fromElement = page.locator("text=/From:/");
  const fromCount = await fromElement.count();
  console.log(`\n'From:' elements found: ${fromCount}`);

  for (let i = 0; i < fromCount; i++) {
    const text = await fromElement.nth(i).textContent();
    console.log(`  [${i}] "${text}"`);
  }

  await browser.close();
}

test().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
