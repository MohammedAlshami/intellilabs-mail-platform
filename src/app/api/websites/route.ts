import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { websites } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const all = await db.select().from(websites);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const id = data.id || String(Date.now());
  await db.insert(websites).values({
    id,
    url: data.url,
    name: data.name || "",
    category: data.category || "",
    isHealthcare: data.isHealthcare || false,
    emails: data.emails || "",
    phones: data.phones || "",
    description: data.description || "",
    summary: data.summary || "",
    services: JSON.stringify(data.services || []),
    scrapeStatus: data.scrapeStatus || "idle",
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ id });
}

export async function PUT(req: NextRequest) {
  const data = await req.json();
  await db.update(websites).set({
    name: data.name,
    category: data.category,
    isHealthcare: data.isHealthcare,
    emails: data.emails,
    phones: data.phones,
    description: data.description,
    summary: data.summary,
    services: data.services ? JSON.stringify(data.services) : undefined,
    scrapeStatus: data.scrapeStatus,
  }).where(eq(websites.id, data.id));
  return NextResponse.json({ ok: true });
}
