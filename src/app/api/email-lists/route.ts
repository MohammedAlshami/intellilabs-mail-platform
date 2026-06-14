import { NextRequest, NextResponse } from "next/server"; import { getDb } from "@/db"; import { emailLists } from "@/db/schema"; import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/api-auth";
export async function GET() { const db = await getDb(); const all = await db.select().from(emailLists); return NextResponse.json(all); }
function parseEmails(raw: string): string[] {
  const seen = new Set<string>();
  return raw.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(e => {
    if (!e || seen.has(e)) return false;
    seen.add(e);
    return true;
  });
}

export async function POST(req: NextRequest) { const { allowed, response } = await requirePermission(req, "email-lists", "create"); if (!allowed) return response; const db = await getDb(); const { name, emails, source } = await req.json(); const list = parseEmails(emails); const id = String(Date.now()); await db.insert(emailLists).values({ id, name, emails: list.join(", "), count: list.length, source: source || "", createdAt: new Date().toISOString() }); return NextResponse.json({ id, count: list.length }); }
export async function PATCH(req: NextRequest) { const { allowed, response } = await requirePermission(req, "email-lists", "edit"); if (!allowed) return response; const db = await getDb(); const { id, emails } = await req.json(); const list = parseEmails(emails || ""); await db.update(emailLists).set({ emails: list.join(", "), count: list.length }).where(eq(emailLists.id, id)); return NextResponse.json({ ok: true, count: list.length }); }
export async function DELETE(req: NextRequest) { const { allowed, response } = await requirePermission(req, "email-lists", "delete"); if (!allowed) return response; const db = await getDb(); const { id } = await req.json(); await db.delete(emailLists).where(eq(emailLists.id, id)); return NextResponse.json({ ok: true }); }
