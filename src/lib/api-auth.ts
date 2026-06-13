import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { roles, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function requirePermission(
  req: NextRequest,
  page: string,
  action: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return { allowed: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.roleId) {
    return { allowed: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const [role] = await db.select().from(roles).where(eq(roles.id, user.roleId));
  if (!role) {
    return { allowed: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  let permissions: Record<string, Record<string, boolean>> = {};
  try { permissions = JSON.parse(role.permissions ?? "{}"); } catch {}

  if (!permissions[page]?.[action]) {
    return { allowed: false, response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }

  return { allowed: true };
}
