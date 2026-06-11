import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { emails, emailAttachments, emailThreads, bounceResponses, removalList, auditLogs, sendingHistory } from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { setAnalysis } from "@/lib/email-analysis-store";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const EE_API = (process.env.EMAILENGINE_API_URL || "http://localhost:9090/v1").replace(/\/v1$/, "");
const V1_URL = `${EE_API}/v1`;
const EE_TOKEN = process.env.EMAILENGINE_API_TOKEN || "";
const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

async function fetchEmailContent(account: string, messageId: string): Promise<{
  text: string;
  html: string;
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  subject: string;
  attachments: { id: string; filename?: string; contentType?: string; size?: number }[];
  messageId: string;
  inReplyTo: string;
  references: string;
  date: string;
  unseen: boolean;
  cc: { name?: string; address: string }[];
  bcc: { name?: string; address: string }[];
} | null> {
  try {
    const res = await fetch(`${V1_URL}/account/${encodeURIComponent(account)}/message/${encodeURIComponent(messageId)}`, {
      headers: { Authorization: `Bearer ${EE_TOKEN}` },
    });
    if (!res.ok) return null;
    const msg = await res.json();

    // Fetch text content
    let text = "";
    let html = "";
    if (msg.text?.id) {
      const textRes = await fetch(`${V1_URL}/account/${encodeURIComponent(account)}/text/${encodeURIComponent(msg.text.id)}`, {
        headers: { Authorization: `Bearer ${EE_TOKEN}` },
      });
      if (textRes.ok) {
        const textData = await textRes.json();
        text = textData.plain || "";
        html = textData.html || "";
      }
    }

    return {
      text,
      html,
      from: msg.from || { address: "" },
      to: msg.to || [],
      cc: msg.cc || [],
      bcc: msg.bcc || [],
      subject: msg.subject || "",
      attachments: msg.attachments || [],
      messageId: msg.messageId || "",
      inReplyTo: msg.inReplyTo || msg.headers?.["in-reply-to"]?.[0] || "",
      references: msg.references || msg.headers?.references?.[0] || "",
      date: msg.date || new Date().toISOString(),
      unseen: msg.unseen !== false,
    };
  } catch {
    return null;
  }
}

