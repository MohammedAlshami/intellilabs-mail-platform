import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import dns from "dns";

const resolveMx = promisify(dns.resolveMx);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "10minutemail.com",
  "throwaway.email", "yopmail.com", "trashmail.com", "sharklasers.com",
  "burnermail.io", "fakeinbox.com", "mailnator.com", "getnada.com",
  "temp-mail.org", "minuteinbox.com", "mohmal.com", "inboxbear.com",
]);

interface VerifyResult {
  email: string;
  valid: boolean;
  reason: string;
}

function validateFormat(email: string): string | null {
  if (!EMAIL_RE.test(email)) return "Invalid email format";
  if (email.length > 254) return "Email too long";
  const [local] = email.split("@");
  if (local.length > 64) return "Local part too long";
  return null;
}

export async function POST(req: NextRequest) {
  const { emails } = await req.json();
  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: "Emails array is required" }, { status: 400 });
  }

  const results: VerifyResult[] = [];
  const batchSize = 10;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (email: string): Promise<VerifyResult> => {
        const formatErr = validateFormat(email);
        if (formatErr) return { email, valid: false, reason: formatErr };

        const domain = email.split("@")[1].toLowerCase();

        if (DISPOSABLE_DOMAINS.has(domain)) {
          return { email, valid: false, reason: "Disposable email domain" };
        }

        try {
          const mxRecords = await resolveMx(domain);
          if (!mxRecords || mxRecords.length === 0) {
            return { email, valid: false, reason: "Domain has no mail servers" };
          }
          return { email, valid: true, reason: "Valid" };
        } catch {
          return { email, valid: false, reason: "Domain does not exist or has no MX records" };
        }
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
      else results.push({ email: "unknown", valid: false, reason: "Verification error" });
    }
  }

  return NextResponse.json({ results, valid: results.filter(r => r.valid).length, invalid: results.filter(r => !r.valid).length });
}
