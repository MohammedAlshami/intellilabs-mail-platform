import { chromium } from "@playwright/test";

const BASE = "http://localhost:3001";

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // Test mobile viewport
  const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobile = await mobileCtx.newPage();
  
  // Login
  await mobile.goto(`${BASE}/login`);
  await mobile.fill('input[type="email"]', "ahmad@demo-project-mail.xyz");
  await mobile.fill('input[type="password"]', "***REDACTED***");
  await mobile.click('button[type="submit"]');
  await mobile.waitForURL("**/dashboard", { timeout: 15000 });
  await mobile.waitForTimeout(1000);
  
  // Check hamburger button exists
  const menuBtn = mobile.locator('button:has(svg.lucide-menu)');
  const menuBtnCount = await menuBtn.count();
  console.log(`Mobile viewport: hamburger button count = ${menuBtnCount}`);
  
  // Check sidebar is NOT visible initially
  const sidebarVisible = await mobile.locator('nav[data-sidebar]').first().isVisible().catch(() => false);
  console.log(`Mobile viewport: sidebar visible initially = ${sidebarVisible}`);
  
  // Click hamburger
  if (menuBtnCount > 0) {
    await menuBtn.first().click();
    await mobile.waitForTimeout(1000);
    
    // Check the Sheet opened
    const sheetContent = mobile.locator('[data-state="open"]');
    const sheetCount = await sheetContent.count();
    console.log(`Mobile viewport: Sheet open = ${sheetCount > 0}`);
    
    // Check sidebar nav links visible in Sheet
    const navLink = mobile.locator('text=Dashboard');
    const navVisible = await navLink.isVisible().catch(() => false);
    console.log(`Mobile viewport: Dashboard link visible = ${navVisible}`);
  }
  
  // Test desktop viewport
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const desktop = await desktopCtx.newPage();
  
  // Login
  await desktop.goto(`${BASE}/login`);
  await desktop.fill('input[type="email"]', "ahmad@demo-project-mail.xyz");
  await desktop.fill('input[type="password"]', "***REDACTED***");
  await desktop.click('button[type="submit"]');
  await desktop.waitForURL("**/dashboard", { timeout: 15000 });
  await desktop.waitForTimeout(1000);
  
  // Check hamburger NOT visible on desktop
  const desktopMenuBtn = desktop.locator('button:has(svg.lucide-menu)');
  const desktopMenuCount = await desktopMenuBtn.count();
  console.log(`\nDesktop viewport: hamburger button count = ${desktopMenuCount}`);
  
  // Check sidebar IS visible on desktop
  const desktopSidebar = await desktop.locator('nav[data-sidebar]').first().isVisible().catch(() => false);
  console.log(`Desktop viewport: sidebar visible = ${desktopSidebar}`);
  
  await browser.close();
  
  if (menuBtnCount === 0 || sidebarVisible) {
    console.log("\n❌ FAILED: Mobile sidebar behavior incorrect");
    process.exit(1);
  }
  console.log("\n✅ All mobile sidebar tests passed");
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
