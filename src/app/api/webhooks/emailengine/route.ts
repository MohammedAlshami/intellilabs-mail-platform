import { NextRequest, NextResponse } from "next/server"; import { getDb } from "@/db"; import { emails, emailAttachments, emailThreads, bounceResponses, auditLogs, sendingHistory } from "@/db/schema"; import { eq, and, or, sql } from "drizzle-orm"; import { v4 as uuidv4 } from "uuid"; import { setAnalysis } from "@/lib/email-analysis-store"; import { writeFile, mkdir } from "fs/promises"; import { join } from "path";
const EE_API = (process.env.EMAILENGINE_API_URL || "http://localhost:9090/v1").replace(/\/v1$/, ""); const V1_URL = `${EE_API}/v1`; const EE_TOKEN = process.env.EMAILENGINE_API_TOKEN || ""; const OA = "https://openrouter.ai/api/v1/chat/completions"; const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

async function fetchEmailContent(account: string, messageId: string) {
  try {
    const r = await fetch(`${V1_URL}/account/${encodeURIComponent(account)}/message/${encodeURIComponent(messageId)}`, { headers: { Authorization: `Bearer ${EE_TOKEN}` } });
    if (!r.ok) return null; const msg = await r.json();
    let text = "", html = "";
    if (msg.text?.id) { 
      const textUrl = `${V1_URL}/account/${encodeURIComponent(account)}/text/${encodeURIComponent(msg.text.id)}`;
      const tr = await fetch(textUrl, { headers: { Authorization: `Bearer ${EE_TOKEN}` } }); 
      if (tr.ok) { 
        const td = await tr.json(); 
        text = td.plain || ""; 
        html = typeof td.html === "string" ? td.html : ""; 
        console.log("TEXT_FETCH_OK");
      } else {
        console.log("TEXT_FETCH_FAIL");
      }
    }
    const htmlStr = typeof html === "string" ? html : "";
    const textStr = typeof text === "string" ? text : "";
    return { text: textStr, html: htmlStr, from: msg.from || { address: "" }, to: msg.to || [], cc: msg.cc || [], bcc: msg.bcc || [], subject: msg.subject || "", attachments: msg.attachments || [], messageId: msg.messageId || "", inReplyTo: msg.inReplyTo || msg.headers?.["in-reply-to"]?.[0] || "", references: msg.references || msg.headers?.references?.[0] || "", date: msg.date || new Date().toISOString(), unseen: msg.unseen !== false, headers: msg.headers || {} };
  } catch { return null; }
}

async function downloadAttachment(account: string, attId: string, fn: string): Promise<{ path: string; size: number } | null> {
  try { const r = await fetch(`${V1_URL}/account/${encodeURIComponent(account)}/attachment/${encodeURIComponent(attId)}`, { headers: { Authorization: `Bearer ${EE_TOKEN}` } }); if (!r.ok) return null; const buf = Buffer.from(await r.arrayBuffer()); const sn = `${uuidv4()}_${fn.replace(/[^a-zA-Z0-9._-]/g, "_")}`; const fp = join(UPLOADS_DIR, sn); await mkdir(UPLOADS_DIR, { recursive: true }); await writeFile(fp, buf); return { path: `/uploads/${sn}`, size: buf.length }; } catch { return null; }
}

async function runAiAnalysis(eid: string, subj: string, text: string, from: string) {
  const k = process.env.OPENROUTER_API_KEY; if (!k) return;
  try { const r = await fetch(OA, { method: "POST", headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "system", content: `Analyze this email and return JSON:\n- sentiment: "positive", "negative", or "neutral"\n- reasoning: brief explanation (1-2 sentences)\n- suggestedReply: a professional, well-formatted suggested reply (3-5 sentences, natural tone)\nReturn ONLY valid JSON.` }, { role: "user", content: `From: ${from}\nSubject: ${subj}\n\n${text}` }], response_format: { type: "json_object" } }) }); const d = await r.json(); const c = d.choices?.[0]?.message?.content; if (!c) return; const a = JSON.parse(c); setAnalysis(eid, a); } catch {}
}

