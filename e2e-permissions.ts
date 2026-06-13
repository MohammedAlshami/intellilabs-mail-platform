import { chromium } from "playwright-core";

async function main() {
  const browser = await chromium.launch({ headless: true });
  let allOk = true;

  async function loginAs(email: string, pw: string) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("http://localhost:3001/login", { waitUntil: "networkidle" });
    await page.waitForSelector("#email");
    await page.fill("#email", email);
    await page.fill("#password", pw);
    await page.click('button:has-text("Sign in")');
    await page.waitForTimeout(3000);
    return { ctx, page };
  }

  async function checkNoButton(page: any, url: string, btnText: string, label: string) {
    await page.goto(`http://localhost:3001${url}`, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const btn = await page.$(`button:has-text("${btnText}")`);
    if (btn) { console.log(`  FAIL: ${label} - button VISIBLE`); allOk = false; }
    else { console.log(`  OK: ${label} - button hidden`); }
  }

  async function checkButtonVisible(page: any, url: string, btnText: string, label: string) {
    await page.goto(`http://localhost:3001${url}`, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const btn = await page.$(`button:has-text("${btnText}")`);
    if (btn) { console.log(`  OK: ${label} - button visible`); }
    else { console.log(`  FAIL: ${label} - button HIDDEN`); allOk = false; }
  }

  async function checkRedirect(page: any, url: string, label: string) {
    await page.goto(`http://localhost:3001${url}`, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    if (finalUrl.includes("/dashboard")) {
      console.log(`  OK: ${label} - redirected to /dashboard`);
    } else {
      console.log(`  FAIL: ${label} - landed on ${finalUrl} instead of /dashboard`);
      allOk = false;
    }
  }

  async function checkNavItem(page: any, itemText: string, label: string, visible: boolean) {
    const item = await page.$(`text="${itemText}"`);
    if (visible && !item) { console.log(`  FAIL: ${label} - nav item HIDDEN`); allOk = false; }
    else if (!visible && item) { console.log(`  FAIL: ${label} - nav item VISIBLE`); allOk = false; }
    else { console.log(`  OK: ${label} - ${visible ? 'visible' : 'hidden'}`); }
  }

  // ===== VIEWER TESTS =====
  console.log("=== Viewer (nurul) ===");
  let { ctx, page } = await loginAs("nurul@demo-project-mail.xyz", "nurul123");

  // Buttons check
  await checkNoButton(page, "/campaign", "Add Campaign", "campaigns");
  await checkNoButton(page, "/email-list", "Add List", "email-lists");
  await checkNoButton(page, "/email-templates", "Add Template", "templates");
  await checkNoButton(page, "/email-signatures", "Add Signature", "signatures");
  await checkNoButton(page, "/removal-list", "Add Entry", "removal-list");
  await checkNoButton(page, "/users", "Add User", "users");
  await checkNoButton(page, "/roles", "Create Role", "roles");

  // Middleware redirect check (admin-only pages)
  await checkRedirect(page, "/reports", "reports redirect");
  await checkRedirect(page, "/audit-trail", "audit-trail redirect");
  await checkRedirect(page, "/email-signatures", "signatures redirect");

  // Sidebar check - nav items hidden
  await checkNavItem(page, "Reports", "reports nav", false);
  await checkNavItem(page, "Audit Trail", "audit-trail nav", false);
  await checkNavItem(page, "Signatures", "signatures nav", false);
  await checkNavItem(page, "Roles", "roles nav", false);
  await checkNavItem(page, "Users", "users nav", false);

  // Sidebar check - nav items visible
  await checkNavItem(page, "Dashboard", "dashboard nav", true);
  await checkNavItem(page, "Campaigns", "campaigns nav", true);

  const viewerCookies = await page.context().cookies();
  const viewerToken = viewerCookies.find(c => c.name === "token")?.value;
  await ctx.close();

  // ===== ADMIN TESTS =====
  console.log("\n=== Admin (ahmad) ===");
  ({ ctx, page } = await loginAs("ahmad@demo-project-mail.xyz", "ahmad123"));

  await checkButtonVisible(page, "/campaign", "Add Campaign", "campaigns");
  await checkButtonVisible(page, "/email-list", "Add List", "email-lists");
  await checkButtonVisible(page, "/email-signatures", "Add Signature", "signatures");
  await checkButtonVisible(page, "/users", "Add User", "users");
  await checkButtonVisible(page, "/roles", "Create Role", "roles");

  // Admin can access admin-only pages (no redirect)
  await page.goto("http://localhost:3001/reports", { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(2000);
  console.log(`  reports page: ${page.url().includes("/reports") ? "accessible (ok)" : "redirected (FAIL)"}`);
  if (!page.url().includes("/reports")) allOk = false;

  await page.goto("http://localhost:3001/audit-trail", { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(2000);
  console.log(`  audit-trail page: ${page.url().includes("/audit-trail") ? "accessible (ok)" : "redirected (FAIL)"}`);
  if (!page.url().includes("/audit-trail")) allOk = false;

  await ctx.close();

  // ===== API ENFORCEMENT =====
  console.log("\n=== API enforcement ===");
  if (viewerToken) {
    async function apiPost(path: string, data: any) {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `token=${viewerToken}` },
        body: JSON.stringify(data),
      });
      return res.status;
    }
    const createStatus = await apiPost("http://localhost:3001/api/campaigns", {
      name: "test", subject: "test", objective: "test", emailContent: "test", recipientEmails: "test@test.com", status: "draft",
    });
    console.log(`  POST /api/campaigns: ${createStatus} ${createStatus === 403 ? "(ok)" : "(FAIL)"}`);
    if (createStatus !== 403) allOk = false;

    const listStatus = await apiPost("http://localhost:3001/api/email-lists", {
      name: "test", emails: "test@test.com",
    });
    console.log(`  POST /api/email-lists: ${listStatus} ${listStatus === 403 ? "(ok)" : "(FAIL)"}`);
    if (listStatus !== 403) allOk = false;
  }

  await browser.close();
  if (!allOk) { console.log("\n⚠ Some checks FAILED"); process.exit(1); }
  console.log("\n✅ All permission checks passed!");
}

main().catch((e) => { console.error(e); process.exit(1); });
