import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed, response } = await requirePermission(req, "roles", "delete");
  if (!allowed) return response;
  const db = await getDb();
  const { id } = await params;
  await db.delete(roles).where(eq(roles.id, id));
  return NextResponse.json({ ok: true });
}
