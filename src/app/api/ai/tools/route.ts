import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { like, or, and, sql, eq } from "drizzle-orm";
import {
  websites, auditLogs, roles, campaigns, leads, bounceResponses,
  removalList, users, campaignRecipients, emailLists, sendingHistory,
  emailTemplates,
} from "@/db/schema";

const TABLE_MAP: Record<string, any> = {
  websites, campaigns, leads, "email-lists": emailLists,
  "sending-history": sendingHistory, "bounce-responses": bounceResponses,
  "removal-list": removalList, "audit-logs": auditLogs, roles, users,
  "email-templates": emailTemplates,
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
  "email-templates": ["name", "subject", "body"],
};

export async function POST(req: NextRequest) {
  const { tool, args } = await req.json();
  const db = await getDb();

  switch (tool) {
    case "search": {
      const { table, q, filters } = args as { table: string; q?: string; filters?: { column: string; value: string }[] };
      const tbl = TABLE_MAP[table];
      if (!tbl) return NextResponse.json({ error: `Unknown table: ${table}` });

      const conditions: any[] = [];
      if (q && SEARCH_COLS[table]) {
        conditions.push(or(...SEARCH_COLS[table].map((c) => like(tbl[c], `%${q}%`))));
      }
      if (filters) {
        for (const f of filters) {
          if (tbl[f.column]) conditions.push(like(tbl[f.column], `%${f.value}%`));
        }
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db.select().from(tbl).where(where).limit(50);
      const countResult = await db.select({ count: sql<number>`count(*)` }).from(tbl).where(where);
      return NextResponse.json({ data: rows, total: countResult[0]?.count ?? 0 });
    }

    case "get": {
      const { table, id } = args as { table: string; id: string };
      const tbl = TABLE_MAP[table];
      if (!tbl) return NextResponse.json({ error: `Unknown table: ${table}` });
      const row = await db.select().from(tbl).where(eq(tbl.id, id)).limit(1);
      return NextResponse.json({ data: row[0] || null });
    }

    case "counts": {
      const allTables = ["websites", "campaigns", "leads", "email-lists", "sending-history", "bounce-responses", "removal-list", "users", "email-templates"];
      const results: Record<string, number> = {};
      for (const t of allTables) {
        const tbl = TABLE_MAP[t];
        if (tbl) {
          const r = await db.select({ count: sql<number>`count(*)` }).from(tbl);
          results[t] = r[0]?.count ?? 0;
        }
      }
      return NextResponse.json({ data: results });
    }

    case "export": {
      const { table, q, filters } = args as { table: string; q?: string; filters?: { column: string; value: string }[] };
      const tbl = TABLE_MAP[table];
      if (!tbl) return NextResponse.json({ error: `Unknown table: ${table}` });

      const conditions: any[] = [];
      if (q && SEARCH_COLS[table]) {
        conditions.push(or(...SEARCH_COLS[table].map((c) => like(tbl[c], `%${q}%`))));
      }
      if (filters) {
        for (const f of filters) {
          if (tbl[f.column]) conditions.push(like(tbl[f.column], `%${f.value}%`));
        }
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      let rows = await db.select().from(tbl).where(where);
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
      return NextResponse.json({ data: rows, csv, total: rows.length });
    }

    default:
      return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  }
}
