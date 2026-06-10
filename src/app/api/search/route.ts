import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { like, or, eq, and, sql } from "drizzle-orm";
import {
  websites, auditLogs, roles, campaigns, leads, bounceResponses,
  removalList, users, campaignRecipients, emailLists, sendingHistory,
} from "@/db/schema";

const TABLE_MAP: Record<string, { table: any; searchCols: string[] }> = {
  websites: { table: websites, searchCols: ["name", "url", "category", "emails", "description"] },
  campaigns: { table: campaigns, searchCols: ["name", "subject", "objective", "status"] },
  leads: { table: leads, searchCols: ["websiteName", "type", "value"] },
  "email-lists": { table: emailLists, searchCols: ["name", "source"] },
  "sending-history": { table: sendingHistory, searchCols: ["campaign", "campaignId", "status"] },
  "bounce-responses": { table: bounceResponses, searchCols: ["email", "type", "reason", "status"] },
  "removal-list": { table: removalList, searchCols: ["email", "source", "reason", "status"] },
  "audit-logs": { table: auditLogs, searchCols: ["action", "entityType", "userId"] },
  roles: { table: roles, searchCols: ["name", "description"] },
  users: { table: users, searchCols: ["email", "name"] },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table") || "";
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const filters: { column: string; value: string }[] = [];

  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("filter_") && value) {
      filters.push({ column: key.replace("filter_", ""), value });
    }
  }

  const config = TABLE_MAP[table];
  if (!config) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 });
  }

  const db = await getDb();
  const { table: tbl, searchCols } = config;

  const conditions: any[] = [];
  if (q) {
    const likeConditions = searchCols.map((col) => like(tbl[col], `%${q}%`));
    conditions.push(or(...likeConditions));
  }

  for (const f of filters) {
    if (tbl[f.column]) {
      conditions.push(like(tbl[f.column], `%${f.value}%`));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(tbl).where(where).limit(limit).offset((page - 1) * limit),
    db.select({ count: sql<number>`count(*)` }).from(tbl).where(where),
    q ? undefined : null,
  ]);

  const total = countResult?.[0]?.count ?? 0;

  return NextResponse.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
}
