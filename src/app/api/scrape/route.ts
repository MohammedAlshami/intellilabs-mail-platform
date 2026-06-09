import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import * as cheerio from "cheerio";
import * as z from "zod";
import { execSync } from "child_process";
import path from "path";

const WebsiteSchema = z.object({
  name: z.string().describe("Company/business name"),
  summary: z.string().describe("Short summary of what they do"),
  description: z.string().describe("Brief description"),
  services: z.array(z.string()).describe("Services they provide"),
});

async function loadWebPage(url: string, selector = "body"): Promise<Document[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  const html = await response.text();
  const $ = cheerio.load(html);
  // Remove script, style, nav, footer, header tags before extracting text
  $("script, style, nav, footer, header, iframe, noscript").remove();
  return [
    new Document({
      pageContent: $(selector).text().replace(/\s+/g, " ").trim().slice(0, 15000),
      metadata: { source: url },
    }),
  ];
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const domain = url.replace(/https?:\/\//, "").split("/")[0].split("?")[0];

  // Step 1: Extract emails via fast Python crawler
  let emails: string[] = [];
  try {
    const scriptsDir = path.join(process.cwd(), "scripts");
    const out = execSync(`python "${path.join(scriptsDir, "email_extractor.py")}" "${domain}"`, {
      timeout: 15000, shell: "cmd.exe", cwd: process.cwd(), encoding: "utf-8",
    });
    const lastLine = out.trim().split("\n").pop() || "{}";
    emails = JSON.parse(lastLine).emails || [];
  } catch {
    // fallback: extract emails from HTML via regex
  }

  // Step 2: Load web page and extract business info via LangChain agent
  let name = "", summary = "", description = "", services: string[] = [];
  try {
    const [doc] = await loadWebPage(url);
    const text = doc.pageContent;

    if (!text) {
      return NextResponse.json({ error: "Empty page" }, { status: 500 });
    }

    const model = new ChatOpenAI({
      model: "openai/gpt-4o-mini",
      configuration: { baseURL: "https://openrouter.ai/api/v1" },
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const agent = createAgent({
      model,
      tools: [],
      responseFormat: WebsiteSchema,
      systemPrompt:
        "Extract structured information from the website content below. Return ONLY valid JSON.",
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: `Website content:\n\n${text.slice(0, 12000)}` }],
    });

    const data = result.structuredResponse as z.infer<typeof WebsiteSchema>;
    name = data.name || "";
    summary = data.summary || "";
    description = data.description || "";
    services = data.services || [];
  } catch (e: any) {
    console.error("AI extraction failed:", e.message);
  }

  return NextResponse.json({
    status: "done",
    name,
    description,
    summary,
    services,
    emails,
  });
}
