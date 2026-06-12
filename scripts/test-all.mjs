import { chromium } from "@playwright/test";

const BASE = "http://localhost:3001";
const EMAIL = "ahmad@demo-project-mail.xyz";
const PASS = "***REDACTED***";
const TIMEOUT = 30000;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);
  let passed = 0, failed = 0;

  function check(name, ok) { if (ok) { passed++; console.log(`  ✅ ${name}`); } else { failed++; console.log(`  ❌ ${name}`); } }

  // 1. Login
  console.log("\n=== 1. Login ===");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  // Check no sidebar on login
  check("No sidebar on login", !(await page.content()).includes("Sidebar"));
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  check("Login redirects to dashboard", page.url().includes("/dashboard"));

  // 2. Dashboard
  console.log("\n=== 2. Dashboard ===");
  await page.waitForTimeout(1000);
  check("Dashboard loads", await page.locator("body").innerText().then(t => t.length > 0));

  // 3. Mail page
  console.log("\n=== 3. Mail ===");
  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(2000);
  check("Mail page loads", !page.url().includes("error"));

  // 4. Campaigns
  console.log("\n=== 4. Campaigns ===");
  await page.goto(`${BASE}/campaign`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Campaigns page loads", !page.url().includes("error"));

  // 5. Templates
  console.log("\n=== 5. Templates ===");
  await page.goto(`${BASE}/email-templates`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Templates page loads", !page.url().includes("error"));

  // 6. Signatures
  console.log("\n=== 6. Signatures ===");
  await page.goto(`${BASE}/email-signatures`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Signatures page loads", !page.url().includes("error"));

  // 7. Profile
  console.log("\n=== 7. Profile ===");
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Profile page loads", !page.url().includes("error"));
  check("Profile shows user info", await page.locator("text=Display").count() > 0 || await page.locator("text=Profile").count() > 0);

  // 8. Email Lists
  console.log("\n=== 8. Email Lists ===");
  await page.goto(`${BASE}/email-list`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Email lists page loads", !page.url().includes("error"));

  // 9. Sending History
  console.log("\n=== 9. Sending History ===");
  await page.goto(`${BASE}/sending-history`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Sending history page loads", !page.url().includes("error"));

  // 10. Bounce Monitor
  console.log("\n=== 10. Bounce Monitor ===");
  await page.goto(`${BASE}/bounce-monitor`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Bounce monitor page loads", !page.url().includes("error"));

  // 11. Audit Trail
  console.log("\n=== 11. Audit Trail ===");
  await page.goto(`${BASE}/audit-trail`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Audit trail page loads", !page.url().includes("error"));

  // 12. Users
  console.log("\n=== 12. Users ===");
  await page.goto(`${BASE}/users`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Users page loads", !page.url().includes("error"));

  // 13. Roles
  console.log("\n=== 13. Roles ===");
  await page.goto(`${BASE}/roles`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Roles page loads", !page.url().includes("error"));

  // 14. Websites
  console.log("\n=== 14. Websites ===");
  await page.goto(`${BASE}/websites`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Websites page loads", !page.url().includes("error"));

  // 15. Leads
  console.log("\n=== 15. Leads ===");
  await page.goto(`${BASE}/leads`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Leads page loads", !page.url().includes("error"));

  // 16. Reports
  console.log("\n=== 16. Reports ===");
  await page.goto(`${BASE}/reports`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(1000);
  check("Reports page loads", !page.url().includes("error"));

  // 17. Check sidebar shows real user
  console.log("\n=== 17. Sidebar User ===");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(2000);
  const bodyText = await page.locator("body").innerText();
  check("Sidebar shows user email", bodyText.includes(EMAIL) || bodyText.includes("ahmad"));

  // 18. Check compose button exists
  console.log("\n=== 18. UI Elements ===");
  await page.goto(`${BASE}/mail`, { waitUntil: "networkidle", timeout: TIMEOUT });
  await page.waitForTimeout(2000);
  check("Compose New button exists", await page.locator("button:has-text('New')").count() > 0);

  // 19. Check folder tabs exist
  check("Folder tabs exist", await page.locator("button:has-text('Inbox')").count() > 0);

  // API Tests
  console.log("\n=== 19. API Tests ===");
  const token = await page.evaluate(async () => {
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "ahmad@demo-project-mail.xyz", password: "***REDACTED***" }) });
    const d = await r.json(); return d.token;
  });
  check("Login API works", !!token);

  async function apiCheck(name, url) {
    const r = await page.evaluate(async (u) => { const res = await fetch(u); return res.status; }, url);
    check(`${name} (${r})`, r === 200);
  }

  await apiCheck("GET /api/mails", "/api/mails");
  await apiCheck("GET /api/email-templates", "/api/email-templates");
  await apiCheck("GET /api/email-signatures", "/api/email-signatures");
  await apiCheck("GET /api/campaigns", "/api/campaigns");
  await apiCheck("GET /api/sending-history", "/api/sending-history");
  await apiCheck("GET /api/bounce-responses", "/api/bounce-responses");
  await apiCheck("GET /api/audit-logs", "/api/audit-logs");
  await apiCheck("GET /api/profile", "/api/profile");

  // Summary
  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${"=".repeat(40)}`);

  await browser.close();
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
