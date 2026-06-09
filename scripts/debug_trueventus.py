import requests
from bs4 import BeautifulSoup

r = requests.get("https://www.trueventus.com", timeout=10, headers={"User-Agent": "Mozilla/5.0"})
print(f"Status: {r.status_code}")
print(f"Length: {len(r.text)}")
soup = BeautifulSoup(r.text, "html.parser")
if soup.title:
    print(f"Title: {soup.title.string}")

# Print all links
for a in soup.find_all("a", href=True):
    print(f"  {a['href'][:100]}")

# Find any emails
import re
emails = re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", r.text)
print(f"\nEmails found: {emails}")
