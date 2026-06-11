import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { emails, emailAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;

  try {
    const db = await getDb();
    const rows = await db.select().from(emails).where(eq(emails.id, messageId)).limit(1);

    if (rows.length === 0 || !rows[0].bodyText) {
      // Try fetching from EmailEngine directly
      const { getMessage, DEFAULT_ACCOUNT } = await import("@/lib/emailengine");
      const msg = await getMessage(messageId, DEFAULT_ACCOUNT);
      if (!msg) {
        // Try by emailengine ID
        const byEngineId = await db.select().from(emails).where(eq(emails.emailengineId, messageId)).limit(1);
        if (byEngineId.length > 0 && byEngineId[0].bodyText) {
          const m = byEngineId[0];
          const attRows = await db.select().from(emailAttachments).where(eq(emailAttachments.emailId, m.id));
          return NextResponse.json({
            id: m.id,
            name: m.fromName || m.fromEmail,
            email: m.fromEmail,
            subject: m.subject ?? "(no subject)",
            text: m.bodyText || m.bodyHtml || "",
            date: m.receivedAt,
            read: m.seen,
            labels: [m.folder.toLowerCase()],
            attachments: attRows.map((a) => ({
              attachmentId: a.emailengineAttachmentId || a.id,
              filename: a.filename,
              size: a.size,
              contentType: a.contentType,
            })),
          });
        }
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }

      const bodyText = typeof msg.text === "string" ? msg.text : "";

      // Save or update to DB
      const now = new Date().toISOString();
      if (rows.length === 0) {
        await db.insert(emails).values({
          id: messageId,
          emailengineId: msg.id,
          account: DEFAULT_ACCOUNT,
          fromName: msg.from?.name || "",
          fromEmail: msg.from?.address || "",
          subject: msg.subject || "",
          bodyText,
          folder: "INBOX",
          seen: !msg.unseen,
          hasAttachments: (msg.attachments?.length ?? 0) > 0,
          direction: "inbound",
          receivedAt: msg.date || now,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db.update(emails).set({ bodyText, updatedAt: now }).where(eq(emails.id, messageId));
      }

      const attachments = (msg.attachments ?? []).map((a: any) => ({
        attachmentId: a.id,
        filename: a.filename,
        size: a.size,
        contentType: a.contentType,
      }));

      return NextResponse.json({
        id: messageId,
        name: msg.from?.name || msg.from?.address || "",
        email: msg.from?.address || "",
        subject: msg.subject ?? "(no subject)",
        text: bodyText,
        date: msg.date,
        read: !msg.unseen,
        labels: msg.flags.map((f: string) => f.replace("\\", "").toLowerCase()),
        attachments,
      });
    }

    const msg = rows[0];
    const attRows = await db.select().from(emailAttachments).where(eq(emailAttachments.emailId, msg.id));

    return NextResponse.json({
      id: msg.id,
      name: msg.fromName || msg.fromEmail,
      email: msg.fromEmail,
      subject: msg.subject ?? "(no subject)",
      text: msg.bodyText || msg.bodyHtml || "",
      date: msg.receivedAt,
      read: msg.seen,
      labels: [msg.folder.toLowerCase()],
      attachments: attRows.map((a) => ({
        attachmentId: a.emailengineAttachmentId || a.id,
        filename: a.filename,
        size: a.size,
        contentType: a.contentType,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
}
