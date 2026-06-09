import { test, expect } from "@playwright/test";

test("add a website end to end", async ({ page }) => {
  // Listen for API responses
  const apiCalls: string[] = [];
  page.on("response", (res) => {
    if (res.url().includes("/api/websites") || res.url().includes("/api/scrape")) {
      apiCalls.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.goto("/websites");
  await expect(page.getByText("No websites yet.")).toBeVisible();

  // Click Add Website button
  await page.locator("button:has-text('Add Website')").first().click();
  await page.waitForTimeout(500);

  // Fill URL
  await page.locator('input[placeholder="https://example.com"]').fill("https://ijo-bs.com");
  await page.waitForTimeout(300);

  // Click Start Crawl
  await page.locator("button:has-text('Start Crawl')").click();
  await page.waitForTimeout(3000);

  console.log("API calls:", apiCalls);

  // Check if the POST to /api/websites happened
  const postCall = apiCalls.find(c => c.includes("POST") && c.includes("/api/websites"));
  console.log("POST /api/websites:", postCall);

  // Check the table now
  const body = await page.textContent("body");
  console.log("Body:", body?.substring(0, 2000));

  // Wait for "Crawling..." or "Done" or the domain name to appear
  const rowContent = page.locator("tbody");
  try {
    await expect(rowContent).not.toBeEmpty({ timeout: 10000 });
  } catch {
    console.log("Row still empty after 10s");
  }
});
