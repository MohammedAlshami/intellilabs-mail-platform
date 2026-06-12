import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { like, or, and, eq, sql } from "drizzle-orm";
import {
  websites, campaigns, leads, emailLists, sendingHistory,
  bounceResponses, removalList, auditLogs, roles, users,
} from "@/db/schema";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";

const TABLE_MAP: Record<string, any> = {
  websites, campaigns, leads, "email-lists": emailLists,
  "sending-history": sendingHistory, "bounce-responses": bounceResponses,
  "removal-list": removalList, "audit-logs": auditLogs, roles, users,
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
};

const PAGES = [
  "Dashboard (/dashboard)", "Campaigns (/campaign)", "Mail (/mail)",
  "Email List (/email-list)", "Sending History (/sending-history)",
  "Bounce Monitor (/bounce-monitor)", "Websites (/websites)",
  "Leads (/leads)", "Removal List (/removal-list)", "Reports (/reports)",
  "Audit Trail (/audit-trail)", "Roles (/roles)", "Users (/users)", "Profile (/profile)",
];

const TOOL_DEFS = [
  {
    name: "navigate",
    description: `Navigate to a page. Pages: ${PAGES.join(", ")}.`,
    schema: { type: "object", properties: { page: { type: "string" }, path: { type: "string" } }, required: ["page", "path"] },
  },
  {
    name: "search",
    description: "Search across a data table. Tables: websites, campaigns, leads, email-lists, sending-history, bounce-responses, removal-list, audit-logs, roles, users.",
    schema: { type: "object", properties: { table: { type: "string" }, q: { type: "string" }, filters: { type: "array", items: { type: "object", properties: { column: { type: "string" }, value: { type: "string" } } } } }, required: ["table"] },
  },
  {
    name: "get",
    description: "Get a single record by ID.",
    schema: { type: "object", properties: { table: { type: "string" }, id: { type: "string" } }, required: ["table", "id"] },
  },
  {
    name: "counts",
    description: "Get record counts across all tables.",
    schema: { type: "object", properties: {} },
  },
  {
    name: "export",
    description: "Export data from any table as CSV. Tables: websites, campaigns, leads, email-lists, sending-history, bounce-responses, removal-list, audit-logs, roles, users.",
    schema: { type: "object", properties: { table: { type: "string" }, q: { type: "string" }, filters: { type: "array", items: { type: "object", properties: { column: { type: "string" }, value: { type: "string" } } } } }, required: ["table"] },
  },
];

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

const EFFORTS = ["none", "minimal", "low", "medium", "high"] as const;

function createModel(effort: string) {
  return new ChatOpenRouter({
    model: "openai/gpt-5-nano",
    apiKey: process.env.OPENROUTER_API_KEY!,
    modelKwargs: { reasoning: { effort: EFFORTS.includes(effort as any) ? effort : "medium" } },
  });
}

function sse(encoder: TextEncoder, controller: ReadableStreamDefaultController, data: any) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

async function streamModel(
  model: ChatOpenRouter,
  messages: any[],
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
): Promise<{ content: string; reasoning: string; toolCalls?: any[]; message?: any }> {
  const stream = await model.stream(messages);
  let fullContent = "";
  let fullReasoning = "";
  let accumulated: any = null;

  for await (const chunk of stream) {
    accumulated = accumulated ? accumulated.concat(chunk) : chunk;
    const rc = (chunk.additional_kwargs as any)?.reasoning_content;
    if (rc && typeof rc === "string") {
      fullReasoning += rc;
      sse(encoder, controller, { type: "reasoning", content: rc });
    }
    if (chunk.content) {
      const text = typeof chunk.content === "string" ? chunk.content : "";
      if (text) {
        fullContent += text;
        sse(encoder, controller, { type: "text", content: text });
      }
    }
  }

  const toolCalls = (accumulated as any)?.tool_calls;
  if (toolCalls?.length) {
    return { content: fullContent, reasoning: fullReasoning, toolCalls, message: accumulated };
  }
  return { content: fullContent, reasoning: fullReasoning, message: accumulated };
}

export async function POST(req: NextRequest) {
  const { messages, reasoningEffort } = await req.json();
  if (!messages?.length) {
    return new Response(JSON.stringify({ reply: "Messages are required" }), { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ reply: "API key not configured" }), { status: 500 });

  const systemPrompt = `You are an AI assistant for the IntelliLabs Email Operations Platform.
Available pages: ${PAGES.join(", ")}.
You have tools: navigate (go to a page), search (query data), get (get record), counts (get totals), export (export CSV).
Rules:
- If the user wants to go to a page, use the navigate tool.
- If the user asks to find/list/search data, use search, get, or counts.
- If the user wants to export, use the export tool.
- Remember conversation context.
- Be concise and helpful.`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const model = createModel(reasoningEffort ?? "medium");
      const langchainMessages = [
        new SystemMessage(systemPrompt),
        ...messages.map((m: any) => new HumanMessage(m.content)),
      ];

      try {
        const modelWithTools = model.bindTools(
          TOOL_DEFS.map(td => ({
            type: "function" as const,
            function: { name: td.name, description: td.description, parameters: td.schema },
          })),
        );

        const first = await streamModel(modelWithTools, langchainMessages, encoder, controller);

        if (first.toolCalls?.length) {
          const tc = first.toolCalls[0];

          sse(encoder, controller, { type: "tool_call", name: tc.name, args: tc.args });

          const toolResult = await executeTool(tc.name, JSON.stringify(tc.args));

          const resultMessages = [
            ...langchainMessages,
            first.message,
            new ToolMessage({ tool_call_id: tc.id!, content: toolResult }),
          ];

          const second = await streamModel(model, resultMessages, encoder, controller);
          const reasoning = first.reasoning || second.reasoning;
          const toolCallsResult = [{ name: tc.name, args: JSON.stringify(tc.args), result: toolResult.slice(0, 500) }];

          if (tc.name === "navigate") {
            sse(encoder, controller, { type: "result", reply: second.content, reasoning, toolCall: { tool: "navigate", args: tc.args }, toolCalls: toolCallsResult });
          } else if (tc.name === "export") {
            let csv = "";
            try { const r = JSON.parse(toolResult); csv = r.csv || ""; } catch {}
            sse(encoder, controller, { type: "result", reply: second.content, reasoning, toolCalls: toolCallsResult, csv });
          } else {
            sse(encoder, controller, { type: "result", reply: second.content, reasoning, toolCalls: toolCallsResult });
          }
        } else {
          sse(encoder, controller, { type: "result", reply: first.content, reasoning: first.reasoning, toolCalls: [] });
        }
      } catch (e: any) {
        sse(encoder, controller, { type: "error", message: e.message });
      }
      controller.close();
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
