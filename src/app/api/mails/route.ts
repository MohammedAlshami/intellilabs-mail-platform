import { NextResponse } from "next/server";
import { AgentMailClient } from "agentmail";

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: from, email: from };
}

export async function GET() {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  const inboxId = process.env.AGENTMAIL_INBOX_ID;

  if (!apiKey || !inboxId) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
  }

  const client = new AgentMailClient({ apiKey });

  try {
    const res = await client.inboxes.messages.list(inboxId, {
      limit: 50,
      includeUnauthenticated: true,
    });

    const mails = res.messages.map((msg) => {
      const { name, email } = parseFrom(msg.from);
      return {
        id: msg.messageId,
        name,
        email,
        subject: msg.subject ?? "(no subject)",
        text: msg.preview ?? "",
        date: typeof msg.timestamp === "string" ? msg.timestamp : (msg.timestamp as Date).toISOString(),
        read: msg.labels.includes("read"),
        labels: msg.labels,
        hasAttachments: (msg.attachments?.length ?? 0) > 0,
      };
    });

    return NextResponse.json({ mails });
  } catch (err) {
    console.error("AgentMail fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch mails" }, { status: 500 });
  }
}
