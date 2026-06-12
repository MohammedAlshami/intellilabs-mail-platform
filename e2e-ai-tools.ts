import { chromium } from "playwright";

const BASE = "http://localhost:3001";

async function aiSend(page: any, text: string) {
  const textarea = page.locator("textarea[placeholder='Ask me anything...']");
  await textarea.fill(text);
  await page.click('button[type="submit"]');
}

async function waitForDone(page: any, timeout = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const loader = await page.locator("svg.lucide-loader-2").isVisible().catch(() => false);
    if (!loader) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("  [ERR]", msg.text().slice(0, 150));
  });

  // Login
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "admin@intellilabs.com");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Open AI
  await page.click("button:has(svg.lucide-sparkles)");
  await page.waitForTimeout(1500);

  // --- Test 1: Navigate ---
  console.log("\n--- Test 1: Navigate to Campaigns ---");
  await aiSend(page, "Go to Campaigns page");
  const done1 = await waitForDone(page);
  const url1 = page.url();
  console.log(`  Done: ${done1}, URL: ${url1.includes("/campaign") ? "/campaign ✓" : url1}`);

  // --- Test 2: Counts ---
  if (!url1.includes("/campaign")) {
    console.log("  Navigate didn't work, continuing anyway");
  }
  // Go back and retry navigate
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.click("button:has(svg.lucide-sparkles)");
  await page.waitForTimeout(1500);

  // --- Test 3: Simple query (no tool) ---
  console.log("\n--- Test 2: Simple question ---");
  await aiSend(page, "List all available pages");
  await waitForDone(page, 30000);
  const messages = await page.locator("[class*='overflow-y-auto']").last().textContent().catch(() => "");
  console.log(`  Response received: ${(messages?.length || 0) > 100 ? "YES" : "NO - length: " + messages?.length}`);

  await browser.close();
  console.log("\n✓ Done");
}

test().catch((e) => { console.error(e.message); process.exit(1); });
