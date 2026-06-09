"""
Fast Email Extractor (~1s target)
Usage: python email_extractor.py <domain>
"""
import sys, re, json, time
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from bs4 import BeautifulSoup

COMMON_ALIASES = ["info","support","admin","sales","contact","hello","help","careers","jobs","hr","marketing","press","media","billing","finance","accounts","legal","editor","webmaster","feedback","service","team","office","mail","business","partner","community","newsletter","customer"]

# Common pages to try in parallel
COMMON_PATHS = ["", "contact", "contact-us", "about", "about-us", "team", "careers", "editorial-board", "submissions"]

def fetch_url(url):
    try:
        r = requests.get(url, timeout=4, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code == 200:
            return (url, r.text)
    except:
        pass
    return (url, None)

def extract(domain, max_pages=10):
    domain = domain.replace("http://","").replace("https://","").split("/")[0]
    base = f"https://{domain}" if domain.startswith("www.") else f"https://www.{domain}"
    alt = f"https://{domain[4:]}" if domain.startswith("www.") else f"https://www.{domain}"

    email_re = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
    emails = set()
    all_texts = []

    # Fetch all common pages + alternate domain in parallel
    urls = set()
    for path in COMMON_PATHS:
        urls.add(f"{base}/{path}")
        urls.add(f"{alt}/{path}")
    urls = {u.rstrip("/") for u in urls}

    with ThreadPoolExecutor(max_workers=15) as pool:
        futures = {pool.submit(fetch_url, u): u for u in urls}
        for future in as_completed(futures):
            _, text = future.result()
            if text:
                all_texts.append(text)

    # Extract emails from all fetched pages
    for text in all_texts:
        for m in email_re.finditer(text):
            e = m.group()
            if not any(e.endswith(ext) for ext in [".png",".jpg",".gif",".css",".js",".ico",".svg",".webp"]):
                if e.count("@") == 1 and not e.startswith("//"):
                    emails.add(e.lower())

    # Discover more pages from homepage and fetch in 2nd pass
    if all_texts:
        soup = BeautifulSoup(all_texts[0], "html.parser")
        more_urls = set()
        for a in soup.find_all("a", href=True):
            full = urljoin(base, a["href"])
            p = urlparse(full)
            if (domain.replace("www.","") in p.netloc or "www." + domain.replace("www.","") in p.netloc) and "#" not in full:
                more_urls.add(full.split("?")[0])
        # Fetch additional pages
        more_urls = list(more_urls - urls)[:max_pages]
        if more_urls:
            with ThreadPoolExecutor(max_workers=10) as pool:
                for _, text in pool.map(fetch_url, more_urls):
                    if text:
                        for m in email_re.finditer(text):
                            e = m.group()
                            if not any(e.endswith(ext) for ext in [".png",".jpg",".gif",".css",".js",".ico",".svg",".webp"]):
                                if e.count("@") == 1 and not e.startswith("//"):
                                    emails.add(e.lower())

    domain_part = domain.replace("www.", "")
    suggested = sorted(set(f"{a}@{domain_part}" for a in COMMON_ALIASES) - emails)
    result = {"emails": sorted(emails), "count": len(emails), "suggested": suggested}
    print(json.dumps(result))
    return result

if __name__ == "__main__":
    extract(sys.argv[1] if len(sys.argv) > 1 else "trueventus.com")
