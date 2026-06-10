import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";

export async function POST(req: NextRequest) {
  const { message, availablePages, availableTables, model: modelName, reasoningEffort } = await req.json();
  if (!message) return NextResponse.json({ reply: "Message is required" }, { status: 400 });

  const model = new ChatOpenAI({
    model: modelName || "openai/gpt-4o-mini",
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
    apiKey: process.env.OPENROUTER_API_KEY,
    modelKwargs: reasoningEffort ? { reasoning_effort: reasoningEffort } : undefined,
  });

  const systemPrompt = `You are an AI assistant for the IntelliLabs Email Operations Platform.

Available pages: ${availablePages || "None listed"}
Available data tables: ${availableTables || "None listed"}

You have the following tools available:
- navigate(page, path): Navigate to a page
- search(table, q, filters): Search across any data table with optional column filters
- get(table, id): Get a single record by ID
- counts: Get record counts across all tables
- export(table, q, filters): Export data as CSV

Rules:
1. If the user asks to navigate somewhere, use the navigate tool.
2. If the user asks to search, find, look up, or list data, use the search tool.
3. If the user asks for counts, totals, or summary stats, use the counts tool.
4. If the user wants to filter by specific columns, pass the filters to the search tool.
5. For general questions, answer helpfully and concisely.
6. If you want to use a tool, respond with JSON: { "toolCall": { "tool": "...", "args": {...} }, "reply": "..." }
7. Otherwise respond with plain text.`;

  try {
    const result = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    const content = typeof result.content === "string" ? result.content : "";
    let toolCall = null;
    let reply = content;

    try {
      const parsed = JSON.parse(content);
      if (parsed.toolCall) {
        toolCall = parsed.toolCall;
        reply = parsed.reply || "";
      }
    } catch {}

    return NextResponse.json({
      reply,
      toolCall,
      reasoning: `Analyzing request: "${message}". Identifying intent and formulating response.`,
    });
  } catch (e: any) {
    return NextResponse.json({ reply: `Error: ${e.message}` }, { status: 500 });
  }
}
