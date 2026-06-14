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

  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  // Click on the email
  const emailLink = page.locator("a:has-text('Test ahmad to siti')").first();
  await emailLink.click();
  await page.waitForTimeout(3000);

  // Check the detail view
  let bodyText = await page.locator("body").innerText();
  const detailSection = bodyText.split("Reply")[0];
  console.log("=== Detail view ===");
  console.log(detailSection.substring(0, 500));

  // Click Reply
  const replyBtn = page.locator("button:has-text('Reply')").last();
  await replyBtn.click();
  await page.waitForTimeout(1500);

  // Click AI Sparkles button in the compose toolbar
  const aiBtn = page.locator('button[aria-label="AI Write"]').first();
  await aiBtn.click();
  await page.waitForTimeout(2000);

  // Check if the AI panel opened and has context
  bodyText = await page.locator("body").innerText();
  console.log("\n=== After AI panel open ===");
  const contextLines = bodyText.split("\n").filter(l => l.includes("Test ahmad") || l.includes("thread") || l.includes("respond"));
  console.log(contextLines.join("\n") || "No contextual message found");

  // Try asking AI to respond
  const aiInput = page.locator("textarea, [contenteditable]").last();
  const inputVisible = await aiInput.isVisible().catch(() => false);
  console.log(`\nAI input visible: ${inputVisible}`);

  await browser.close();
  console.log("\n✓ Test complete");
}

test().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
