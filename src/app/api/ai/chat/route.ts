import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { like, or, and, eq, sql } from "drizzle-orm";
import {
  websites, campaigns, leads, emailLists, sendingHistory,
  bounceResponses, removalList, auditLogs, roles, users,
} from "@/db/schema";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

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

const TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate",
      description: `Navigate to a page. Pages: ${PAGES.join(", ")}.`,
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", description: "Page display name" },
          path: { type: "string", description: "URL path" },
        },
        required: ["page", "path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search",
      description: "Search across a data table. Tables: websites, campaigns, leads, email-lists, sending-history, bounce-responses, removal-list, audit-logs, roles, users.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          q: { type: "string" },
          filters: { type: "array", items: { type: "object", properties: { column: { type: "string" }, value: { type: "string" } } } },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get",
      description: "Get a single record by ID.",
      parameters: {
        type: "object",
        properties: { table: { type: "string" }, id: { type: "string" } },
        required: ["table", "id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "counts",
      description: "Get record counts across all tables.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "export",
      description: "Export data from any table as CSV. Tables: websites, campaigns, leads, email-lists, sending-history, bounce-responses, removal-list, audit-logs, roles, users.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          q: { type: "string" },
          filters: { type: "array", items: { type: "object", properties: { column: { type: "string" }, value: { type: "string" } } } },
        },
        required: ["table"],
      },
    },
  },
];

async function executeTool(toolCall: { name: string; arguments: string }): Promise<string> {
  const args = JSON.parse(toolCall.arguments);

  switch (toolCall.name) {
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
      return `Unknown tool: ${toolCall.name}`;
  }
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  if (!messages || messages.length === 0) {
    return NextResponse.json({ reply: "Messages are required" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ reply: "API key not configured" }, { status: 500 });

  const systemMsg = {
    role: "system",
    content: `You are an AI assistant for the IntelliLabs Email Operations Platform.

Available pages: ${PAGES.join(", ")}.

You have tools: navigate (go to a page), search (query data), get (get record), counts (get totals), export (export CSV).

Rules:
- If the user wants to go to a page, use the navigate tool.
- If the user asks to find/list/search data, use search, get, or counts.
- If the user wants to export, use the export tool.
- Remember conversation context.
- Be concise and helpful.`,
  };

  try {
    let modelMessages: any[] = [systemMsg, ...messages.map((m: any) => ({ role: m.role, content: m.content }))];

    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-nano",
        messages: modelMessages,
        tools: TOOLS,
        reasoning: { effort: "minimal" },
      }),
    });

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    if (!msg) return NextResponse.json({ reply: "No response from model" });

    // Handle tool calls
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const toolCall = msg.tool_calls[0];

      // Execute the tool
      const toolResult = await executeTool({
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
      });

      // Send result back to model for final response
      modelMessages = [
        ...modelMessages,
        msg,
        { role: "tool", tool_call_id: toolCall.id, content: toolResult },
      ];

      const finalRes = await fetch(OPENROUTER_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-nano",
          messages: modelMessages,
        reasoning: { effort: "minimal" },
        }),
      });

      const finalData = await finalRes.json();
      const finalMsg = finalData.choices?.[0]?.message;
      const finalReply = finalMsg?.content || "";
      const reasoning = msg.reasoning || finalMsg?.reasoning || "";

      const toolCalls = [{
        name: toolCall.function.name,
        args: toolCall.function.arguments,
        result: toolResult.slice(0, 500),
      }];

      if (toolCall.function.name === "navigate") {
        const args = JSON.parse(toolCall.function.arguments);
        return NextResponse.json({
          reply: finalReply,
          reasoning,
          toolCall: { tool: "navigate", args },
          toolCalls,
        });
      }

      // If export, include CSV data for download
      if (toolCall.function.name === "export") {
        let csv = "";
        try { const r = JSON.parse(toolResult); csv = r.csv || ""; } catch {}
        return NextResponse.json({ reply: finalReply, reasoning, toolCalls, csv });
      }

      return NextResponse.json({ reply: finalReply, reasoning, toolCalls });
    }

    return NextResponse.json({ reply: msg.content || "", reasoning: msg.reasoning || "" });
  } catch (e: any) {
    return NextResponse.json({ reply: `Error: ${e.message}` }, { status: 500 });
  }
}
