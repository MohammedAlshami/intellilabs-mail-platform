import { NextRequest, NextResponse } from "next/server";
import { AgentMailClient } from "agentmail";

export async function POST(req: NextRequest) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  const inboxId = process.env.AGENTMAIL_INBOX_ID;

  if (!apiKey || !inboxId) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
  }

  const { to, subject, text, attachments } = await req.json();

  if (!to || !subject || !text) {
    return NextResponse.json({ error: "Missing required fields: to, subject, text" }, { status: 400 });
  }

  const client = new AgentMailClient({ apiKey });

  try {
    const sendParams: Record<string, unknown> = { to, subject, text };
    if (attachments?.length > 0) {
      sendParams.attachments = attachments.map((a: { name?: string; contentType?: string; content: string }) => ({
        filename: a.name,
        contentType: a.contentType,
        content: a.content,
      }));
    }

    const result = await client.inboxes.messages.send(inboxId, sendParams as any);
    return NextResponse.json({ messageId: result.messageId });
  } catch (err) {
    console.error("AgentMail send error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
