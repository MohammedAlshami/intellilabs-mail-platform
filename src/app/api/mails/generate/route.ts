import { NextRequest } from "next/server";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: NextRequest) {
  const { prompt, context } = await req.json();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return new Response("API key not configured", { status: 500 });

  const systemMsg = `You are an email writing assistant. Generate a professional email based on the user's instructions.
Keep it concise, clear, and professional. Return ONLY the email body text, no explanations.`;

  const userMsg = context
    ? `Context (replying to): ${context}\n\nInstructions: ${prompt}`
    : `Write an email: ${prompt}`;

  const res = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5-nano",
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(text, { status: res.status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body?.getReader();
      if (!reader) { controller.close(); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {}
          }
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
