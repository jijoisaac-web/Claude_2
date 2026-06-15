"""
Debug script v3 — fetches screener.in's filter JS to find the real query API endpoint,
then probes it directly.
"""

import os, sys, json, re
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

BASE_URL   = "https://www.screener.in"
SESSION_ID = os.getenv("SCREENER_SESSION_ID", "").strip()
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

TEST_QUERY = "Market Capitalization > 100 AND Market Capitalization < 30000 AND Sales growth 3Years > 15 AND Profit growth 3Years > 20 AND Return on capital employed > 18 AND Debt to equity < 0.5 AND Promoter holding > 45"

session = requests.Session()
session.headers.update(HEADERS)
session.cookies.set("sessionid", SESSION_ID, domain="www.screener.in")

# ── Step 1: verify login ───────────────────────────────────────
print("[1] Verifying session ...")
r = session.get(BASE_URL + "/dash/", timeout=15, allow_redirects=True)
if "/login/" in r.url:
    print("    => NOT logged in. Refresh sessionid in .env")
    sys.exit(1)
csrf = session.cookies.get("csrftoken", "")
print(f"    => OK | CSRF: {csrf[:20]}...")

# ── Step 2: fetch filter.component JS ─────────────────────────
print("\n[2] Fetching filter.component JS ...")
js_url = "https://cdn-static.screener.in/js/filter.component.888b0801c31d.js"
rjs = session.get(js_url, timeout=15)
js_text = rjs.text
print(f"    Size: {len(js_text)} bytes")

# Save it
js_path = os.path.join(SCRIPT_DIR, "filter_component.js")
with open(js_path, "w", encoding="utf-8") as f:
    f.write(js_text)
print(f"    Saved: filter_component.js")

# Extract all URL patterns
print("\n[3] Extracting URL patterns from JS ...")
patterns = [
    r'url\s*[:=]\s*["\`]([^"\`]+)["\`]',
    r'fetch\s*\(\s*["\`]([^"\`]+)["\`]',
    r'axios\.[a-z]+\s*\(\s*["\`]([^"\`]+)["\`]',
    r'["\`](/[a-zA-Z0-9/_-]+/)["\`]',
    r'path\s*[:=]\s*["\`]([^"\`]+)["\`]',
    r'endpoint\s*[:=]\s*["\`]([^"\`]+)["\`]',
    r'api\s*[:=]\s*["\`]([^"\`]+)["\`]',
]
found_urls = set()
for pat in patterns:
    for m in re.findall(pat, js_text):
        if m.startswith("/") or "screener" in m:
            found_urls.add(m)

for u in sorted(found_urls):
    print(f"    {u}")

# Also search for keywords near query/screen
print("\n[4] Context around 'screen', 'query', 'filter' keywords ...")
for keyword in ["screen", "query", "filter", "fetch", "post", "ajax", "url"]:
    positions = [m.start() for m in re.finditer(keyword, js_text, re.IGNORECASE)]
    for pos in positions[:3]:
        snippet = js_text[max(0,pos-60):pos+120].replace("\n"," ")
        print(f"  [{keyword}@{pos}] ...{snippet}...")

# ── Step 3: also fetch screens listing to find links ──────────
print("\n[5] Checking /screens/ page for custom query entry point ...")
rs = session.get(BASE_URL + "/screens/", timeout=15)
soup = BeautifulSoup(rs.text, "html.parser")
print(f"    Title: {soup.find('title').get_text(strip=True) if soup.find('title') else 'N/A'}")

# Find all links on the page
links = soup.find_all("a", href=True)
print("    Links on /screens/ page:")
for a in links[:30]:
    href = a["href"]
    text = a.get_text(strip=True)[:40]
    if any(x in href for x in ["screen","query","filter","create","new","custom"]):
        print(f"      [{text}] -> {href}")

# Find any forms
for form in soup.find_all("form"):
    print(f"    Form: action={form.get('action')} method={form.get('method')}")

# Find any data attributes hinting at API
for el in soup.find_all(attrs={"data-url": True}):
    print(f"    data-url: {el['data-url']}")
for el in soup.find_all(attrs={"data-action": True}):
    print(f"    data-action: {el['data-action']}")

# ── Step 4: try to find a saved screen and fetch its results ──
print("\n[6] Looking for existing saved screens ...")
screen_links = soup.find_all("a", href=lambda h: h and re.match(r'/screens/\d+', h or ""))
print(f"    Found {len(screen_links)} saved screen links")
for a in screen_links[:5]:
    print(f"      {a.get_text(strip=True):40s} -> {a['href']}")

if screen_links:
    # Fetch first saved screen to understand response structure
    test_screen_url = BASE_URL + screen_links[0]["href"]
    print(f"\n[7] Fetching first saved screen: {test_screen_url}")
    rs2 = session.get(test_screen_url, timeout=15)
    soup2 = BeautifulSoup(rs2.text, "html.parser")
    print(f"    Title: {soup2.find('title').get_text(strip=True) if soup2.find('title') else 'N/A'}")
    tables = soup2.find_all("table")
    print(f"    Tables: {len(tables)}")
    for i, t in enumerate(tables):
        ths = [th.get_text(strip=True) for th in t.find_all("th")]
        tds = t.find_all("td")
        print(f"      table[{i}] headers={ths[:8]} rows={len(t.find_all('tr'))}")
    company_links = soup2.find_all("a", href=lambda h: h and "/company/" in (h or ""))
    print(f"    Company links: {len(company_links)}")
    for a in company_links[:5]:
        print(f"      {a.get_text(strip=True):30s} -> {a['href']}")

    # Save it
    with open(os.path.join(SCRIPT_DIR, "saved_screen.html"), "w", encoding="utf-8") as f:
        f.write(rs2.text)
    print("    Saved: saved_screen.html")

    # Check if there's a JSON/results endpoint for this screen
    screen_id = re.search(r'/screens/(\d+)', screen_links[0]["href"])
    if screen_id:
        sid = screen_id.group(1)
        for suffix in [f"/screens/{sid}/", f"/screens/{sid}/results/",
                       f"/api/screens/{sid}/", f"/screens/{sid}/export/"]:
            try:
                rx = session.get(BASE_URL + suffix, timeout=10,
                                 headers={**HEADERS, "Accept": "application/json"})
                print(f"\n    GET {suffix} => {rx.status_code} | {rx.headers.get('Content-Type','')[:50]}")
                try:
                    print("    JSON:", json.dumps(rx.json(), indent=2)[:500])
                except Exception:
                    s = BeautifulSoup(rx.text, "html.parser")
                    t2 = s.find("title")
                    print(f"    HTML title: {t2.get_text(strip=True) if t2 else 'N/A'}")
            except Exception as e:
                print(f"    {suffix} => ERROR: {e}")

print("\n[DONE]")
