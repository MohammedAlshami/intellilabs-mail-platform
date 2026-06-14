#!/usr/bin/env python3
import sys, json, re
from urllib.parse import urlparse
from scrapy.crawler import CrawlerProcess
from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
SKIP_EXTS = ('.pdf','.jpg','.jpeg','.png','.gif','.svg','.webp','.mp4','.mp3','.zip','.tar','.gz','.xml','.json','.css','.js','.ico')

_all_emails: set = None

class EmailSpider(CrawlSpider):
    name = "email_spider"
    rules = (Rule(LinkExtractor(), callback="parse_item", follow=True),)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        global _all_emails
        if _all_emails is None:
            _all_emails = set()

    def parse_item(self, response):
        global _all_emails
        found = EMAIL_RE.findall(response.text)
        for e in found:
            _all_emails.add(e.lower())
        for link in response.css("a::attr(href)").getall():
            if any(link.endswith(ext) for ext in SKIP_EXTS) or link.startswith("mailto:"):
                continue
            yield response.follow(link, self.parse_item)


def main():
    global _all_emails
    if len(sys.argv) < 2:
        print(json.dumps({"error": "URL required", "emails": []}))
        sys.exit(1)

    url = sys.argv[1]
    domain = urlparse(url).netloc

    _all_emails = set()
    results = {"emails": []}

    try:
        settings = {
            "LOG_ENABLED": False,
            "ROBOTSTXT_OBEY": False,
            "DEPTH_LIMIT": 2,
            "CONCURRENT_REQUESTS": 32,
            "DOWNLOAD_DELAY": 0,
            "CLOSESPIDER_PAGECOUNT": 25,
            "CLOSESPIDER_TIMEOUT": 6,
        }
        process = CrawlerProcess(settings)
        process.crawl(EmailSpider, start_urls=[url], allowed_domains=[domain])
        process.start()
        results["emails"] = sorted(_all_emails)
    except Exception as e:
        results["error"] = str(e)

    print(json.dumps(results))

if __name__ == "__main__":
    main()
