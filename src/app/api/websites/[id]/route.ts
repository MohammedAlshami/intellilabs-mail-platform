import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { websites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed, response } = await requirePermission(_req, "websites", "delete");
  if (!allowed) return response;
  const db = await getDb();
  const { id } = await params;
  await db.delete(websites).where(eq(websites.id, id));
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  const [row] = await db.select().from(websites).where(eq(websites.id, id));
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}
