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

  // Go to mail
  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  console.log("✓ Mail page loaded");

  // Switch to sent folder to see existing
  const sentTab = page.locator("button:has-text('Sent')").first();
  await sentTab.click();
  await page.waitForTimeout(3000);

  // Click on "Test from siti" email
  const emailLink = page.locator("a:has-text('Test from siti')").first();
  const exists = await emailLink.isVisible().catch(() => false);
  console.log(`  'Test from siti' visible in Sent: ${exists}`);

  if (exists) {
    await emailLink.click();
    await page.waitForTimeout(3000);

    // Get the full from section
    const html = await page.locator(".border-b.p-4").first().innerHTML().catch(() => "N/A");
    console.log("  Header HTML:", html.substring(0, 500));
  }

  // Now test a new send
  const newBtn = page.locator("button:has(svg.lucide-square-pen)").first();
  await newBtn.click();
  await page.waitForTimeout(1500);
  console.log("✓ Compose opened");

  const toInput = page.locator("input[placeholder='Add recipient...']").first();
  await toInput.fill("mshami2021@gmail.com");
  await toInput.press("Enter");
  await page.waitForTimeout(500);

  const subjInput = page.locator("input[placeholder='Subject']").first();
  await subjInput.fill("Siti test 2");

  const editor = page.locator(".tiptap").first();
  await editor.click();
  await editor.fill("Second test from siti.");

  const sendBtn = page.locator("button:has(svg.lucide-send)").last();
  await sendBtn.click({ force: true });
  await page.waitForTimeout(5000);
  console.log("✓ New email sent as siti");
  console.log(`  URL after send: ${page.url()}`);

  // Check the header
  const headerHtml = await page.locator(".border-b.p-4").first().innerHTML().catch(() => "N/A");
  console.log("  Header HTML after send:", headerHtml.substring(0, 500));

  await browser.close();
  console.log("\n✓ Test complete");
}

test().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