function detectAutoReply(subj: string, text: string, headers: Record<string, string[]>): "auto-reply" | "bounce" | "genuine" {
  const ar = ["auto-submitted", "x-autoreply", "x-autorespond", "precedence", "x-auto-response-suppress"];
  const av = ["auto-replied", "auto_replied", "auto-reply", "auto_reply", "yes", "bulk", "junk"];
  for (const h of ar) { const v = (headers[h]?.[0] || "").toLowerCase(); if (av.some(x => v.includes(x))) return "auto-reply"; }
  const ls = subj.toLowerCase(), lt = text.toLowerCase();
  if (["out of office", "out of the office", "auto reply", "automatic reply", "away from my desk", "on vacation", "on leave", "not in the office", "will be back", "returning on", "i am away", "thank you for your email. i am out of the office", "i will respond when i return"].some(p => ls.includes(p) || lt.includes(p))) return "auto-reply";
  if (["returned mail", "undelivered", "delivery failure", "mail delivery failed", "permanent error", "address rejected", "user unknown", "mailbox not found", "550", "551", "552", "553", "554", "5.1.1", "5.1.2", "5.1.6", "host or domain name not found", "name service error", "mailbox unavailable", "no such user"].some(k => ls.includes(k) || lt.includes(k))) return "bounce";
  return "genuine";
}

