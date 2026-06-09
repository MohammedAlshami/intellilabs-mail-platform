import { AgentMailClient } from "agentmail";

function getClient() {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  const inboxId = process.env.AGENTMAIL_INBOX_ID;

  if (!apiKey || !inboxId) {
    throw new Error("Missing AGENTMAIL_API_KEY or AGENTMAIL_INBOX_ID in .env.local");
  }

  const client = new AgentMailClient({ apiKey });
  return { client, inboxId };
}

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: from, email: from };
}

export interface MailItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  text: string;
  date: string;
  read: boolean;
  labels: string[];
  threadId?: string;
}

export async function fetchMails(): Promise<MailItem[]> {
  const { client, inboxId } = getClient();

  const res = await client.inboxes.messages.list(inboxId, { limit: 50 });

  return res.messages.map((msg) => {
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
      threadId: msg.threadId,
    };
  });
}

export async function fetchMailDetail(messageId: string): Promise<MailItem | null> {
  const { client, inboxId } = getClient();

  try {
    const msg = await client.inboxes.messages.get(inboxId, messageId);
    const { name, email } = parseFrom(msg.from);
    return {
      id: msg.messageId,
      name,
      email,
      subject: msg.subject ?? "(no subject)",
      text: msg.extractedText ?? msg.text ?? "",
      date: typeof msg.timestamp === "string" ? msg.timestamp : (msg.timestamp as Date).toISOString(),
      read: msg.labels.includes("read"),
      labels: msg.labels,
      threadId: msg.threadId,
    };
  } catch {
    return null;
  }
}

export const INBOX_EMAIL = process.env.AGENTMAIL_INBOX_ID ?? "trueventus@agentmail.to";
