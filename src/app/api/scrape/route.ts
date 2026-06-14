import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as cheerio from "cheerio";
import * as z from "zod";
import { extractEmails } from "@/lib/email-extractor";
import { requirePermission } from "@/lib/api-auth";
import { getDb } from "@/db";
import { websites } from "@/db/schema";
import { eq } from "drizzle-orm";

const WebsiteSchema = z.object({
  name: z.string().describe("Company/business name"),
  summary: z.string().describe("Short summary of what they do"),
  description: z.string().describe("Brief description"),
  services: z.array(z.string()).describe("Services they provide"),
});

async function updateProgress(websiteId: string, step: number, status: string, message: string) {
  try {
    const db = await getDb();
    await db.update(websites).set({
      scrapeProgress: JSON.stringify({ currentStep: step, status, message, updatedAt: new Date().toISOString() }),
    }).where(eq(websites.id, websiteId));
  } catch {}
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, iframe, noscript, meta, link, svg").remove();
    $("br").replaceWith(" ");
    $("td, th, li, p, div, h1, h2, h3, h4, h5, h6, span, a").after(" ");
    const text = $("body").text().replace(/\s+/g, " ").trim();
    if (text.length >= 100) return text;
  } catch {}
  return "";
}

async function isUrlHealthy(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    return res.ok || res.status === 403 || res.status === 401;
  } catch {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return res.ok || res.status === 403 || res.status === 401;
    } catch {
      return false;
    }
  }
}

export async function POST(req: NextRequest) {
  const { allowed, response } = await requirePermission(req, "websites", "create");
  if (!allowed) return response;
  const { url, websiteId } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const domain = url.replace(/https?:\/\//, "").split("/")[0].split("?")[0];

  // Check URL health first
  updateProgress(websiteId, 1, "running", "Checking URL health...");
  const healthy = await isUrlHealthy(url);
  if (!healthy) {
    await updateProgress(websiteId, 1, "error", "Website is unreachable or blocking requests");
    return NextResponse.json({ status: "error", error: "Website unreachable", name: "", description: "", summary: "", services: [], emails: [] });
  }

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
