import { execSync } from "child_process";
import path from "path";

const BAD_DOMAINS = new Set([
  "example.com", "example.org", "example.net", "test.com", "domain.com",
  "yourcompany.com", "yourdomain.com", "mycompany.com", "company.com",
  "email.com", "mail.com", "tempmail.com", "throwaway.com",
  "yopmail.com", "guerrillamail.com", "sharklasers.com", "mailinator.com",
]);

const BAD_PREFIXES = [
  "john", "jane", "joe", "test", "user", "admin", "info", "contact",
  "sales", "support", "help", "webmaster", "postmaster", "noreply",
  "no-reply", "donotreply", "newsletter", "subscribe", "unsubscribe",
  "spam", "mailer-daemon", "bounce", "example", "demo", "sample",
  "yourname", "name", "firstname", "lastname", "recipient",
];

const COMMON_GOOD_PATTERNS = [
  "@gmail.com", "@yahoo.com", "@hotmail.com", "@outlook.com",
  "@icloud.com", "@protonmail.com", "@aol.com",
];

function isBadEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!domain) return true;

  // Skip example/test domains
  if (BAD_DOMAINS.has(domain)) return true;

  // Skip single char local parts (a@, b@, etc.)
  if (local.length <= 1) return true;

  // Skip emails with no dots in domain (localhost, etc.)
  if (!domain.includes(".")) return true;

  // Skip common bad prefixes
  for (const prefix of BAD_PREFIXES) {
    if (local === prefix || local.startsWith(prefix + ".") || local.startsWith(prefix + "_")) {
      // But allow if it's a common email provider (like john@gmail.com could be real)
      if (COMMON_GOOD_PATTERNS.some(p => lower.endsWith(p))) continue;
      return true;
    }
  }

  // Skip if local part looks like a placeholder (all numbers, or "user" + numbers)
  if (/^user\d+$/.test(local) || /^test\d*$/.test(local)) return true;

  // Skip emails with IP address as domain
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) return true;

  return false;
}

export async function extractEmails(domain: string): Promise<string[]> {
  domain = domain.replace(/http[s]?:\/\//, "").split("/")[0];
  const url = `https://${domain}`;

  try {
    const script = path.join(process.cwd(), "scripts", "crawl_emails.py");
    const output = execSync(`python3 "${script}" "${url}"`, {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    }).toString();

    const result = JSON.parse(output);
    if (result.error) {
      console.error("Email crawler error:", result.error);
      return [];
    }
    const allEmails: string[] = result.emails || [];
    const filtered = allEmails.filter(e => !isBadEmail(e));
    const unique = [...new Set(filtered)];
    return unique;
  } catch (e: any) {
    console.error("Email crawler failed:", e.message);
    return [];
  }
}
