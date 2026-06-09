import * as cheerio from "cheerio";

async function main() {
  const domain = "ijo-bs.com";
  const res = await fetch(`https://${domain}`, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();
  const $ = cheerio.load(html);

  // Find all links
  const links = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes(domain) || href.startsWith("/")) {
      links.add(href);
    }
  });
  console.log("Internal links found:", links.size);
  for (const l of [...links].slice(0, 30)) {
    console.log(" ", l);
  }
}
main();
