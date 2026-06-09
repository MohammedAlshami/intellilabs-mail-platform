import { NextRequest, NextResponse } from "next/server";
import { AgentMailClient } from "agentmail";

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: from, email: from };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const apiKey = process.env.AGENTMAIL_API_KEY;
  const inboxId = process.env.AGENTMAIL_INBOX_ID;

  if (!apiKey || !inboxId) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
  }

  const client = new AgentMailClient({ apiKey });

  try {
    const msg = await client.inboxes.messages.get(inboxId, messageId);
    const { name, email } = parseFrom(msg.from);

    const attachments = (msg.attachments ?? []).map((a) => ({
      attachmentId: a.attachmentId,
      filename: a.filename,
      size: a.size,
      contentType: a.contentType,
    }));

    return NextResponse.json({
      id: msg.messageId,
      name,
      email,
      subject: msg.subject ?? "(no subject)",
      text: msg.extractedText ?? msg.text ?? "",
      date: typeof msg.timestamp === "string" ? msg.timestamp : (msg.timestamp as Date).toISOString(),
      read: msg.labels.includes("read"),
      labels: msg.labels,
      attachments,
    });
  } catch {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
}
