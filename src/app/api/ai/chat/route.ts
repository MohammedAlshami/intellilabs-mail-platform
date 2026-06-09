import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";

export async function POST(req: NextRequest) {
  const { message, availablePages, model: modelName, reasoningEffort } = await req.json();
  if (!message) return NextResponse.json({ reply: "Message is required" }, { status: 400 });

  const model = new ChatOpenAI({
    model: modelName || "openai/gpt-4o-mini",
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
    apiKey: process.env.OPENROUTER_API_KEY,
    modelKwargs: reasoningEffort ? { reasoning_effort: reasoningEffort } : undefined,
  });

  const systemPrompt = `You are an AI assistant for the IntelliLabs Email Operations Platform.
Available pages: ${availablePages || "None listed"}
You have a tool called "navigate" that takes you to any page. When the user asks to go somewhere, use the navigate tool.

Rules:
1. If the user asks to navigate, first reason about which page matches, then use the navigate tool.
2. For general questions, answer helpfully and concisely.
3. Always think step by step before responding.`;

  try {
    const result = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    const content = typeof result.content === "string" ? result.content : "";

    return NextResponse.json({
      reply: content,
      reasoning: `Analyzing request: "${message}". Identifying intent and formulating response.`,
    });
  } catch (e: any) {
    return NextResponse.json({ reply: `Error: ${e.message}` }, { status: 500 });
  }
}
