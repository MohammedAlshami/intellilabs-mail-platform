import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import * as cheerio from "cheerio";
import * as z from "zod";
import { extractEmails } from "@/lib/email-extractor";

const WebsiteSchema = z.object({
  name: z.string().describe("Company/business name"),
  summary: z.string().describe("Short summary of what they do"),
  description: z.string().describe("Brief description"),
  services: z.array(z.string()).describe("Services they provide"),
});

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const domain = url.replace(/https?:\/\//, "").split("/")[0].split("?")[0];

  // Step 1: Extract emails (uses cheerio + Playwright fallback internally)
  const emails = await extractEmails(domain);

  // Step 2: Extract page text with cheerio for the AI agent
  let name = "", summary = "", description = "", services: string[] = [];
  let text = "";

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, iframe, noscript, meta, link, svg").remove();
    $("br").replaceWith(" ");
    $("td, th, li, p, div, h1, h2, h3, h4, h5, h6, span, a").after(" ");
    text = $("body").text().replace(/\s+/g, " ").trim();

    // Also grab title and meta description as fallback
    const title = $("title").text().trim();
    const metaDesc = $("meta[name='description']").attr("content") || "";
    if (text.length < 100 && (title || metaDesc)) {
      text = [title, metaDesc].filter(Boolean).join(" | ") + " | " + text;
    }
  } catch (e: any) {
    return NextResponse.json({ error: `Fetch failed: ${e.message}` }, { status: 500 });
  }

  if (!text || text.length < 20) {
    return NextResponse.json({ status: "done", name: "", description: "", summary: "", services: [], emails });
  }

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
    console.error("AI extraction failed:", e.message);
  }

  return NextResponse.json({ status: "done", name, description, summary, services, emails });
}
