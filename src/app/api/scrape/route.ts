import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as cheerio from "cheerio";
import * as z from "zod";
import { chromium } from "playwright-core";
import { extractEmails } from "@/lib/email-extractor";

const WebsiteSchema = z.object({
  name: z.string().describe("Company/business name"),
  summary: z.string().describe("Short summary of what they do"),
  description: z.string().describe("Brief description"),
  services: z.array(z.string()).describe("Services they provide"),
});

const CF_API = "https://api.cloudflare.com/client/v4";

async function updateProgress(websiteId: string, step: number, status: string, message: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
  const token = process.env.CLOUDFLARE_D1_TOKEN;
  if (!accountId || !databaseId || !token) return;

  const progress = JSON.stringify({
    currentStep: step,
    status,
    message,
    updatedAt: new Date().toISOString(),
  });

  try {
    await fetch(`${CF_API}/accounts/${accountId}/d1/database/${databaseId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql: "UPDATE websites SET scrape_progress = ? WHERE id = ?", params: [progress, websiteId] }),
    });
  } catch {}
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, iframe, noscript, meta, link, svg").remove();
    $("br").replaceWith(" ");
    $("td, th, li, p, div, h1, h2, h3, h4, h5, h6, span, a").after(" ");
    const text = $("body").text().replace(/\s+/g, " ").trim();
    if (text.length >= 100) return text;
  } catch {}

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    if (text && text.length >= 20) return text.replace(/\s+/g, " ").trim();
  } catch {}

  return "";
}

export async function POST(req: NextRequest) {
  const { url, websiteId } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const domain = url.replace(/https?:\/\//, "").split("/")[0].split("?")[0];

  updateProgress(websiteId, 1, "running", "Starting email crawler...");

  // Step 1 & 2: Run email extraction and page text fetch in parallel
  const [emails, text] = await Promise.all([
    (async () => {
      await updateProgress(websiteId, 2, "running", "Crawling website for emails...");
      const result = await extractEmails(domain);
      await updateProgress(websiteId, 3, "done", `Found ${result.length} emails`);
      return result;
    })(),
    (async () => {
      await updateProgress(websiteId, 2, "running", "Fetching page content...");
      const result = await fetchPageText(url);
      if (result.length >= 20) {
        await updateProgress(websiteId, 3, "done", `Extracted ${result.length} characters of content`);
      }
      return result;
    })(),
  ]);

  if (!text || text.length < 20) {
    await updateProgress(websiteId, 4, "done", "Scrape complete (no content for AI)");
    return NextResponse.json({ status: "done", name: "", description: "", summary: "", services: [], emails });
  }

  // Step 3: AI extraction
  await updateProgress(websiteId, 4, "running", "AI analyzing page content...");
  let name = "", summary = "", description = "", services: string[] = [];

  try {
    const model = new ChatOpenAI({
      model: "openai/gpt-4o-mini",
      configuration: { baseURL: "https://openrouter.ai/api/v1" },
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const agent = createAgent({
      model,
      tools: [],
      responseFormat: WebsiteSchema,
      systemPrompt: "Extract structured information from the website content below. Return ONLY valid JSON.",
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: `Website content from ${url}:\n\n${text.slice(0, 15000)}` }],
    });

    const data = result.structuredResponse as z.infer<typeof WebsiteSchema>;
    name = data.name || "";
    summary = data.summary || "";
    description = data.description || "";
    services = data.services || [];
  } catch (e: any) {
    console.error("AI extraction failed:", e.message, e.stack?.slice(0, 500));
  }

  await updateProgress(websiteId, 5, "done", "Scrape complete");
  return NextResponse.json({ status: "done", name, description, summary, services, emails });
}
