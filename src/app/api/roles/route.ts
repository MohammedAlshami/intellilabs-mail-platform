import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getDb();
    const all = await db.select().from(roles);
    return NextResponse.json(all);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const data = await req.json();
  const id = data.id || String(Date.now());
  await db.insert(roles).values({
    id,
    name: data.name,
    description: data.description || "",
    permissions: JSON.stringify(data.permissions || []),
    isLeader: data.isLeader || false,
    leadsRoles: JSON.stringify(data.leadsRoles || []),
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ id });
}

export async function PUT(req: NextRequest) {
  const db = await getDb();
  const data = await req.json();
  await db.update(roles).set({
    name: data.name,
    description: data.description,
    permissions: data.permissions ? JSON.stringify(data.permissions) : undefined,
    isLeader: data.isLeader,
    leadsRoles: data.leadsRoles ? JSON.stringify(data.leadsRoles) : undefined,
  }).where(eq(roles.id, data.id));
  return NextResponse.json({ ok: true });
}
