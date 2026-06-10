import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { campaigns, campaignRecipients } from "@/db/schema";

export async function GET() {
  const db = await getDb();
  const all = await db.select().from(campaigns);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const data = await req.json();
  const id = data.id || String(Date.now());

  let parsedEmails: string[] = [];
  if (data.recipientEmails) {
    parsedEmails = data.recipientEmails
      .split(/[\n,]+/)
      .map((e: string) => e.trim())
      .filter((e: string) => e.includes("@"));
  }

  await db.insert(campaigns).values({
    id,
    name: data.name,
    subject: data.subject || data.name,
    objective: data.objective || "",
    emailContent: data.emailContent || "",
    recipients: parsedEmails.length || data.recipients || 0,
    sent: 0,
    bounced: 0,
    status: data.status || "draft",
    createdAt: new Date().toISOString(),
  });

  if (parsedEmails.length > 0) {
    await db.insert(campaignRecipients).values(
      parsedEmails.map((email: string, i: number) => ({
        id: `${id}-${i}-${Date.now()}`,
        campaignId: id,
        email,
        status: "pending",
        responded: false,
        sentiment: "",
        responseText: "",
        sentAt: "",
      }))
    );
  }

  return NextResponse.json({ id, recipientCount: parsedEmails.length });
}
