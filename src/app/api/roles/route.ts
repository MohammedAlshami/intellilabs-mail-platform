import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ALL_PAGES, ALL_PERMISSIONS, type PagePermissions } from "@/lib/permissions";

export async function GET() {
  const db = await getDb();
  return NextResponse.json(await db.select().from(roles));
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const { name, description, permissions, isLeader } = await req.json();
  const id = String(Date.now());
  // Default: grant all permissions if none specified
  const perms: PagePermissions = permissions || Object.fromEntries(
    ALL_PAGES.map(p => [p, Object.fromEntries(ALL_PERMISSIONS.map(perm => [perm, true]))])
  );
  await db.insert(roles).values({
    id, name, description: description || "", permissions: JSON.stringify(perms),
    isLeader: isLeader || false, leadsRoles: "[]", createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ id });
}

export async function PUT(req: NextRequest) {
  const db = await getDb();
  const { id, name, description, permissions, isLeader } = await req.json();
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (permissions !== undefined) updates.permissions = JSON.stringify(permissions);
  if (isLeader !== undefined) updates.isLeader = isLeader;
  await db.update(roles).set(updates).where(eq(roles.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const db = await getDb();
  const { id } = await req.json();
  await db.delete(roles).where(eq(roles.id, id));
  return NextResponse.json({ ok: true });
}
