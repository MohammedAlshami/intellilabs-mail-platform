import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { like, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const entity = searchParams.get("entity");

  let query: any = db.select().from(auditLogs);
  if (startDate) query = query.where(gte(auditLogs.createdAt, startDate));
  if (endDate) query = query.where(lte(auditLogs.createdAt, endDate));
  if (entity) query = query.where(like(auditLogs.entityType, `%${entity}%`));

  const all = await query;
  return NextResponse.json(all);
}
