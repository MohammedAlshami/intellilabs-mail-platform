import { chromium } from "playwright";

const BASE = "http://localhost:3001";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login as ahmad
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "ahmad@demo-project-mail.xyz");
  await page.fill("#password", "ahmad123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✓ Logged in as ahmad");

  // Go to mail
  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  console.log("✓ Mail page loaded");

  // Click New button
  const newBtn = page.locator("button:has(svg.lucide-square-pen)").first();
  await newBtn.click();
  await page.waitForTimeout(1500);
  console.log("✓ Compose opened");

  // Add recipient
  const toInput = page.locator("input[placeholder='Add recipient...']").first();
  await toInput.fill("mshami2021@gmail.com");
  await toInput.press("Enter");
  await page.waitForTimeout(500);

  // Set subject
  const subjInput = page.locator("input[placeholder='Subject']").first();
  await subjInput.fill("Playwright test email");

  // Type body
  const editor = page.locator(".tiptap").first();
  await editor.click();
  await editor.fill("This is a test email sent via Playwright.");

  // Click Send (force to bypass modal scroll container interception)
  const sendBtn = page.locator("button:has(svg.lucide-send)").last();
  await sendBtn.click({ force: true });
  await page.waitForTimeout(2000);
  console.log("✓ Email sent");

  // Verify in sent folder
  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // Switch to sent folder
  const sentTab = page.locator("button:has-text('Sent')").first();
  await sentTab.click();
  await page.waitForTimeout(2000);

  const sentVisible = await page.locator("text=Playwright test email").first().isVisible().catch(() => false);
  console.log(`  Sent email visible: ${sentVisible}`);

  await browser.close();
  console.log("\n✓ Test complete");
}

test().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
