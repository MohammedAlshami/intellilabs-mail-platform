import { chromium } from "playwright";

const BASE = "http://localhost:3001";

async function test() {
  const browser = await chromium.launch({ headless: true });

  // Test 1: Login as ahmad and send to siti
  let page = await browser.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "ahmad@demo-project-mail.xyz");
  await page.fill("#password", "ahmad123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✓ Logged in as ahmad");

  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const newBtn = page.locator("button:has(svg.lucide-square-pen)").first();
  await newBtn.click();
  await page.waitForTimeout(1500);

  const toInput = page.locator("input[placeholder='Add recipient...']").first();
  await toInput.fill("siti@demo-project-mail.xyz");
  await toInput.press("Enter");
  await page.waitForTimeout(500);

  const subjInput = page.locator("input[placeholder='Subject']").first();
  await subjInput.fill("Test ahmad to siti");

  const editor = page.locator(".tiptap").first();
  await editor.click();
  await editor.fill("This is a test from ahmad to siti.");

  const sendBtn = page.locator("button:has(svg.lucide-send)").last();
  await sendBtn.click({ force: true });
  await page.waitForTimeout(3000);
  console.log("✓ Sent from ahmad to siti");
  await page.close();

  // Test 2: Login as siti and check inbox
  page = await browser.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "siti@demo-project-mail.xyz");
  await page.fill("#password", "siti123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✓ Logged in as siti");

  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const bodyText = await page.locator("body").innerText();
  const hasAhmadEmail = bodyText.includes("Test ahmad to siti");
  console.log(`  Siti's inbox shows 'Test ahmad to siti': ${hasAhmadEmail}`);

  if (hasAhmadEmail) {
    // Click on it
    await page.locator("text=Test ahmad to siti").first().click();
    await page.waitForTimeout(3000);
    const detailText = await page.locator("body").innerText();
    const fromLine = detailText.split("\n").find(l => l.startsWith("From:"));
    console.log(`  ${fromLine}`);
  }

  await page.close();
  await browser.close();
  console.log("\n✓ Test complete");
}

test().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
