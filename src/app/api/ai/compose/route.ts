import { NextRequest } from "next/server";
import { ChatOpenRouter } from "@langchain/openrouter";
import { tool } from "langchain";
import * as z from "zod";

const EFFORTS = ["none", "minimal", "low", "medium", "high"] as const;

function createModel(effort: string) {
  return new ChatOpenRouter({
    model: "openai/gpt-5-nano",
    apiKey: process.env.OPENROUTER_API_KEY!,
    modelKwargs: { reasoning: { effort: EFFORTS.includes(effort as any) ? effort : "low" } },
  });
}

function sse(encoder: TextEncoder, controller: ReadableStreamDefaultController, data: any) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(req: NextRequest) {
  const { messages, reasoningEffort } = await req.json();
  if (!messages?.length) {
    return new Response(JSON.stringify({ reply: "Messages are required" }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const model = createModel(reasoningEffort ?? "low");

      const setEmailTool = tool(
        ({ subject, body }) => {
          return "I've added the email to the compose form. Let me know if you'd like to change anything.";
        },
        {
          name: "set_email",
          description: "Set both the email subject and HTML body at once. Call this when drafting or updating an email.",
          schema: z.object({
            subject: z.string().optional().describe("The email subject line"),
            body: z.string().optional().describe("The full email body in HTML format"),
          }),
        },
      );

      try {
        const langchainMessages = messages.map((m: any) => {
          if (m.role === "system") return { role: "system" as const, content: m.content + "\n\nCRITICAL INSTRUCTION: You have the set_email tool available. When the user asks you to write or draft an email, you MUST call set_email with a subject and body. NEVER respond with text templates or options. ALWAYS use the tool. Use [placeholder] values if details are missing." };
          return { role: "user" as const, content: m.content };
        });

        const modelWithTools = model.bindTools([setEmailTool]);
        const streamIter = await modelWithTools.stream(langchainMessages);

        let reasoning = "";
        let content = "";
        let accumulated: any = null;

        for await (const chunk of streamIter) {
          accumulated = accumulated ? accumulated.concat(chunk) : chunk;
          const rc = (chunk.additional_kwargs as any)?.reasoning_content;
          if (rc && typeof rc === "string") {
            reasoning += rc;
            sse(encoder, controller, { type: "reasoning", content: rc });
          }
          if (chunk.content && !chunk.tool_call_chunks?.length) {
            const text = typeof chunk.content === "string" ? chunk.content : "";
            if (text) { content += text; sse(encoder, controller, { type: "text", content: text }); }
          }
        }

        const toolCalls = (accumulated as any)?.tool_calls;
        if (toolCalls?.length) {
          const allToolCalls: any[] = [];
          let replyText = content || "I've added the email to the compose form. Let me know if you'd like to change anything.";

          for (const tc of toolCalls) {
            allToolCalls.push({ name: "set_subject", args: { subject: tc.args.subject } });
            allToolCalls.push({ name: "set_body", args: { body: tc.args.body } });
            sse(encoder, controller, { type: "tool_call", name: "set_subject", args: { subject: tc.args.subject } });
            sse(encoder, controller, { type: "tool_call", name: "set_body", args: { body: tc.args.body } });

            try {
              await setEmailTool.invoke(tc.args);
            } catch {}
          }

          sse(encoder, controller, { type: "result", reply: replyText, reasoning, toolCalls: allToolCalls });
          controller.close();
          return;
        }

        sse(encoder, controller, { type: "result", reply: content, reasoning, toolCalls: [] });
      } catch (e: any) {
        sse(encoder, controller, { type: "error", message: e.message });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
