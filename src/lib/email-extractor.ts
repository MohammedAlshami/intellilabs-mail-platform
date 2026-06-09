import * as cheerio from "cheerio";

function extractEmailsFromText(text: string): Set<string> {
  const emails = new Set<string>();
  const cleaned = text.replace(/[;,()\[\]{}"\s]+/g, " ");
  const matches = cleaned.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g);
  if (!matches) return emails;
  for (const m of matches) {
    const e = m.toLowerCase();
    // Ensure it has exactly one @ and the local part and domain are valid
    if (e.split("@").length !== 2) continue;
    const [local, domain2] = e.split("@");
    // Filter out artifacts: local part must start with a letter or digit, not be too short
    if (!/^[a-z0-9]/.test(local) || local.length < 2) continue;
    // Domain must have a dot
    if (!domain2.includes(".")) continue;
    const tld = domain2.split(".").pop() || "";
    if (tld.length < 2 || tld.length > 6) continue;
    emails.add(e);
  }
  return emails;
}

async function fetchPage(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, iframe, noscript, meta, link, svg, path").remove();
  $("br").replaceWith(" ");
  $("td, th, li, p, div, h1, h2, h3, h4, h5, h6, span, a, label, strong, em, b, i, u").after(" ");
  return $("body").text().replace(/\s+/g, " ").trim();
}

export async function extractEmails(domain: string): Promise<string[]> {
  domain = domain.replace(/http[s]?:\/\//, "").split("/")[0];
  const rootDomain = domain.replace("www.", "");
  const urlHttps = `https://${rootDomain}`;
  const urlWww = `https://www.${rootDomain}`;
  const allEmails = new Set<string>();

  // Fetch homepage
  const html = await fetchPage(urlHttps);
  if (!html) return [];

  // Extract emails from homepage
  const text = extractText(html);
  const homeEmails = extractEmailsFromText(text);
  for (const e of homeEmails) allEmails.add(e);

  // Discover internal links
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $("a[href]").each((_, el) => {
    let href = $(el).attr("href") || "";
    // Normalize relative URLs
    if (href.startsWith("/")) href = urlHttps + href;
    else if (href.startsWith("./")) href = urlHttps + href.slice(1);
    else if (href.startsWith(rootDomain)) href = "https://" + href;
    else if (!href.startsWith("http")) href = urlHttps + "/" + href;
    // Only internal pages
    if (href.includes(rootDomain) && !href.includes("#") && !href.match(/\.(pdf|zip|doc|docx|png|jpg|jpeg|gif|css|js|ico|svg|webp|mp4|mp3)$/)) {
      links.add(href.split("?")[0].replace(/\/+$/, ""));
    }
  });

  // Prioritize contact, about, issues pages, then limit to 20
  const sortedLinks = [...links].sort((a, b) => {
    const priority = (s: string) => /contact|about|team|submit/i.test(s) ? 0 : /issues|article/i.test(s) ? 1 : 2;
    return priority(a) - priority(b);
  });
  const extraPages = sortedLinks.slice(0, 20);
  const results = await Promise.allSettled(extraPages.map(u => fetchPage(u, 6000)));

  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const t = extractText(result.value);
    const pageEmails = extractEmailsFromText(t);
    for (const e of pageEmails) allEmails.add(e);
  }

  return [...allEmails].sort();
}
