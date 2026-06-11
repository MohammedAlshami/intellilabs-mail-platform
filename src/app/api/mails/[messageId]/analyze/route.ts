import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { emails } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAnalysis, setAnalysis } from "@/lib/email-analysis-store";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Check pre-generated store first
  const cached = getAnalysis(messageId);
  if (cached) {
    return NextResponse.json(cached);
  }

  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  try {
    const db = await getDb();
    const rows = await db.select().from(emails).where(eq(emails.id, messageId)).limit(1);

    let subject = "";
    let text = "";
    let from = "";

    if (rows.length > 0) {
      subject = rows[0].subject || "";
      text = rows[0].bodyText || rows[0].bodyHtml || "";
      from = rows[0].fromEmail || "";
    } else {
      const { getMessage, DEFAULT_ACCOUNT } = await import("@/lib/emailengine");
      const msg = await getMessage(messageId, DEFAULT_ACCOUNT);
      if (!msg) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }
      subject = msg.subject || "";
      text = typeof msg.text === "string" ? msg.text : "";
      from = msg.from?.address || "";
    }

    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `You are an email assistant. Analyze the email and return JSON with:
- sentiment: "positive", "negative", or "neutral"
- reasoning: brief explanation (1-2 sentences)
- suggestedReply: a professional, well-formatted reply (3-5 sentences, natural conversational tone, proper punctuation and line breaks)

The suggested reply should:
- Greet the sender naturally
- Address all points/questions in the original email
- End with a polite closing

Return ONLY valid JSON.`,
          },
          { role: "user", content: `From: ${from}\nSubject: ${subject}\n\n${text}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
    }

    const analysis = JSON.parse(content);
    setAnalysis(messageId, analysis);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("AI analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
