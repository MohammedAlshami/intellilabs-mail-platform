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
          return "I've added the email subject and body. Let me know if you'd like to change anything.";
        },
        {
          name: "set_email",
          description: "Set the email subject and/or HTML body. Call this when drafting or updating an email.",
          schema: z.object({
            subject: z.string().optional().describe("The email subject line"),
            body: z.string().optional().describe("The full email body in HTML format with proper <p> tags for paragraphs"),
          }),
        },
      );

      const setRecipientsTool = tool(
        ({ to, cc, bcc }) => {
          return `Recipients updated.`;
        },
        {
          name: "set_recipients",
          description: "Set the email recipients including To, CC, and BCC.",
          schema: z.object({
            to: z.string().optional().describe("Primary recipient email address(es), comma-separated"),
            cc: z.string().optional().describe("CC recipient email address(es), comma-separated"),
            bcc: z.string().optional().describe("BCC recipient email address(es), comma-separated"),
          }),
        },
      );

      try {
        const langchainMessages = messages.map((m: any) => {
          if (m.role === "system") return { role: "system" as const, content: m.content + "\n\nRULES:\n1. Before writing any email, ask at least one clarifying question to ensure you have all needed details. Do NOT rush to use tools.\n2. After the user responds, use set_email and set_recipients tools.\n3. Do NOT include any sign-off, closing, or signature in the body.\n4. Between paragraphs, insert <p><br></p> for blank line spacing." };
          return { role: "user" as const, content: m.content };
        });

        const modelWithTools = model.bindTools([setEmailTool, setRecipientsTool]);
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
            if (tc.name === "set_email") {
              allToolCalls.push({ name: "set_subject", args: { subject: tc.args.subject } });
              allToolCalls.push({ name: "set_body", args: { body: tc.args.body } });
              sse(encoder, controller, { type: "tool_call", name: "set_subject", args: { subject: tc.args.subject } });
              sse(encoder, controller, { type: "tool_call", name: "set_body", args: { body: tc.args.body } });
            }
            if (tc.name === "set_recipients") {
              allToolCalls.push({ name: "set_recipients", args: { to: tc.args.to, cc: tc.args.cc, bcc: tc.args.bcc } });
              sse(encoder, controller, { type: "tool_call", name: "set_recipients", args: { to: tc.args.to, cc: tc.args.cc, bcc: tc.args.bcc } });
            }

            try {
              if (tc.name === "set_email") await setEmailTool.invoke(tc.args);
              if (tc.name === "set_recipients") await setRecipientsTool.invoke(tc.args);
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
