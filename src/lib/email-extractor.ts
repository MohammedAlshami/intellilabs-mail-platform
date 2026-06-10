import * as cheerio from "cheerio";

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

async function fetchPage(url: string): Promise<string | null> {
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

  // Fetch homepage
  const text = await fetchPage(urlHttps);
  if (!text) return [];

  const homeEmails = extractEmailsFromText(text);
  for (const e of homeEmails) allEmails.add(e);

  // Discover internal links
  try {
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

    // Fetch extra pages in parallel
    const extra = [...links].sort((a, b) => {
      const p = (s: string) => /contact|about|team|submit/i.test(s) ? 0 : /issues|article|page/i.test(s) ? 1 : 2;
      return p(a) - p(b);
    }).slice(0, 15);

    const results = await Promise.allSettled(extra.map(u => fetchPage(u)));
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const pageEmails = extractEmailsFromText(result.value);
      for (const e of pageEmails) allEmails.add(e);
    }
  } catch {}

  return [...allEmails].sort();
}
