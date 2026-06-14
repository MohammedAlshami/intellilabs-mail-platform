import { NextRequest } from "next/server";
import { Agent, Runner, tool } from "@openai/agents";
import { OpenAIProvider, setOpenAIAPI } from "@openai/agents-openai";
import { z } from "zod";
import { like, eq, or } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { getDb } from "@/db";
import { emailTemplates } from "@/db/schema";

setOpenAIAPI("chat_completions");

const provider = new OpenAIProvider({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const runner = new Runner({ modelProvider: provider });

const EFFORTS = ["none", "minimal", "low", "medium", "high"] as const;

function sse(encoder: TextEncoder, controller: ReadableStreamDefaultController, data: any) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(req: NextRequest) {
  const { messages, reasoningEffort } = await req.json();
  if (!messages?.length) {
    return new Response(JSON.stringify({ reply: "Messages are required" }), { status: 400 });
  }

  const token = req.cookies.get("token")?.value;
  const user = token ? await verifyToken(token) : null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const setEmailTool = tool({
        name: "set_email",
        description: "Set the email subject and/or HTML body. Call this when drafting or updating an email.",
        parameters: z.object({
          subject: z.string().optional().describe("The email subject line"),
          body: z.string().optional().describe("The full email body in HTML format with proper <p> tags for paragraphs"),
        }),
        strict: true,
        execute: async () => "Email content captured.",
      });

      const setRecipientsTool = tool({
        name: "set_recipients",
        description: "Set the email recipients including To, CC, and BCC.",
        parameters: z.object({
          to: z.string().optional().describe("Primary recipient email address(es), comma-separated"),
          cc: z.string().optional().describe("CC recipient email address(es), comma-separated"),
          bcc: z.string().optional().describe("BCC recipient email address(es), comma-separated"),
        }),
        strict: true,
        execute: async () => "Recipients captured.",
      });

      const searchTemplatesTool = tool({
        name: "search_templates",
        description: "Search email templates by name, subject, or body content. Use this to find a suitable template for the user's request (e.g. welcome email, inquiry, follow-up, etc.).",
        parameters: z.object({
          q: z.string().describe("Search query to match against template name, subject, or body"),
        }),
        strict: true,
        execute: async ({ q }) => {
          const db = await getDb();
          const results = await db.select({
            id: emailTemplates.id,
            name: emailTemplates.name,
            subject: emailTemplates.subject,
            createdAt: emailTemplates.createdAt,
          }).from(emailTemplates).where(
            or(
              like(emailTemplates.name, `%${q}%`),
              like(emailTemplates.subject, `%${q}%`),
              like(emailTemplates.body, `%${q}%`),
            )
          ).limit(20);
          return JSON.stringify(results.length > 0 ? results : []);
        },
      });

      const getTemplateTool = tool({
        name: "get_template",
        description: "Get a full email template by ID, including the name, subject, and HTML body. Call this after search_templates when the user wants to use a specific template as a base for their email.",
        parameters: z.object({
          id: z.string().describe("The template ID to fetch"),
        }),
        strict: true,
        execute: async ({ id }) => {
          const db = await getDb();
          const template = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
          return JSON.stringify(template[0] || null);
        },
      });

      const getUserInfoTool = tool({
        name: "get_user_info",
        description: "Get the current user's info (name, email, etc.). Call this to personalize the email with the sender's name.",
        parameters: z.object({}),
        strict: true,
        execute: async () => {
          if (user) return JSON.stringify({ name: user.name, email: user.email, roleId: user.roleId });
          return "User info not available.";
        },
      });

      // Auto-detect matching template from user's message
      const allTemplates = await (await getDb()).select().from(emailTemplates);
      const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
      let matchedTemplate: any = null;
      for (const t of allTemplates) {
        if (lastMsg.includes(t.name.toLowerCase().replace(" email", "")) ||
            t.name.toLowerCase().split(" ").some((w: string) => w.length > 4 && lastMsg.includes(w))) {
          matchedTemplate = t;
          break;
        }
      }
      const templateNote = matchedTemplate
        ? `\n\nA matching email template was found! Use this template as a base and fill in the {{placeholder}} fields:\nTemplate name: ${matchedTemplate.name}\nTemplate subject: ${matchedTemplate.subject}\nTemplate body: ${matchedTemplate.body}`
        : "\n\nNo matching template was found. Write the email from scratch.";

      const userInfoNote = user ? `The current user is ${user.name} (${user.email}).` : "";

      try {
        const agent = new Agent({
          name: "ComposeAssistant",
          instructions: `You are an email composition assistant. Help users draft professional emails.

${userInfoNote}
${templateNote}

RULES:
1. Write proper, detailed, formal emails with a warm tone.
2. Use simple <p> tags for paragraphs. Do NOT insert blank <p><br></p> between paragraphs — just consecutive <p> tags.
3. STRICT RULE: The email body MUST NOT contain any sign-off, closing line, signature block, or farewell. NO "Best regards", "Sincerely", "Best", "Thanks", "Cheers", "Respectfully", your name, or company name. NO lines starting with "--" or "---". The body must end abruptly after the last content paragraph — do NOT add anything after the final message. A signature is appended automatically by the system.
4. You can call get_user_info to get your name and email.
5. Use search_templates and get_template to find and use email templates when relevant. Check templates first before writing from scratch.
6. After writing, ask if they'd like to modify anything.
7. Use the set_email tool to fill in the compose form.
8. Use the set_recipients tool to set recipient emails.
9. If no recipient is set yet (To field is empty), ask the user who the recipient should be before writing the email. Do not make up recipient addresses.`,
          model: "openai/gpt-5-nano",
          modelSettings: {
            reasoning: { effort: EFFORTS.includes(reasoningEffort as any) ? reasoningEffort : "low" },
          },
          tools: [setEmailTool, setRecipientsTool, getUserInfoTool, searchTemplatesTool, getTemplateTool],
        });

        const result = await runner.run(agent, messages, { stream: true });

        let reasoning = "";
        let content = "";
        let allToolCalls: any[] = [];

        for await (const event of result) {
          if (event.type === "run_item_stream_event") {
            if (event.name === "reasoning_item_created") {
              const raw = (event.item as any).rawItem?.rawContent ?? [];
              for (const c of raw) {
                if (c.type === "reasoning_text" && c.text) {
                  reasoning += c.text;
                  sse(encoder, controller, { type: "reasoning", content: c.text });
                }
              }
            }
            if (event.name === "tool_called") {
              const tc = (event.item as any).rawItem;
              if (tc?.type === "function_call") {
                const args = tc.arguments ? JSON.parse(tc.arguments) : {};
                if (tc.name === "set_email") {
                  allToolCalls.push({ name: "set_subject", args: { subject: args.subject } });
                  allToolCalls.push({ name: "set_body", args: { body: args.body } });
                  sse(encoder, controller, { type: "tool_call", name: "set_subject", args: { subject: args.subject } });
                  sse(encoder, controller, { type: "tool_call", name: "set_body", args: { body: args.body } });
                }
                if (tc.name === "set_recipients") {
                  allToolCalls.push({ name: "set_recipients", args: { to: args.to, cc: args.cc, bcc: args.bcc } });
                  sse(encoder, controller, { type: "tool_call", name: "set_recipients", args: { to: args.to, cc: args.cc, bcc: args.bcc } });
                }
              }
            }
          }

          if (event.type === "raw_model_stream_event") {
            const rawData = (event as any).data;
            if (rawData?.type === "response.output_text.delta" && rawData.delta) {
              content += rawData.delta;
              sse(encoder, controller, { type: "text", content: rawData.delta });
            }
          }
        }

        await result.completed;

        const replyText = content || (allToolCalls.length > 0 ? "I've added the email to the compose form. Let me know if you'd like to change anything." : "Let me know how I can help with your email.");
        sse(encoder, controller, { type: "result", reply: replyText, reasoning, toolCalls: allToolCalls });
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
