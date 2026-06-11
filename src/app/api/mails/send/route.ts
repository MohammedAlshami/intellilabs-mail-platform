import { NextRequest, NextResponse } from "next/server"; import { sendMail, DEFAULT_ACCOUNT } from "@/lib/emailengine";
const ACCOUNT_EMAILS: Record<string, string> = { ahmad: "ahmad@demo-project-mail.xyz", siti: "siti@demo-project-mail.xyz", ryan: "ryan@demo-project-mail.xyz", nurul: "nurul@demo-project-mail.xyz", david: "david@demo-project-mail.xyz" };
function getAccountEmail(account?: string): string { if (account && ACCOUNT_EMAILS[account]) return ACCOUNT_EMAILS[account]; return ACCOUNT_EMAILS[DEFAULT_ACCOUNT] || `${DEFAULT_ACCOUNT}@demo-project-mail.xyz`; }
export async function POST(req: NextRequest) {
  const { to, subject, text, attachments } = await req.json();
  if (!to || !subject || !text) return NextResponse.json({ error: "Missing required fields: to, subject, text" }, { status: 400 });
  try {
    const sendParams: Record<string, unknown> = { from: { address: getAccountEmail() }, to: [{ address: to }], subject, text };
    if (attachments?.length > 0) sendParams.attachments = attachments.map((a: { name?: string; contentType?: string; content: string }) => ({ filename: a.name, contentType: a.contentType, content: a.content }));
    const result = await sendMail(sendParams as any);
    return NextResponse.json({ messageId: result.queueId, queueId: result.queueId });
  } catch (err) { console.error("Send error:", err); return NextResponse.json({ error: "Failed to send email" }, { status: 500 }); }
}
