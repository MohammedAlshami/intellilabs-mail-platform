import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { emails } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { DEFAULT_ACCOUNT } from "@/lib/emailengine";

const FOLDER_MAP: Record<string, string> = {
  "INBOX": "INBOX",
  "\\Sent": "SENT",
  "\\Drafts": "DRAFTS",
  "\\Trash": "TRASH",
  "\\Archive": "ARCHIVE",
  "SENT": "SENT",
  "DRAFTS": "DRAFTS",
  "TRASH": "TRASH",
  "ARCHIVE": "ARCHIVE",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path") || "INBOX";
    const account = searchParams.get("account") || DEFAULT_ACCOUNT;
    const dbFolder = FOLDER_MAP[path] || "INBOX";

    const db = await getDb();

    const rows = await db.select()
      .from(emails)
      .where(and(eq(emails.folder, dbFolder), eq(emails.account, account)))
      .orderBy(desc(emails.receivedAt))
      .limit(100);

    const mails = rows.map((msg) => ({
      id: msg.id,
      name: msg.fromName || msg.fromEmail,
      email: msg.fromEmail,
      subject: msg.subject || "(no subject)",
      text: msg.bodyText || "",
      date: msg.receivedAt,
      read: msg.seen,
      labels: [msg.folder.toLowerCase()],
      hasAttachments: msg.hasAttachments,
      threadId: msg.threadId,
    }));

    return NextResponse.json({ mails });
  } catch (err) {
    console.error("DB fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch mails" }, { status: 500 });
  }
}
