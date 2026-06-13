import { NextRequest, NextResponse } from "next/server"; import { sendMail, DEFAULT_ACCOUNT } from "@/lib/emailengine"; import { getDb } from "@/db"; import { emails } from "@/db/schema"; import { v4 as uuidv4 } from "uuid"; import { requirePermission } from "@/lib/api-auth";
const ACCOUNT_EMAILS: Record<string, string> = { ahmad: "ahmad@demo-project-mail.xyz", siti: "siti@demo-project-mail.xyz", ryan: "ryan@demo-project-mail.xyz", nurul: "nurul@demo-project-mail.xyz", david: "david@demo-project-mail.xyz" };
function getAccountEmail(account?: string): string { if (account && ACCOUNT_EMAILS[account]) return ACCOUNT_EMAILS[account]; return ACCOUNT_EMAILS[DEFAULT_ACCOUNT] || `${DEFAULT_ACCOUNT}@demo-project-mail.xyz`; }
function findAccount(email: string): string | null { for (const [acct, e] of Object.entries(ACCOUNT_EMAILS)) { if (e === email) return acct; } return null; }
export async function POST(req: NextRequest) {
  const { allowed, response } = await requirePermission(req, "mail", "create");
  if (!allowed) return response;
  const { to, subject, text, attachments, account, threadId, inReplyTo, references, cc, bcc } = await req.json();
  if (!to || !subject || !text) return NextResponse.json({ error: "Missing required fields: to, subject, text" }, { status: 400 });
  const fromAccount = account || DEFAULT_ACCOUNT;
  const fromEmail = getAccountEmail(fromAccount);
  try {
    const sendParams: Record<string, unknown> = { from: { address: fromEmail }, to: [{ address: to }], subject, text };
    const customHeaders: Record<string, string> = {};
    if (inReplyTo) customHeaders["In-Reply-To"] = inReplyTo;
    if (references) customHeaders.References = references;
    if (Object.keys(customHeaders).length > 0) sendParams.headers = customHeaders;
    if (attachments?.length > 0) sendParams.attachments = attachments.map((a: { name?: string; contentType?: string; content: string }) => ({ filename: a.name, contentType: a.contentType, content: a.content }));
    let queueId = "local";
    let actualMessageId = "";
    try { const result = await sendMail(sendParams as any); queueId = result.queueId; actualMessageId = result.messageId || ""; } catch {}
    const db = await getDb(); const now = new Date().toISOString();
    const sentId = actualMessageId || uuidv4();
    const tid = threadId || sentId;
    await db.insert(emails).values({
      id: sentId, account: fromAccount, messageId: sentId,
      fromName: fromAccount, fromEmail,
      toEmail: to, subject, bodyText: text,
      folder: "SENT", seen: true, direction: "outbound",
      threadId: tid,
      receivedAt: now, createdAt: now, updatedAt: now,
    });
    // Deliver via webhook for proper threading
    const toAccount = findAccount(to);
    if (toAccount) {
      try {
        const webhookPayload: any = {
          event: "message.new",
          account: toAccount,
          data: { id: uuidv4(), from: fromEmail, to, subject, text, date: now, messageId: sentId, threadId: tid },
          path: "INBOX",
        };
        if (threadId) webhookPayload.data.inReplyTo = sentId;
        await fetch("http://localhost:3001/api/webhooks/emailengine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });
      } catch {}
    }
    return NextResponse.json({ messageId: queueId, queueId, threadId: tid });
  } catch (err) { console.error("Send error:", err); return NextResponse.json({ error: "Failed to send email" }, { status: 500 }); }
}
