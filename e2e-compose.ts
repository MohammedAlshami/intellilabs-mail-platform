import { chromium } from "playwright";

const BASE = "http://localhost:3001";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "admin@intellilabs.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✓ Logged in");

  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // Open compose
  await page.locator("button:has(svg.lucide-pen)").first().click().catch(() =>
    page.locator("button:has(svg.lucide-square-pen)").first().click()
  );
  await page.waitForTimeout(2000);
  console.log("✓ Compose opened");

  // Check modal/panel visible
  const toVisible = await page.locator("text=To:").first().isVisible().catch(() => false);
  console.log(`  To field visible: ${toVisible}`);
  if (!toVisible) { await browser.close(); return; }

  // Add recipient
  const toInput = page.locator("input[placeholder='Add recipient...']").first();
  await toInput.fill("client@example.com");
  await toInput.press("Enter");
  await page.waitForTimeout(500);
  console.log("✓ Recipient added");

  // Open AI panel
  await page.locator("button[aria-label='AI Write']").first().click();
  await page.waitForTimeout(1500);
  const aiVisible = await page.locator("text=Compose AI").first().isVisible().catch(() => false);
  console.log(`  AI panel visible: ${aiVisible}`);

  if (aiVisible) {
    // Ask to set subject
    const aiInput = page.locator("textarea[placeholder='Ask me to write or edit...']").first();
    await aiInput.fill("Set subject to Thank You Email");
    await aiInput.press("Enter");
    await page.waitForTimeout(15000);

    // Check if body tool was called
    const aiMsgs = await page.locator("[class*='overflow-y-auto']").first().textContent().catch(() => "");
    console.log(`  First response: ${(aiMsgs || "").slice(-100)}`);

    // Ask to write body
    await aiInput.fill("Write a thank you body for a client meeting");
    await aiInput.press("Enter");
    await page.waitForTimeout(20000);
    console.log("✓ Second AI request sent");
  }

  await browser.close();
  console.log("\n✓ Test complete");
}

test().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
