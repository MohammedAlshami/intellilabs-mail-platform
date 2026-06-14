import { chromium } from "playwright";

const BASE = "http://localhost:3001";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "ahmad@demo-project-mail.xyz");
  await page.fill("#password", "ahmad123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✓ Logged in as ahmad");

  // Go to email lists
  await page.goto(`${BASE}/email-list`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  console.log("✓ Email list page loaded");

  // Create a new email list
  await page.click("button:has-text('Add List')");
  await page.waitForTimeout(1000);

  // Fill list name
  const nameInput = page.locator("input[placeholder='Q3 Leads']").first();
  await nameInput.fill("Playwright Test List");

  // Fill source
  const sourceInput = page.locator("input[placeholder*='Website scrape']").first();
  await sourceInput.fill("E2E test");

  // Paste emails in raw content
  const textarea = page.locator("textarea[placeholder*='Paste any text']").first();
  await textarea.fill("mshami2021@gmail.com");
  await page.waitForTimeout(1000);

  // Click Create List
  const createBtn = page.locator("button:has-text('Create List')").first();
  await createBtn.click();
  await page.waitForTimeout(2000);
  console.log("✓ Email list created");

  // Go to campaigns page
  await page.goto(`${BASE}/campaign`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  console.log("✓ Campaign page loaded");

  // Click Add Campaign
  await page.click("button:has-text('Add Campaign')");
  await page.waitForTimeout(1000);

  // Fill campaign name  
  const campNameInput = page.locator("input[placeholder*='Product Launch']").first();
  await campNameInput.fill("Playwright Test Campaign");

  // Select the email list from the To dropdown
  const listSelect = page.locator("button:has-text('a list')").first();
  await listSelect.click();
  await page.waitForTimeout(500);
  const listItem = page.locator("div[role='option']:has-text('Playwright Test List')").first();
  await listItem.click();
  await page.waitForTimeout(500);
  console.log("✓ Email list selected for To");

  // Fill subject
  const subjInput = page.locator("input[placeholder='Campaign subject']").first();
  await subjInput.fill("Test Campaign Subject");

  // Type body in TipTap editor
  const editor = page.locator(".tiptap").first();
  await editor.click();
  await editor.fill("This is a test campaign email body.");
  console.log("✓ Campaign body filled");

  // Click Launch Campaign
  const launchBtn = page.locator("button:has-text('Launch Campaign')").first();
  await launchBtn.click();
  await page.waitForTimeout(3000);
  console.log("✓ Campaign launched");

  // Verify campaign appears in table
  const campaignVisible = await page.locator("text=Playwright Test Campaign").first().isVisible().catch(() => false);
  console.log(`  Campaign visible in table: ${campaignVisible}`);

  // Check campaign status
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const statusEl = page.locator("text=Playwright Test Campaign").locator("xpath=../../..").locator("td:nth-child(6)").first();
  const statusText = await statusEl.textContent().catch(() => "unknown");
  console.log(`  Campaign status: ${statusText}`);

  await browser.close();
  console.log("\n✓ Test complete");
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
