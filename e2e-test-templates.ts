import { chromium } from "playwright";

const BASE = "http://localhost:3001";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login as admin
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "admin@intellilabs.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✓ Logged in as admin");

  // Check templates page
  await page.goto(`${BASE}/email-templates`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  let bodyText = await page.locator("body").innerText();
  const hasApology = bodyText.includes("Apology Email");
  const hasInquiry = bodyText.includes("Inquiry Email");
  const hasPitching = bodyText.includes("Pitching Email");
  const hasFollowup = bodyText.includes("Follow-up Email");
  const hasThankyou = bodyText.includes("Thank You Email");
  console.log(`Templates visible:\n  Apology: ${hasApology}\n  Inquiry: ${hasInquiry}\n  Pitching: ${hasPitching}\n  Follow-up: ${hasFollowup}\n  Thank You: ${hasThankyou}`);

  // Test the AI can search templates
  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // Open AI panel
  const aiBtn = page.locator('button:has(svg.lucide-sparkles)').first();
  await aiBtn.click();
  await page.waitForTimeout(2000);

  // Find the AI input
  const aiInput = page.locator("textarea, [contenteditable]").last();
  const inputVisible = await aiInput.isVisible().catch(() => false);
  console.log(`\nAI input visible: ${inputVisible}`);

  if (inputVisible) {
    // Ask AI to list templates
    await aiInput.fill("list the available email templates");
    await page.waitForTimeout(500);
    await page.keyboard.press("Enter");
    console.log("⏳ Asked AI to list templates, waiting...");
    await page.waitForTimeout(25000);

    bodyText = await page.locator("body").innerText();
    const foundTemplates = ["Apology", "Inquiry", "Pitching", "Follow-up", "Thank"].some(t => bodyText.includes(t));
    console.log(`AI showed template names: ${foundTemplates}`);
  }

  // Verify via API directly
  console.log("\n=== API verification ===");
  const TOKEN = await page.evaluate(() => document.cookie.match(/token=([^;]+)/)?.[1] || "");
  
  const apiRes = await page.request.get(`${BASE}/api/email-templates`);
  const data = await apiRes.json();
  console.log(`Templates via API: ${data.length}`);
  for (const t of data) {
    console.log(`  - ${t.name} (${t.id})`);
  }

  await browser.close();
  console.log("\n✓ Test complete");
}

test().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
