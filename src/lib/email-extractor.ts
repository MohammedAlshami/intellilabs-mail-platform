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

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function isBadEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!domain) return true;
  if (domain.includes("/") || domain.includes("\\")) return true;
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|json|xml|pdf|zip|tar|gz)$/i.test(domain)) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) return true;
  if (BAD_DOMAINS.has(domain)) return true;
  if (local.length <= 1) return true;
  if (!domain.includes(".")) return true;
  for (const prefix of BAD_PREFIXES) {
    if (local === prefix || local.startsWith(prefix + ".") || local.startsWith(prefix + "_")) {
      if (COMMON_GOOD_PATTERNS.some(p => lower.endsWith(p))) continue;
      return true;
    }
  }
  if (/^user\d+$/.test(local) || /^test\d*$/.test(local)) return true;
  return false;
}

async function crawlWithScrapy(domain: string): Promise<string[]> {
  try {
    const url = `https://${domain}`;
    const script = path.join(process.cwd(), "scripts", "crawl_emails.py");
    const output = execSync(`python3 "${script}" "${url}"`, {
      timeout: 10000,
      maxBuffer: 5 * 1024 * 1024,
    }).toString();
    const result = JSON.parse(output);
    if (result.error) return [];
    return result.emails || [];
  } catch {
    return [];
  }
}

export async function extractEmails(domain: string): Promise<string[]> {
  domain = domain.replace(/http[s]?:\/\//, "").split("/")[0];
  const found = await crawlWithScrapy(domain).catch(() => [] as string[]);
  const filtered = found.filter(e => !isBadEmail(e));
  return [...new Set(filtered)];
}
