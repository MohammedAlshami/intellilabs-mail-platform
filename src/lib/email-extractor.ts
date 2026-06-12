import { execSync } from "child_process";
import path from "path";
import { chromium } from "playwright-core";

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
const SKIP_EXTS = [".pdf",".jpg",".jpeg",".png",".gif",".svg",".webp",".mp4",".mp3",".zip",".tar",".gz",".xml",".json",".css",".js",".ico"];
const SKIP_PATHS = ["/cdn-cgi/", "/wp-content/", "/wp-includes/", "/css/", "/js/", "/img/", "/images/", "/assets/"];

function isBadEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!domain) return true;
  // Skip if domain contains path separators (it's a file path, not email)
  if (domain.includes("/") || domain.includes("\\")) return true;
  // Skip if it looks like a file name with image extension
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|json|xml|pdf|zip|tar|gz)$/i.test(domain)) return true;
  // Skip IP-based domains
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

function normalizeUrl(href: string, baseDomain: string): string | null {
  try {
    const u = new URL(href, `https://${baseDomain}`);
    if (u.hostname !== baseDomain && !u.hostname.endsWith("." + baseDomain)) return null;
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (SKIP_EXTS.some(e => u.pathname.toLowerCase().endsWith(e))) return null;
    if (SKIP_PATHS.some(p => u.pathname.includes(p))) return null;
    if (u.hash) u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch { return null; }
}

async function crawlWithPlaywright(domain: string, maxDepth: number = 3, concurrency: number = 8): Promise<string[]> {
  const baseUrl = `https://${domain}`;
  const allEmails = new Set<string>();
  const visited = new Set<string>();
  let queue: { url: string; depth: number }[] = [{ url: baseUrl, depth: 0 }];
  let activeCount = 0;

  const browser = await chromium.launch({ headless: true });

  async function processPage(item: { url: string; depth: number }): Promise<void> {
    if (visited.has(item.url)) return;
    visited.add(item.url);

    try {
      const page = await browser.newPage();
      await page.goto(item.url, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Extract emails from page text
      const text = await page.evaluate(() => document.body.innerText).catch(() => "");
      if (text) {
        const found = text.match(EMAIL_RE) || [];
        for (const e of found) allEmails.add(e.toLowerCase());
      }

      // If not at max depth, extract links for further crawling
      if (item.depth < maxDepth) {
        const links = await page.evaluate(() =>
          Array.from(document.querySelectorAll("a[href]")).map(a => (a as HTMLAnchorElement).href)
        ).catch(() => [] as string[]);

        const newUrls = new Set<string>();
        for (const link of links) {
          const normalized = normalizeUrl(link, domain);
          if (normalized && !visited.has(normalized) && normalized.startsWith(baseUrl)) {
            newUrls.add(normalized);
          }
        }
        // Only add links if they're within domain and not too deep
        for (const nu of newUrls) {
          const pathDepth = (nu.replace(baseUrl, "").match(/\//g) || []).length;
          if (pathDepth <= maxDepth) {
            queue.push({ url: nu, depth: item.depth + 1 });
          }
        }
      }

      await page.close();
    } catch {}
  }

  // Process queue with concurrency
  while (queue.length > 0 || activeCount > 0) {
    while (queue.length > 0 && activeCount < concurrency) {
      const item = queue.shift()!;
      activeCount++;
      processPage(item).finally(() => { activeCount--; });
    }
    if (activeCount >= concurrency || queue.length === 0) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  await browser.close();
  return [...allEmails].sort();
}

async function crawlWithScrapy(domain: string): Promise<string[]> {
  try {
    const url = `https://${domain}`;
    const script = path.join(process.cwd(), "scripts", "crawl_emails.py");
    const output = execSync(`python3 "${script}" "${url}"`, {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
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

  // Run both crawlers in parallel for best coverage
  const [playwrightEmails, scrapyEmails] = await Promise.all([
    crawlWithPlaywright(domain, 3, 8).catch(() => [] as string[]),
    crawlWithScrapy(domain).catch(() => [] as string[]),
  ]);

  // Merge and filter
  const all = [...new Set([...playwrightEmails, ...scrapyEmails])];
  const filtered = all.filter(e => !isBadEmail(e));
  const unique = [...new Set(filtered)];

  return unique;
}
