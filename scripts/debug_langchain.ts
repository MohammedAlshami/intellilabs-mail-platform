import * as cheerio from "cheerio";

const res = await fetch("https://www.langchain.com", {
  headers: { "User-Agent": "Mozilla/5.0" },
});
const html = await res.text();
const $ = cheerio.load(html);
$("script, style, nav, footer, header, iframe, noscript, meta, link, svg").remove();
$("br").replaceWith(" ");
$("td, th, li, p, div, h1, h2, h3, h4, h5, h6, span, a").after(" ");
const text = $("body").text().replace(/\s+/g, " ").trim();
console.log("cheerio text length:", text.length);
console.log("Title:", $("title").text());
const desc = $("meta[name='description']").attr("content") || "none";
console.log("Meta desc:", desc.slice(0, 200));
console.log("First 500 chars:", text.slice(0, 500));
