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
  await page.waitForTimeout(3000);

  // Compose new email
  const newBtn = page.locator("button:has(svg.lucide-square-pen)").first();
  await newBtn.click();
  await page.waitForTimeout(1500);

  const toInput = page.locator("input[placeholder='Add recipient...']").first();
  await toInput.fill("mshami2021@gmail.com");
  await toInput.press("Enter");
  await page.waitForTimeout(500);

  const subjInput = page.locator("input[placeholder='Subject']").first();
  await subjInput.fill("Siti direct test");

  const editor = page.locator(".tiptap").first();
  await editor.click();
  await editor.fill("Testing if siti's SMTP works.");

  const sendBtn = page.locator("button:has(svg.lucide-send)").last();
  await sendBtn.click({ force: true });
  await page.waitForTimeout(5000);
  console.log("✓ Email sent as siti");

  // Get the full page text
  const bodyText = await page.locator("body").innerText();
  const fromLine = bodyText.split("\n").find(l => l.startsWith("From:"));
  console.log(`  ${fromLine}`);
  console.log(`  URL: ${page.url()}`);

  await browser.close();
}

test().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
