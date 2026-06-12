import { chromium } from "@playwright/test";
const BASE = "http://localhost:9090";
async function main() {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.goto(BASE + "/admin/login");
  await p.fill('input[name="username"]', "admin");
  await p.fill('input[name="password"]', "***REDACTED***");
  await p.click('button[type="submit"]');
  await p.waitForURL("**/admin");
  await p.goto(BASE + "/admin/webhooks/new");
  await p.waitForTimeout(1000);
  
  // Find all input/select/checkbox names
  const fields = await p.evaluate(() => {
    return Array.from(document.querySelectorAll("input, select, textarea")).map(function(el) {
      return el.getAttribute("name") || el.getAttribute("id") || "no-name";
    });
  });
  console.log("Form fields:", JSON.stringify(fields));
  
  // Check the target URL field value
  const urlVal = await p.inputValue("#inputTargetUrl");
  console.log("Target URL field:", urlVal);
  
  await b.close();
}
main().catch(e => { console.error(e); process.exit(1); });
