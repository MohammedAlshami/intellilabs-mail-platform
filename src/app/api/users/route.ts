import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const db = await getDb();
  const all = await db.select().from(users);
  return NextResponse.json(all.map((u: any) => ({ ...u, passwordHash: undefined })));
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const { email, password, name, roleId, signatureId } = await req.json();
  const hash = await bcrypt.hash(password, 10);
  const id = String(Date.now());
  await db.insert(users).values({ id, email, passwordHash: hash, name: name || "", roleId: roleId || "", signatureId: signatureId || "", createdAt: new Date().toISOString() });
  return NextResponse.json({ id });
}

export async function PUT(req: NextRequest) {
  const db = await getDb();
  const { id, email, password, name, roleId, signatureId } = await req.json();
  const updates: any = {};
  if (email) updates.email = email;
  if (name !== undefined) updates.name = name;
  if (roleId !== undefined) updates.roleId = roleId;
  if (signatureId !== undefined) updates.signatureId = signatureId;
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set(updates).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const db = await getDb();
  const { id } = await req.json();
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
