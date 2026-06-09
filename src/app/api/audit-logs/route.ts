import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { like, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const entity = searchParams.get("entity");

  let query = db.select().from(auditLogs);

  const conditions: any[] = [];
  if (startDate) conditions.push(gte(auditLogs.createdAt, startDate));
  if (endDate) conditions.push(lte(auditLogs.createdAt, endDate));
  if (entity) conditions.push(like(auditLogs.entityType, `%${entity}%`));

  const all = conditions.length > 0
    ? await db.select().from(auditLogs).where(conditions.reduce((a, c) => a, undefined as any)).all()
    : await db.select().from(auditLogs);

  return NextResponse.json(all);
}
