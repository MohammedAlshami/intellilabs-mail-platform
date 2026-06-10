import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { campaignRecipients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "15");
  const offset = (page - 1) * limit;

  const db = await getDb();
  const all = await db.select().from(campaignRecipients).where(eq(campaignRecipients.campaignId, id)).limit(limit).offset(offset);

  const countResult = await db.select({ count: campaignRecipients.id }).from(campaignRecipients).where(eq(campaignRecipients.campaignId, id));
  const total = countResult.length;

  return NextResponse.json({ data: all, total, page, limit, totalPages: Math.ceil(total / limit) });
}
