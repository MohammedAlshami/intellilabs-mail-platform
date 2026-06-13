import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { removalList } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function GET() {
  const db = await getDb();
  const all = await db.select().from(removalList);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const { allowed, response } = await requirePermission(req, "removal-list", "create");
  if (!allowed) return response;
  const db = await getDb();
  const data = await req.json();
  const id = data.id || String(Date.now());
  await db.insert(removalList).values({
    id,
    email: data.email,
    source: data.source || "Manual entry",
    reason: data.reason || "Manual flag",
    flaggedAt: data.flaggedAt || new Date().toISOString(),
    status: data.status || "pending",
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  const { allowed, response } = await requirePermission(req, "removal-list", "edit");
  if (!allowed) return response;
  const db = await getDb();
  const data = await req.json();
  await db.update(removalList).set({ status: data.status }).where(eq(removalList.id, data.id));
  return NextResponse.json({ ok: true });
}
