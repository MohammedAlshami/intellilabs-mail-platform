import * as cheerio from "cheerio";
import { chromium, type Browser } from "playwright";

function extractEmailsFromText(text: string): Set<string> {
  const emails = new Set<string>();
  const cleaned = text.replace(/[;,()\[\]{}"\s]+/g, " ");
  const matches = cleaned.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g);
  if (!matches) return emails;
  for (const m of matches) {
    const e = m.toLowerCase();
    if (e.split("@").length !== 2) continue;
    const [local, domain2] = e.split("@");
    if (!/^[a-z0-9]/.test(local) || local.length < 2) continue;
    if (!domain2.includes(".")) continue;
    const tld = domain2.split(".").pop() || "";
    if (tld.length < 2 || tld.length > 6) continue;
    emails.add(e);
  }
  return emails;
}

async function fetchPageStatic(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, iframe, noscript, meta, link").remove();
    $("br").replaceWith(" ");
    $("td, th, li, p, div, h1, h2, h3, h4, h5, h6, span, a").after(" ");
    return $("body").text().replace(/\s+/g, " ").trim();
  } catch {
    return null;
  }
}

export async function extractEmails(domain: string): Promise<string[]> {
  domain = domain.replace(/http[s]?:\/\//, "").split("/")[0];
  const rootDomain = domain.replace("www.", "");
  const urlHttps = `https://${rootDomain}`;
  const allEmails = new Set<string>();
  let browser: Browser | null = null;

  async function fetchPageWithFallback(url: string): Promise<string | null> {
    const staticText = await fetchPageStatic(url);
    if (staticText && staticText.length > 200) return staticText;
    try {
      if (!browser) browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);
      const text = await page.innerText("body");
      await page.close();
      return text.replace(/\s+/g, " ").trim();
    } catch {
      return null;
    }
  }

  try {
    // Fetch homepage
    const text = await fetchPageWithFallback(urlHttps);
    if (!text) return [];

    const homeEmails = extractEmailsFromText(text);
    for (const e of homeEmails) allEmails.add(e);

    // Discover internal links from homepage HTML
    const res = await fetch(urlHttps, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const links = new Set<string>();
    $("a[href]").each((_, el) => {
      let href = $(el).attr("href") || "";
      if (href.startsWith("/")) href = urlHttps + href;
      else if (href.startsWith("./")) href = urlHttps + href.slice(1);
      else if (href.startsWith(rootDomain)) href = "https://" + href;
      else if (!href.startsWith("http")) href = urlHttps + "/" + href;
      if (href.includes(rootDomain) && !href.includes("#") && !href.match(/\.(pdf|zip|doc|docx|png|jpg|jpeg|gif|css|js|ico|svg|webp|mp4|mp3)$/)) {
        links.add(href.split("?")[0].replace(/\/+$/, ""));
      }
    });

    const sorted = [...links].sort((a, b) => {
      const p = (s: string) => /contact|about|team|submit/i.test(s) ? 0 : /issues|article|page/i.test(s) ? 1 : 2;
      return p(a) - p(b);
    });
    const extra = sorted.slice(0, 15);

    const results = await Promise.allSettled(extra.map(u => fetchPageWithFallback(u)));
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const pageEmails = extractEmailsFromText(result.value);
      for (const e of pageEmails) allEmails.add(e);
    }
  } finally {
    if (browser) await (browser as Browser).close();
  }



  return [...allEmails].sort();
}
