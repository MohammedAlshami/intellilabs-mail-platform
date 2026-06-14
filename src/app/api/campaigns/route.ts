import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { campaigns, campaignRecipients } from "@/db/schema";
import { requirePermission } from "@/lib/api-auth";
import { sendMail, DEFAULT_ACCOUNT } from "@/lib/emailengine";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const ACCOUNT_EMAILS: Record<string, string> = {
  ahmad: "ahmad@demo-project-mail.xyz",
  siti: "siti@demo-project-mail.xyz",
  ryan: "ryan@demo-project-mail.xyz",
  nurul: "nurul@demo-project-mail.xyz",
  david: "david@demo-project-mail.xyz",
};

function findAccount(email: string): string | null {
  for (const [acct, e] of Object.entries(ACCOUNT_EMAILS)) {
    if (e === email) return acct;
  }
  return null;
}

export async function GET() {
  const db = await getDb();
  const all = await db.select().from(campaigns);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const { allowed, response } = await requirePermission(req, "campaigns", "create");
  if (!allowed) return response;
  const db = await getDb();
  const data = await req.json();
  const id = data.id || String(Date.now());

  let parsedEmails: string[] = [];
  if (data.recipientEmails) {
    parsedEmails = data.recipientEmails
      .split(/[\n,]+/)
      .map((e: string) => e.trim())
      .filter((e: string) => e.includes("@"));
  }

  // Determine sender account from logged-in user
  const userId = req.headers.get("x-user-id");
  let fromAccount = DEFAULT_ACCOUNT;
  if (userId) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user?.email) fromAccount = findAccount(user.email) || DEFAULT_ACCOUNT;
  }
  const fromEmail = ACCOUNT_EMAILS[fromAccount] || `${fromAccount}@demo-project-mail.xyz`;

  await db.insert(campaigns).values({
    id,
    name: data.name,
    subject: data.subject || data.name,
    objective: data.objective || "",
    emailContent: data.emailContent || "",
    recipients: parsedEmails.length || data.recipients || 0,
    sent: 0,
    bounced: 0,
    status: data.status || "draft",
    createdAt: new Date().toISOString(),
  });

  if (parsedEmails.length > 0) {
    const now = Date.now();
    await db.insert(campaignRecipients).values(
      parsedEmails.map((email: string, i: number) => ({
        id: `${id}-${i}-${now}`,
        campaignId: id,
        email,
        status: "sending",
        responded: false,
        sentiment: "",
        responseText: "",
        sentAt: "",
      }))
    );

    // Actually send emails if status is "sending"
    if (data.status === "sending") {
      const bodyText = data.emailContent ? data.emailContent.replace(/<[^>]*>/g, "").trim() : "";
      let sentCount = 0;
      let bounceCount = 0;

      for (const email of parsedEmails) {
        try {
          const sendParams: Record<string, unknown> = {
            from: { address: fromEmail },
            to: [{ address: email }],
            subject: data.subject || data.name,
            text: bodyText || " ",
          };
          await sendMail(sendParams as any, fromAccount);
          sentCount++;
          await db.update(campaignRecipients)
            .set({ status: "sent", sentAt: new Date().toISOString() })
            .where(eq(campaignRecipients.id, `${id}-${parsedEmails.indexOf(email)}-${now}`));
        } catch {
          bounceCount++;
          try {
            await db.update(campaignRecipients)
              .set({ status: "bounced" })
              .where(eq(campaignRecipients.id, `${id}-${parsedEmails.indexOf(email)}-${now}`));
          } catch {}
        }
      }

      await db.update(campaigns).set({
        sent: sentCount,
        bounced: bounceCount,
        status: "sent",
      }).where(eq(campaigns.id, id));
    }
  }

  return NextResponse.json({ id, recipientCount: parsedEmails.length });
}
