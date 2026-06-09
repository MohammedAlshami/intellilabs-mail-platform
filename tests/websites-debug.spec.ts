import { test, expect } from "@playwright/test";

test("debug website add flow", async ({ page }) => {
  // Log console messages
  page.on("console", (msg) => console.log("CONSOLE:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  await page.goto("/websites");
  await page.waitForTimeout(2000);

  // Check page content
  const body = await page.textContent("body");
  console.log("Page body preview:", body?.substring(0, 500));

  // Check for the Add Website button
  const buttons = page.locator("button");
  const btnCount = await buttons.count();
  console.log(`Found ${btnCount} buttons`);
  for (let i = 0; i < btnCount; i++) {
    const text = await buttons.nth(i).textContent();
    console.log(`  Button ${i}: "${text}"`);
  }

  // Try clicking the first button that contains "Add Website"
  const addBtn = page.locator("button:has-text('Add Website')").first();
  const addBtnExists = await addBtn.isVisible();
  console.log(`Add Website button visible: ${addBtnExists}`);
  if (addBtnExists) {
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Check for the sheet
    const sheetTitle = page.locator("text=Add Website");
    const sheetVisible = await sheetTitle.isVisible();
    console.log(`Sheet visible: ${sheetVisible}`);

    // Check for URL input
    const urlInput = page.locator('input[placeholder="https://example.com"]');
    const urlVisible = await urlInput.isVisible();
    console.log(`URL input visible: ${urlVisible}`);

    if (urlVisible) {
      await urlInput.fill("https://ijo-bs.com");
      await page.waitForTimeout(500);

      // Find Start Crawl button
      const startBtn = page.locator("button:has-text('Start Crawl')");
      const startBtnVisible = await startBtn.isVisible();
      console.log(`Start Crawl button visible: ${startBtnVisible}`);

      if (startBtnVisible) {
        await startBtn.click();
        await page.waitForTimeout(3000);

        // Check table content after click
        const bodyAfter = await page.textContent("body");
        console.log("Body after click:", bodyAfter?.substring(0, 1000));
      }
    }
  }
});
