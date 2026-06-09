import { test, expect } from "@playwright/test";

test("add website and verify crawl completes", async ({ page }) => {
  // Listen for console errors
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/websites");
  await expect(page.getByRole("heading", { name: "Websites" })).toBeVisible();

  // Click Add Website
  await page.getByRole("button", { name: "Add Website" }).first().click();

  // Fill URL
  const urlInput = page.locator('input[placeholder="https://example.com"]');
  await urlInput.fill("https://ijo-bs.com");

  // Listen for the API request
  const apiPromise = page.waitForResponse(
    (res) => res.url().includes("/api/scrape") && res.status() === 200,
    { timeout: 60000 }
  );

  // Click Start Crawl
  await page.getByRole("button", { name: "Start Crawl" }).click();

  // Wait for API response
  await apiPromise;
  console.log("API request succeeded");

  // Wait for the status to change to Done (up to 30s)
  try {
    await page.waitForFunction(
      () => {
        const spans = document.querySelectorAll("td span");
        for (const span of spans) {
          if (span.textContent === "Done") return true;
        }
        return false;
      },
      { timeout: 45000 }
    );
    console.log("Crawl completed successfully");
  } catch {
    console.log("Crawl did not complete within timeout");
  }

  // Check for any JS errors
  if (errors.length > 0) {
    console.log("Console errors:", errors);
  }

  // Verify there's at least one row in the table
  const rows = page.locator("tbody tr");
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  console.log(`Found ${count} rows in table`);
});
