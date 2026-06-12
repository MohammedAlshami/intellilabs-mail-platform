import { NextRequest, NextResponse } from "next/server"; import { getDb } from "@/db"; import { emails } from "@/db/schema"; import { eq, desc, and } from "drizzle-orm"; import { DEFAULT_ACCOUNT } from "@/lib/emailengine";

const FOLDER_MAP: Record<string, string> = { "INBOX": "INBOX", "\\Sent": "SENT", "\\Drafts": "DRAFTS", "\\Trash": "TRASH", "\\Archive": "ARCHIVE", "SENT": "SENT", "DRAFTS": "DRAFTS", "TRASH": "TRASH", "ARCHIVE": "ARCHIVE" };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path") || "INBOX";
    const account = searchParams.get("account") || DEFAULT_ACCOUNT;
    const dbFolder = FOLDER_MAP[path] || "INBOX";
    const db = await getDb();
    const rows = await db.select().from(emails).where(and(eq(emails.folder, dbFolder), eq(emails.account, account))).orderBy(desc(emails.receivedAt)).limit(200);
    // Group by threadId
    const threadMap = new Map<string, any[]>();
    for (const msg of rows) {
      const key = msg.threadId || msg.id;
      if (!threadMap.has(key)) threadMap.set(key, []);
      threadMap.get(key)!.push(msg);
    }
    const threads = Array.from(threadMap.values()).map(group => {
      const sorted = group.sort((a, b) => (b.receivedAt || "").localeCompare(a.receivedAt || ""));
      const latest = sorted[0];
      return {
        id: latest.threadId || latest.id,
        threadId: latest.threadId || null,
        subject: latest.subject || "(no subject)",
        from: { name: latest.fromName || latest.fromEmail, email: latest.fromEmail },
        to: latest.toEmail || "",
        preview: latest.bodyText?.slice(0, 100) || "",
        date: latest.receivedAt,
        read: latest.seen,
        messageCount: group.length,
        participants: Array.from(new Set(group.map(m => m.fromName || m.fromEmail).filter(Boolean))),
        labels: [latest.folder.toLowerCase()],
        hasAttachments: group.some(m => m.hasAttachments),
      };
    }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return NextResponse.json({ threads });
  } catch (err) { console.error("DB fetch error:", err); return NextResponse.json({ error: "Failed to fetch mails" }, { status: 500 }); }
}