async function ensureThread(db: any, subj: string, inr: string, fe: string, te: string, date: string) {
  if (inr) { const p = await db.select().from(emails).where(or(eq(emails.messageId, inr), eq(emails.id, inr))).limit(1); if (p.length > 0 && p[0].threadId) { await db.update(emailThreads).set({ latestDate: date, messageCount: sql`message_count + 1`, updatedAt: new Date().toISOString() }).where(eq(emailThreads.id, p[0].threadId!)); return p[0].threadId; } }
  const tid = uuidv4(); await db.insert(emailThreads).values({ id: tid, subject: subj, account: "ahmad", latestDate: date, messageCount: 1, participants: JSON.stringify([fe, te].filter(Boolean)), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); return tid;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); const event = body.event || body.type || body.data?.event || ""; const msgData = body.data || body.message || body; const account = body.account || msgData.account || "ahmad";
    console.log("WEBHOOK EVENT:", event, "account:", account);
    if (!event) return NextResponse.json({ ok: true });
    if (event === "message.new" || event === "messageNew") {
      const messageId = msgData.id || msgData.messageId || ""; if (!messageId) return NextResponse.json({ ok: true });

      let content;
      // If inline content provided, use it directly
      if (msgData.from || msgData.subject) {
        // Fetch text content if msgData.text is an object with id (not the actual text)
        let textContent = "", htmlContent = "";
        if (typeof msgData.text === "string") {
          textContent = msgData.text;
        } else if (msgData.text?.id) {
          try {
            const tr = await fetch(`${V1_URL}/account/${encodeURIComponent(account)}/text/${encodeURIComponent(msgData.text.id)}`, { headers: { Authorization: `Bearer ${EE_TOKEN}` } });
            if (tr.ok) { const td = await tr.json(); textContent = td.plain || ""; htmlContent = td.html || ""; }
          } catch {}
        } else {
          textContent = msgData.bodyText || "";
        }
        if (!htmlContent && typeof msgData.html === "string") htmlContent = msgData.html;
        content = { text: textContent, html: htmlContent, from: typeof msgData.from === "object" ? msgData.from : { name: "", address: msgData.from || "" }, to: Array.isArray(msgData.to) ? msgData.to : typeof msgData.to === "string" ? [{ address: msgData.to }] : [], cc: msgData.cc || [], bcc: msgData.bcc || [], subject: msgData.subject || "", attachments: msgData.attachments || [], messageId: msgData.messageId || messageId, inReplyTo: msgData.inReplyTo || "", references: msgData.references || "", date: msgData.date || new Date().toISOString(), unseen: msgData.unseen !== false, headers: msgData.headers || {} };
      } else {
        content = await fetchEmailContent(account, messageId);
      }
      if (!content) return NextResponse.json({ ok: true });
      console.log("MSG NEW:", account, msgData.path, content.subject, "textType:", typeof content.text, "htmlType:", typeof content.html);
      const db = await getDb(); const emailId = uuidv4(); const now = new Date().toISOString();
      const existing = await db.select().from(emails).where(or(eq(emails.emailengineId, messageId), eq(emails.messageId, messageId))).limit(1);
      if (existing.length > 0) return NextResponse.json({ ok: true });
      const existingThreadId = content.threadId || msgData.threadId || null;
      const threadId = existingThreadId || await ensureThread(db, content.subject, content.inReplyTo, content.from.address, content.to?.[0]?.address || "", content.date) || uuidv4();
      const path = body.path || msgData.path || "INBOX";
      const dbFolder = path === "Sent" || path === "\\Sent" ? "SENT" : "INBOX";
      const direction = dbFolder === "SENT" ? "outbound" : "inbound";
      const toList = Array.isArray(content.to) ? content.to : (typeof content.to === "string" ? [{ address: content.to }] : []);
      const ccList = Array.isArray(content.cc) ? content.cc : [];
      const bccList = Array.isArray(content.bcc) ? content.bcc : [];
      await db.insert(emails).values({ id: emailId, messageId: content.messageId || "", emailengineId: messageId, account: account || "ahmad", fromName: content.from?.name || "", fromEmail: content.from?.address || "", toEmail: toList.map(t => t.address).join(", "), cc: ccList.map(c => c.address).join(", "), bcc: bccList.map(b => b.address).join(", "), subject: content.subject || "", bodyText: typeof content.text === "string" ? content.text : "", bodyHtml: typeof content.html === "string" ? content.html : "", folder: dbFolder, threadId: threadId || "", inReplyTo: content.inReplyTo || "", references: content.references || "", seen: !content.unseen, hasAttachments: !!(content.attachments?.length), direction: direction || "inbound", receivedAt: content.date || now, createdAt: now, updatedAt: now });
      for (const att of content.attachments) { const dl = await downloadAttachment(account, att.id, att.filename || "attachment"); await db.insert(emailAttachments).values({ id: uuidv4(), emailId, filename: att.filename || "", contentType: att.contentType || "", size: dl?.size || att.size || 0, emailengineAttachmentId: att.id, localPath: dl?.path || "", createdAt: now }); }
      await db.insert(auditLogs).values({ id: uuidv4(), action: "email_received", entityType: "email", entityId: emailId, details: `Email received from ${content.from.address}: ${content.subject}`, createdAt: now });
      const classification = detectAutoReply(content.subject, content.text, content.headers);
      if (classification !== "genuine") {
        for (const addr of content.to.map(t => t.address).filter(Boolean)) { await db.insert(bounceResponses).values({ id: uuidv4(), email: addr, type: classification, reason: content.subject, confidence: 0.9, received: now, status: "pending", createdAt: now }); await db.insert(auditLogs).values({ id: uuidv4(), action: `${classification}_detected`, entityType: classification, entityId: addr, details: `${classification === "bounce" ? "Bounce" : "Auto-reply"} detected from ${content.from.address}: ${content.subject}`, createdAt: now }); }
      }
      if (classification === "genuine" && dbFolder === "INBOX" && process.env.OPENROUTER_API_KEY) runAiAnalysis(emailId, content.subject, content.text, content.from.address).catch(() => {});
    }
    if (event === "message.bounced" || event === "messageBounce") { const db = await getDb(); const r = msgData.recipient || msgData.to?.[0]?.address || ""; if (r) { await db.insert(bounceResponses).values({ id: uuidv4(), email: r, type: "bounce", reason: msgData.response?.message || msgData.error || "Bounced", confidence: 1.0, received: new Date().toISOString(), status: "pending", createdAt: new Date().toISOString() }); await db.insert(auditLogs).values({ id: uuidv4(), action: "bounce_detected", entityType: "bounce", entityId: r, details: `Bounce detected for ${r}`, createdAt: new Date().toISOString() }); } }
    if (event === "message.sent" || event === "messageSent") {
      const db = await getDb();
      const qid = msgData.queueId || "";
      const tos = msgData.envelope?.to || [];
      const now = new Date().toISOString();
      if (qid && tos.length > 0) {
        await db.insert(sendingHistory).values({ id: uuidv4(), campaign: "Direct Send", recipients: tos.length, sent: 1, date: now, status: "sent", createdAt: now });
        await db.insert(auditLogs).values({ id: uuidv4(), action: "email_sent", entityType: "email", entityId: qid, details: `Email sent to ${tos.join(", ")}`, createdAt: now });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) { console.error("Webhook handler error:", err, (err as any)?.stack); return NextResponse.json({ ok: true }); }
}
