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

  // Click on the email from ahmad
  const emailLink = page.locator("a:has-text('Test ahmad to siti')").first();
  const exists = await emailLink.isVisible().catch(() => false);
  console.log(`Email 'Test ahmad to siti' visible: ${exists}`);
  if (!exists) { await browser.close(); return; }

  await emailLink.click();
  await page.waitForTimeout(3000);

  // Check detail view shows properly
  let bodyText = await page.locator("body").innerText();
  const detailOk = bodyText.includes("Test ahmad to siti") && bodyText.includes("From:");
  console.log(`Detail view shows From and Subject: ${detailOk}`);

  // Click Reply button
  const replyBtn = page.locator("button:has-text('Reply')").last();
  await replyBtn.click();
  await page.waitForTimeout(1500);
  console.log("✓ Reply compose opened");

  // Click AI Sparkles button in toolbar
  const aiBtn = page.locator('button[aria-label="AI Write"]');
  const aiBtnVisible = await aiBtn.isVisible().catch(() => false);
  console.log(`AI button visible: ${aiBtnVisible}`);

  if (aiBtnVisible) {
    await aiBtn.click();
    await page.waitForTimeout(3000);

    bodyText = await page.locator("body").innerText();
    const hasContext = bodyText.includes("Test ahmad to siti") && bodyText.includes("thread ID");
    console.log(`AI panel has context: ${hasContext}`);

    // Type in the AI panel
    const promptInput = page.locator("textarea, [contenteditable]").last();
    const piVisible = await promptInput.isVisible().catch(() => false);
    console.log(`AI input visible: ${piVisible}`);

    if (piVisible) {
      await promptInput.fill("respond to this email");
      await page.waitForTimeout(500);

      // Press Enter to send
      const submitBtn = page.locator("button[type='submit']").last();
      const sbVisible = await submitBtn.isVisible().catch(() => false);
      console.log(`Submit button visible: ${sbVisible}`);

      if (sbVisible) {
        await submitBtn.click();
        console.log("✓ Asked AI to respond, waiting for reply...");
        await page.waitForTimeout(30000);

        bodyText = await page.locator("body").innerText();
        const hasReply = bodyText.includes("set_email") || bodyText.includes("draft") || bodyText.includes("subject");
        console.log(`AI generated a reply: ${hasReply}`);
      } else {
        // Try Enter key
        await page.keyboard.press("Enter");
        console.log("✓ Pressed Enter, waiting for AI reply...");
        await page.waitForTimeout(30000);

        bodyText = await page.locator("body").innerText();
        const hasReply = bodyText.includes("set_email") || bodyText.includes("draft") || bodyText.includes("Subject");
        console.log(`AI generated a reply: ${hasReply}`);
        console.log("Last 500 chars:", bodyText.slice(-500));
      }
    }
  }

  await browser.close();
  console.log("\n✓ Test complete");
}

test().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
