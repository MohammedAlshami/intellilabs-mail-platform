import { NextRequest, NextResponse } from "next/server";
import { AgentMailClient } from "agentmail";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string; attachmentId: string }> }
) {
  const { messageId, attachmentId } = await params;
  const apiKey = process.env.AGENTMAIL_API_KEY;
  const inboxId = process.env.AGENTMAIL_INBOX_ID;

  if (!apiKey || !inboxId) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
  }

  const client = new AgentMailClient({ apiKey });

  try {
    const result = await client.inboxes.messages.getAttachment(
      inboxId,
      messageId,
      attachmentId
    );

    return NextResponse.redirect(result.downloadUrl);
  } catch {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }
}