async function downloadAttachment(account: string, attachmentId: string, filename: string): Promise<string | null> {
  try {
    const res = await fetch(`${V1_URL}/account/${encodeURIComponent(account)}/attachment/${encodeURIComponent(attachmentId)}`, {
      headers: { Authorization: `Bearer ${EE_TOKEN}` },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const safeName = `${uuidv4()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = join(UPLOADS_DIR, safeName);
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(filePath, buffer);
    return `/uploads/${safeName}`;
  } catch {
    return null;
  }
}

async function runAiAnalysis(emailId: string, subject: string, text: string, from: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `Analyze this email and return JSON:
- sentiment: "positive", "negative", or "neutral"
- reasoning: brief explanation (1-2 sentences)
- suggestedReply: a professional, well-formatted suggested reply (3-5 sentences, natural tone)

Return ONLY valid JSON.`,
          },
          { role: "user", content: `From: ${from}\nSubject: ${subject}\n\n${text}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return;
    const analysis = JSON.parse(content);
    setAnalysis(emailId, analysis);
  } catch {}
}

async function ensureThread(db: any, subject: string, inReplyTo: string, fromEmail: string, toEmail: string, date: string) {
  if (inReplyTo) {
    // Find parent email by message_id or in_reply_to
    const parent = await db.select().from(emails).where(or(
      eq(emails.messageId, inReplyTo),
      eq(emails.id, inReplyTo)
    )).limit(1);
    if (parent.length > 0 && parent[0].threadId) {
      // Update thread
      const participants = new Set<string>();
      if (fromEmail) participants.add(fromEmail);
      if (toEmail) participants.add(toEmail);
      await db.update(emailThreads).set({
        latestDate: date,
        messageCount: sql`message_count + 1`,
        participants: JSON.stringify([...participants]),
        updatedAt: new Date().toISOString(),
      }).where(eq(emailThreads.id, parent[0].threadId!));
      return parent[0].threadId;
    }
  }

  // Create new thread
  const threadId = uuidv4();
  const participants = JSON.stringify([fromEmail, toEmail].filter(Boolean));
  await db.insert(emailThreads).values({
    id: threadId,
    subject,
    account: "ahmad",
    latestDate: date,
    messageCount: 1,
    participants,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return threadId;
}

async function checkBounce(subject: string, text: string, fromEmail: string): Promise<boolean> {
  const bounceKeywords = ["returned mail", "undelivered", "delivery failure", "mail delivery failed",
    "permanent error", "address rejected", "user unknown", "mailbox not found",
    "550", "551", "552", "553", "554", "5.1.1", "5.1.2", "5.1.6"];
  const lowerSubject = subject.toLowerCase();
  const lowerText = text.toLowerCase();
  return bounceKeywords.some(k => lowerSubject.includes(k) || lowerText.includes(k));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("WEBHOOK RAW:", JSON.stringify(body).slice(0, 500));
    const event = body.event || body.type || body.data?.event || "";
    const msgData = body.data || body.message || body;
    const account = body.account || msgData.account || "ahmad";

    if (!event) return NextResponse.json({ ok: true });

    if (event === "message.new" || event === "messageNew") {
      const messageId = msgData.id || "";
      const fromEmail = msgData.from?.address || msgData.from?.[0]?.address || "";
      const subject = msgData.subject || "";

      if (!messageId) return NextResponse.json({ ok: true });

      // Fetch full email content from EmailEngine
      const content = await fetchEmailContent(account, messageId);
      if (!content) return NextResponse.json({ ok: true });

      const db = await getDb();
      const emailId = uuidv4();
      const now = new Date().toISOString();

      // Check if already stored (by emailengine_id)
      const existing = await db.select().from(emails).where(eq(emails.emailengineId, messageId)).limit(1);
      if (existing.length > 0) return NextResponse.json({ ok: true });

      // Handle threading
      const threadId = await ensureThread(
        db, content.subject, content.inReplyTo,
        content.from.address, content.to?.[0]?.address || "", content.date
      );

      // Store email
      await db.insert(emails).values({
        id: emailId,
        messageId: content.messageId,
        emailengineId: messageId,
        account,
        fromName: content.from.name || "",
        fromEmail: content.from.address,
        toEmail: content.to.map(t => t.address).join(", "),
        cc: content.cc.map(c => c.address).join(", "),
        bcc: content.bcc.map(b => b.address).join(", "),
        subject: content.subject,
        bodyText: content.text,
        bodyHtml: content.html,
        folder: "INBOX",
        threadId,
        inReplyTo: content.inReplyTo,
        references: content.references,
        seen: !content.unseen,
        hasAttachments: content.attachments.length > 0,
        direction: "inbound",
        receivedAt: content.date,
        createdAt: now,
        updatedAt: now,
      });

      // Store attachments and download them locally
      for (const att of content.attachments) {
        const localPath = await downloadAttachment(account, att.id, att.filename || "attachment");
        await db.insert(emailAttachments).values({
          id: uuidv4(),
          emailId,
          filename: att.filename || "",
          contentType: att.contentType || "",
          size: att.size || 0,
          emailengineAttachmentId: att.id,
          localPath: localPath || "",
          createdAt: now,
        });
      }

      // Audit log
      await db.insert(auditLogs).values({
        id: uuidv4(),
        action: "email_received",
        entityType: "email",
        entityId: emailId,
        details: `Email received from ${content.from.address}: ${content.subject}`,
        createdAt: now,
      });

      // Check for bounce
      if (await checkBounce(content.subject, content.text, content.from.address)) {
        const toAddresses = content.to.map(t => t.address);
        for (const addr of toAddresses) {
          if (addr) {
            await db.insert(bounceResponses).values({
              id: uuidv4(),
              email: addr,
              type: "bounce",
              reason: content.subject,
              confidence: 0.95,
              received: now,
              status: "pending",
              createdAt: now,
            });
          }
        }
      }

      // Run AI analysis in background
      if (process.env.OPENROUTER_API_KEY) {
        runAiAnalysis(emailId, content.subject, content.text, content.from.address).catch(() => {});
      }
    }

    // Handle bounce events from EmailEngine
    if (event === "message.bounced" || event === "messageBounce") {
      const db = await getDb();
      const recipient = msgData.recipient || msgData.to?.[0]?.address || "";
      if (recipient) {
        await db.insert(bounceResponses).values({
          id: uuidv4(),
          email: recipient,
          type: "bounce",
          reason: msgData.response?.message || msgData.error || "Bounced",
          confidence: 1.0,
          received: new Date().toISOString(),
          status: "pending",
          createdAt: new Date().toISOString(),
        });
        await db.insert(auditLogs).values({
          id: uuidv4(),
          action: "bounce_detected",
          entityType: "bounce",
          entityId: recipient,
          details: `Bounce detected for ${recipient}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Handle sent message tracking
    if (event === "message.sent" || event === "messageSent") {
      const db = await getDb();
      const queueId = msgData.queueId || "";
      const toAddresses = msgData.envelope?.to || [];
      const fromAddr = msgData.envelope?.from || "";
      if (queueId && toAddresses.length > 0) {
        await db.insert(sendingHistory).values({
          id: uuidv4(),
          campaign: "Direct Send",
          recipients: toAddresses.length,
          sent: 1,
          date: new Date().toISOString(),
          status: "sent",
          createdAt: new Date().toISOString(),
        });
        await db.insert(auditLogs).values({
          id: uuidv4(),
          action: "email_sent",
          entityType: "email",
          entityId: queueId,
          details: `Email sent to ${toAddresses.join(", ")}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ ok: true });
  }
}
