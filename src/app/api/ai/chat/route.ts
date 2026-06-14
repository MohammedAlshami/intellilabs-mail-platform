import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { like, or, and, eq, asc, sql } from "drizzle-orm";
import {
  websites, campaigns, leads, emailLists, sendingHistory,
  bounceResponses, removalList, auditLogs, roles, users, emails,
  emailTemplates,
} from "@/db/schema";
import { Agent, Runner, tool } from "@openai/agents";
import { OpenAIProvider, setOpenAIAPI } from "@openai/agents-openai";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";

setOpenAIAPI("chat_completions");

const provider = new OpenAIProvider({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const runner = new Runner({ modelProvider: provider });

const ACCOUNT_MAP: Record<string, string> = { "ahmad@demo-project-mail.xyz": "ahmad", "siti@demo-project-mail.xyz": "siti", "ryan@demo-project-mail.xyz": "ryan", "nurul@demo-project-mail.xyz": "nurul", "david@demo-project-mail.xyz": "david" };

const TABLE_MAP: Record<string, any> = {
  websites, campaigns, leads, "email-lists": emailLists,
  "sending-history": sendingHistory, "bounce-responses": bounceResponses,
  "removal-list": removalList, "audit-logs": auditLogs, roles, users,
  emails, "email-templates": emailTemplates,
};

const SEARCH_COLS: Record<string, string[]> = {
  websites: ["name", "url", "category", "emails"],
  campaigns: ["name", "subject", "objective", "status"],
  leads: ["websiteName", "type", "value"],
  "email-lists": ["name", "source"],
  "sending-history": ["campaign", "status"],
  "bounce-responses": ["email", "type", "reason", "status"],
  "removal-list": ["email", "source", "reason", "status"],
  "audit-logs": ["action", "entityType"],
  roles: ["name", "description"],
  users: ["email", "name"],
  emails: ["subject", "fromName", "fromEmail", "toEmail", "bodyText"],
  "email-templates": ["name", "subject", "body"],
};

const PAGES = [
  "Dashboard (/dashboard)", "Campaigns (/campaign)", "Mail (/mail)",
  "Email List (/email-list)", "Sending History (/sending-history)",
  "Bounce Monitor (/bounce-monitor)", "Websites (/websites)",
  "Leads (/leads)", "Removal List (/removal-list)", "Reports (/reports)",
  "Audit Trail (/audit-trail)", "Roles (/roles)", "Users (/users)", "Profile (/profile)",
];

const EFFORTS = ["none", "minimal", "low", "medium", "high"] as const;

function sse(encoder: TextEncoder, controller: ReadableStreamDefaultController, data: any) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

async function executeTool(name: string, argsStr: string): Promise<string> {
  const args = JSON.parse(argsStr);
  switch (name) {
    case "navigate":
      return `Navigating to ${args.page} at ${args.path}`;
    case "search": {
      const db = await getDb();
      const tbl = TABLE_MAP[args.table];
      if (!tbl) return `Unknown table: ${args.table}`;
      const conditions: any[] = [];
      if (args.q && SEARCH_COLS[args.table]) conditions.push(or(...SEARCH_COLS[args.table].map(c => like(tbl[c], `%${args.q}%`))));
      if (args.filters) for (const f of args.filters) if (tbl[f.column]) conditions.push(like(tbl[f.column], `%${f.value}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db.select().from(tbl).where(where).limit(50);
      const cnt = await db.select({ count: sql<number>`count(*)` }).from(tbl).where(where);
      return JSON.stringify({ data: rows, total: cnt[0]?.count ?? 0 });
    }
    case "get": {
      const db = await getDb();
      const tbl = TABLE_MAP[args.table];
      if (!tbl) return `Unknown table: ${args.table}`;
      const row = await db.select().from(tbl).where(eq(tbl.id, args.id)).limit(1);
      return JSON.stringify(row[0] || null);
    }
    case "counts": {
      const db = await getDb();
      const allTables = ["websites", "campaigns", "leads", "email-lists", "sending-history", "bounce-responses", "removal-list", "users"];
      const results: Record<string, number> = {};
      for (const t of allTables) {
        const tbl = TABLE_MAP[t];
        if (tbl) {
          const r = await db.select({ count: sql<number>`count(*)` }).from(tbl);
          results[t] = r[0]?.count ?? 0;
        }
      }
      return JSON.stringify(results);
    }
    case "export": {
      const db = await getDb();
      const tbl = TABLE_MAP[args.table];
      if (!tbl) return `Unknown table: ${args.table}`;
      const conditions: any[] = [];
      if (args.q && SEARCH_COLS[args.table]) conditions.push(or(...SEARCH_COLS[args.table].map(c => like(tbl[c], `%${args.q}%`))));
      if (args.filters) for (const f of args.filters) if (tbl[f.column]) conditions.push(like(tbl[f.column], `%${f.value}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db.select().from(tbl).where(where);
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const csv = [headers.join(","), ...rows.map((r: any) => headers.map(h => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
      return JSON.stringify({ data: rows, csv, total: rows.length });
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

export async function POST(req: NextRequest) {
  const { messages, reasoningEffort } = await req.json();
  if (!messages?.length) {
    return new Response(JSON.stringify({ reply: "Messages are required" }), { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ reply: "API key not configured" }), { status: 500 });

  const token = req.cookies.get("token")?.value;
  const user = token ? await verifyToken(token) : null;
  const userInfoNote = user ? `The current user is ${user.name} (${user.email}).` : "";

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const navigateTool = tool({
        name: "navigate",
        description: `Navigate to a page. Pages: ${PAGES.join(", ")}.`,
        parameters: z.object({ page: z.string(), path: z.string() }),
        strict: true,
        execute: async ({ page, path }) => `Navigating to ${page} at ${path}`,
      });

      const searchTool = tool({
        name: "search",
        description: "Search across a data table. Tables: websites, campaigns, leads, email-lists, sending-history, bounce-responses, removal-list, audit-logs, roles, users, email-templates.",
        parameters: z.object({
          table: z.string(),
          q: z.string().optional(),
          filters: z.array(z.object({ column: z.string(), value: z.string() })).optional(),
        }),
        strict: true,
        execute: async ({ table, q, filters }) => executeTool("search", JSON.stringify({ table, q, filters })),
      });

      const getTool = tool({
        name: "get",
        description: "Get a single record by ID.",
        parameters: z.object({ table: z.string(), id: z.string() }),
        strict: true,
        execute: async ({ table, id }) => executeTool("get", JSON.stringify({ table, id })),
      });

      const getThreadTool = tool({
        name: "get_thread",
        description: "Get all messages in an email thread by thread ID. Call this when the user asks about an email thread or wants to reply to one.",
        parameters: z.object({ threadId: z.string().describe("The email thread ID from the URL. You can pass it with or without angle brackets.") }),
        strict: true,
        execute: async ({ threadId }) => {
          try {
            const db = await getDb();
            const tid = threadId.trim();
            // Try multiple formats: raw, with brackets, with brackets + domain
            const variants = [tid];
            if (!tid.includes("<")) variants.push(`<${tid}>`, `<${tid}@demo-project-mail.xyz>`);
            else variants.push(tid.replace(/[<>]/g, ""));
            const userAcct = user?.email ? (ACCOUNT_MAP[user.email] || null) : null;
            for (const v of variants) {
              const where = userAcct ? and(eq(emails.threadId, v), eq(emails.account, userAcct)) : eq(emails.threadId, v);
              const rows = await db.select().from(emails).where(where).orderBy(asc(emails.receivedAt));
              if (rows.length > 0) {
                return JSON.stringify(rows.map((m: any) => ({
                  from: m.fromEmail || "",
                  subject: m.subject || "",
                  text: (m.bodyText || m.bodyHtml || "").slice(0, 2000),
                  date: m.receivedAt || "",
                  folder: m.folder || "",
                })));
              }
            }
            return "Thread not found. The ID might be from a different system or the messages haven't been synced yet.";
          } catch (e: any) {
            return `Error fetching thread: ${e.message}`;
          }
        },
      });

      const countsTool = tool({
        name: "counts",
        description: "Get record counts across all tables.",
        parameters: z.object({}),
        strict: true,
        execute: async () => executeTool("counts", "{}"),
      });

      const exportTool = tool({
        name: "export",
        description: "Export data from any table as CSV.",
        parameters: z.object({
          table: z.string(),
          q: z.string().optional(),
          filters: z.array(z.object({ column: z.string(), value: z.string() })).optional(),
        }),
        strict: true,
        execute: async ({ table, q, filters }) => executeTool("export", JSON.stringify({ table, q, filters })),
      });

      const setEmailTool = tool({
        name: "set_email",
        description: "Set the email subject and/or HTML body. Call this when drafting or updating an email reply.",
        parameters: z.object({
          subject: z.string().optional().describe("The email subject line"),
          body: z.string().optional().describe("The full email body in HTML format with <p> tags for paragraphs. Use <p><br></p> between paragraphs for spacing. Example: <p>First paragraph</p><p><br></p><p>Second paragraph</p><p><br></p><p>Third paragraph</p>"),
        }),
        strict: true,
        execute: async () => "Email content has been set in the compose form.",
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
        execute: async () => "Recipients have been set.",
      });

      const getUserInfoTool = tool({
        name: "get_user_info",
        description: "Get the current user's info (name, email, etc.).",
        parameters: z.object({}),
        strict: true,
        execute: async () => {
          if (user) return JSON.stringify({ name: user.name, email: user.email, roleId: user.roleId });
          return "User info not available.";
        },
      });

      try {
        const agent = new Agent({
          name: "Assistant",
          instructions: `You are an AI assistant for the IntelliLabs Email Operations Platform.

Available pages: ${PAGES.join(", ")}.

${userInfoNote}

You have tools to navigate pages, search/query data, compose emails, and manage email templates.

RULES:
- If the user wants to go to a page, use the navigate tool.
- If the user asks to find/list/search data, use search, get, or counts.
- If the user wants to export, use the export tool.
- If the user asks you to write or compose an email, use the set_email and set_recipients tools.
- The current user info is available via get_user_info.
- Remember conversation context.
- Be concise and helpful.
- STRICT RULE when composing emails with set_email: The email body MUST NOT contain any sign-off, closing line, signature block, or farewell. This means NO "Best regards", "Sincerely", "Best", "Thanks", "Cheers", "Respectfully", your name, company name, or any line starting with "--" or "---". The body must end abruptly after the last content paragraph. A professional signature is appended automatically by the system — you do NOT need to add one. Violating this rule will result in duplicate signatures.
- Email templates are stored in the "email-templates" table. Use search(table="email-templates", q="...") to list templates by name. Use get(table="email-templates", id="...") to fetch a full template by ID. Templates have name, subject, and body fields. When a user asks about email templates or wants to use a template, search for it or fetch it using these tools.`,
          model: "openai/gpt-5-nano",
          modelSettings: {
            reasoning: { effort: EFFORTS.includes(reasoningEffort as any) ? reasoningEffort : "medium" },
          },
          tools: [navigateTool, searchTool, getTool, getThreadTool, countsTool, exportTool, setEmailTool, setRecipientsTool, getUserInfoTool],
        });

        const result = await runner.run(agent, messages, { stream: true });
        const eventStream = result.toStream().getReader();

        let reasoning = "";
        let content = "";
        let toolCallsEmitted: any[] = [];

        while (true) {
          const { done, value: event } = await eventStream.read();
          if (done) break;

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
                toolCallsEmitted.push({ name: tc.name, args });
                sse(encoder, controller, { type: "tool_call", name: tc.name, args });
              }
            }
            // Capture full message text from created message event
            if (event.name === "message_output_created") {
              const item = event.item as any;
              const text = item?.rawItem?.content?.[0]?.text;
              if (text) {
                content = text;
                // If this text wasn't already streamed via deltas, send it now
                sse(encoder, controller, { type: "text", content: text });
              }
            }
          }

          if (event.type === "raw_model_stream_event") {
            const rawData = (event as any).data;
            if (rawData?.type === "response.output_text.delta" && rawData.delta) {
              content += rawData.delta;
              sse(encoder, controller, { type: "text", content: rawData.delta });
            }
            if (rawData?.type === "response.output_text.done" && rawData.text) {
              // Use the complete text if available (may be more reliable than deltas)
              content = rawData.text;
            }
          }
        }

        await result.completed;

        const tcs = toolCallsEmitted.map((tc: any) => ({
          name: tc.name,
          args: typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args),
        }));

        const navCall = tcs.find((tc: any) => tc.name === "navigate");
        if (navCall) {
          const navArgs = typeof navCall.args === "string" ? JSON.parse(navCall.args) : navCall.args;
          sse(encoder, controller, { type: "result", reply: content || "Done.", reasoning, toolCall: { tool: "navigate", args: navArgs }, toolCalls: tcs });
        } else if (tcs.some((tc: any) => tc.name === "export")) {
          sse(encoder, controller, { type: "result", reply: content || "Done.", reasoning, toolCalls: tcs, csv: "" });
        } else {
          sse(encoder, controller, { type: "result", reply: content || "Done.", reasoning, toolCalls: tcs });
        }
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
