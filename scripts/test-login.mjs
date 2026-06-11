import { chromium } from "@playwright/test";

const BASE = "http://localhost:3001";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // 1. Check login page - should NOT have sidebar
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const loginBody = await page.locator("body").innerHTML();

  // Check for sidebar elements
  const hasSidebarOnLogin = loginBody.includes("sidebar") || loginBody.includes("Menu");
  console.log("Sidebar on login page:", hasSidebarOnLogin ? "❌ PRESENT" : "✅ NOT present");

  // Check for login form elements
  const hasLoginForm = loginBody.includes("Welcome Back") && loginBody.includes("Sign in");
  console.log("Login form visible:", hasLoginForm ? "✅ YES" : "❌ NO");

  // Take screenshot
  await page.screenshot({ path: "/tmp/login-page.png" });
  console.log("Screenshot saved to /tmp/login-page.png");

  // 2. Login and check dashboard has sidebar
  await page.fill('input[type="email"]', "ahmad@demo-project-mail.xyz");
  await page.fill('input[type="password"]', "***REDACTED***");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  await page.waitForTimeout(2000);

  const dashBody = await page.locator("body").innerHTML();
  const hasSidebarOnDash = dashBody.includes("sidebar") || dashBody.includes("Menu");
  console.log("Sidebar on dashboard:", hasSidebarOnDash ? "✅ PRESENT" : "❌ NOT present");

  await page.screenshot({ path: "/tmp/dashboard-page.png" });
  console.log("Screenshot saved to /tmp/dashboard-page.png");

  await browser.close();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
