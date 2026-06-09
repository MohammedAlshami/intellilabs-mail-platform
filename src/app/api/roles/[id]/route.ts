import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(roles).where(eq(roles.id, id));
  return NextResponse.json({ ok: true });
}
