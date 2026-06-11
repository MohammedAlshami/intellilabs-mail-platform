import { NextRequest } from "next/server";
const OA = "https://openrouter.ai/api/v1/chat/completions";
export async function POST(req: NextRequest) {
  const { prompt, context } = await req.json(); const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return new Response("API key not configured", { status: 500 });
  const sys = `You are an email writing assistant. Generate a professional email based on the user's instructions. Format the output as plain text with proper line breaks and structure. Use hyphens for lists, colons for labels. Keep it concise, clear, and professional. Return ONLY the email body text, no explanations.`;
  const user = context ? `Context (replying to): ${context}\n\nInstructions: ${prompt}` : `Write an email: ${prompt}`;
  const res = await fetch(OA, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "system", content: sys }, { role: "user", content: user }], stream: true }) });
  if (!res.ok) { const t = await res.text(); return new Response(t, { status: res.status }); }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body?.getReader(); if (!reader) { controller.close(); return; }
      const dec = new TextDecoder(); let buf = "";
      try {
        while (true) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() || "";
          for (const line of lines) { const t = line.trim(); if (!t || !t.startsWith("data: ")) continue; const d = t.slice(6); if (d === "[DONE]") continue; try { const p = JSON.parse(d); const c = p.choices?.[0]?.delta?.content || ""; if (c) controller.enqueue(enc.encode(c)); } catch {} }
        }
      } finally { reader.releaseLock(); controller.close(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
