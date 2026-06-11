import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { emailAttachments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string; attachmentId: string }> }
) {
  const { messageId, attachmentId } = await params;

  try {
    // Try to find in DB by local path first
    const db = await getDb();
    const rows = await db.select()
      .from(emailAttachments)
      .where(and(
        eq(emailAttachments.emailId, messageId),
        eq(emailAttachments.id, attachmentId)
      ))
      .limit(1);

    // Also try by emailengine attachment ID
    const byEngineId = rows.length === 0 ? await db.select()
      .from(emailAttachments)
      .where(eq(emailAttachments.emailengineAttachmentId, attachmentId))
      .limit(1) : [];

    const att = rows[0] || byEngineId[0];

    // Serve from local path if available
    if (att?.localPath) {
      try {
        const filePath = join(process.cwd(), "public", att.localPath);
        const buffer = await readFile(filePath);
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": att.contentType || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${att.filename || "attachment"}"`,
          },
        });
      } catch {}
    }

    // Fallback to fetching from EmailEngine
    const { getAttachment, DEFAULT_ACCOUNT } = await import("@/lib/emailengine");
    const emailRes = await getAttachment(messageId, attachmentId, DEFAULT_ACCOUNT);
    if (!emailRes.ok) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const contentType = emailRes.headers.get("content-type") || "application/octet-stream";
    const disposition = emailRes.headers.get("content-disposition") || undefined;
    const buffer = await emailRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        ...(disposition ? { "Content-Disposition": disposition } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }
}
