import { chromium } from "playwright-core";

async function main() {
  const uuid = process.argv[2] || "unknown";
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("http://localhost:3001/login");
  await page.fill("#email", "ahmad@demo-project-mail.xyz");
  await page.fill("#password", "ahmad123");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard");

  await page.goto("http://localhost:3001/mail");
  await page.waitForTimeout(3000);

  const body = await page.textContent("body");
  if (body.includes(uuid)) {
    console.log(`PASS: Email ${uuid} found in UI`);
    process.exit(0);
  } else {
    console.log(`FAIL: Email ${uuid} NOT found in UI`);
    const items = await page.$$('[class*="truncate"]');
    for (const item of items) console.log("  -", await item.textContent());
    process.exit(1);
  }
  await browser.close();
}

main().catch(console.error);
