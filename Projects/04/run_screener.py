"""
Screener.in Multibagger Scan Runner
------------------------------------
Uses your browser session cookie (works with Google/Gmail login).

Correct API (discovered from HTML inspection):
  GET /screen/raw/?query=...&sort=...&order=desc&limit=50&page=N

Table structure: <table class="data-table"> inside <div data-page-results>
Headers: <th> elements in the FIRST <tr> of <tbody> (no separate <thead>)
Pagination: <div class="pagination"> with href="?page=N"

Requirements:  pip install requests beautifulsoup4 python-dotenv lxml
Setup:         copy .env.example -> .env, set SCREENER_SESSION_ID
Usage:         python run_screener.py
"""

import os, sys, re, time
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# ── Config ────────────────────────────────────────────────────────────────────

load_dotenv()

BASE_URL       = "https://www.screener.in"
SCREEN_RAW_URL = f"{BASE_URL}/screen/raw/"
VERIFY_URL     = f"{BASE_URL}/dash/"

SESSION_ID     = os.getenv("SCREENER_SESSION_ID", "").strip()

TIMESTAMP      = datetime.now().strftime("%Y%m%d_%H%M%S")
DISPLAY_TS     = datetime.now().strftime("%d %b %Y, %I:%M %p")
SCRIPT_DIR     = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR    = os.path.join(SCRIPT_DIR, "Reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

MAX_PAGES = 10   # 50 results/page → up to 500 results per scan

# ── Scan definitions ──────────────────────────────────────────────────────────

SCANS = [
    {
        "id": "scan1",
        "title": "Scan 1: Emerging Multibagger",
        "subtitle": "My Preferred Scan",
        "color": "#4f46e5",
        "query": (
            "Market Capitalization > 100 AND "
            "Market Capitalization < 30000 AND "
            "Sales growth 3Years > 15 AND "
            "Profit growth 3Years > 20 AND "
            "Return on capital employed > 18 AND "
            "Debt to equity < 0.5 AND "
            "Current price > 0.8 * High price all time AND "
            "Promoter holding > 45 AND "
            "OPM > 12 AND "
            "Interest Coverage Ratio > 5"
        ),
    },
    {
        "id": "scan2",
        "title": "Scan 2: Order Book Multibagger",
        "subtitle": "Defense · Railways · EPC · EMS · Capital Goods",
        "color": "#0891b2",
        "query": (
            "Sales growth 3Years > 15 AND "
            "Profit growth 3Years > 20 AND "
            "Return on capital employed > 18 AND "
            "Debt to equity < 0.7 AND "
            "Market Capitalization < 50000 AND "
            "Current price > DMA 200 AND "
            "Promoter holding > 50"
        ),
    },
    {
        "id": "scan3",
        "title": "Scan 3: Institutional Accumulation",
        "subtitle": "Follow the Smart Money",
        "color": "#059669",
        "query": (
            "Market Capitalization > 500 AND "
            "Market Capitalization < 50000 AND "
            "Sales growth 3Years > 15 AND "
            "Profit growth 3Years > 20 AND "
            "Return on equity > 15 AND "
            "Debt to equity < 0.5 AND "
            "Current price > DMA 200"
        ),
    },
    {
        "id": "scan4",
        "title": "Scan 4: Hidden Small-Cap Compounders",
        "subtitle": "Future Mid-Caps in Disguise",
        "color": "#d97706",
        "query": (
            "Market Capitalization > 100 AND "
            "Market Capitalization < 10000 AND "
            "Return on capital employed > 20 AND "
            "Sales growth 5Years > 15 AND "
            "Profit growth 5Years > 15 AND "
            "Debt to equity < 0.3 AND "
            "Promoter holding > 50"
        ),
    },
    {
        "id": "scan5",
        "title": "Scan 5: Early Momentum + Fundamentals",
        "subtitle": "Where Price Action Meets Quality",
        "color": "#dc2626",
        "query": (
            "Current price > DMA 50 AND "
            "Current price > DMA 200 AND "
            "RSI > 55 AND "
            "Sales growth 3Years > 15 AND "
            "Profit growth 3Years > 20 AND "
            "Return on capital employed > 18 AND "
            "Debt to equity < 0.5"
        ),
    },
]

# ── Session init ──────────────────────────────────────────────────────────────

def init_session():
    if not SESSION_ID:
        print("\n[ERROR] SCREENER_SESSION_ID not set in .env")
        print("  1. Log in to screener.in in Chrome")
        print("  2. F12 -> Application -> Cookies -> copy 'sessionid' value")
        print("  3. Paste into .env as SCREENER_SESSION_ID=<value>")
        sys.exit(1)

    session = requests.Session()
    session.headers.update(HEADERS)
    session.cookies.set("sessionid", SESSION_ID, domain="www.screener.in")

    print("[*] Verifying session ...")
    r = session.get(VERIFY_URL, timeout=15, allow_redirects=True)
    if "/login/" in r.url:
        print("[ERROR] Session expired. Get a fresh sessionid from your browser.")
        sys.exit(1)

    print("[OK] Logged in successfully.")
    return session

# ── Query runner ──────────────────────────────────────────────────────────────

def parse_results_page(soup):
    """
    Parse one page of /screen/raw/ results.
    Headers are <th> in the FIRST <tr> of <tbody> (no separate <thead>).
    Data rows are subsequent <tr> elements containing <td>.
    Returns (headers, rows).
    """
    container = soup.find("div", attrs={"data-page-results": True})
    table = container.find("table", class_="data-table") if container else None
    if not table:
        table = soup.find("table", class_="data-table")
    if not table:
        return [], []

    tbody = table.find("tbody")
    if not tbody:
        return [], []

    all_trs = tbody.find_all("tr")
    if not all_trs:
        return [], []

    # First row contains <th> — these are the column headers
    header_row = all_trs[0]
    headers = []
    for th in header_row.find_all("th"):
        # Use data-tooltip if available (full name), else text
        tooltip = th.get("data-tooltip", "").strip()
        text    = th.get_text(strip=True)
        headers.append(tooltip if tooltip else text)

    # Remaining rows are data
    rows = []
    for tr in all_trs[1:]:
        cells = tr.find_all("td")
        if not cells:
            continue
        row = {}
        for i, td in enumerate(cells):
            key = headers[i] if i < len(headers) else f"col_{i}"
            a = td.find("a", href=lambda h: h and "/company/" in h)
            if a:
                row[key]      = a.get_text(strip=True)
                row["__url__"] = BASE_URL + a["href"]
            else:
                row[key] = td.get_text(strip=True)
        rows.append(row)

    return headers, rows


def get_total_results(soup):
    """Extract total result count from data-page-info div."""
    info = soup.find(attrs={"data-page-info": True})
    if info:
        m = re.search(r"(\d+)\s+results", info.get_text())
        if m:
            return int(m.group(1))
    return None


def has_next_page(soup):
    """Check if there is a 'Next' pagination link."""
    pag = soup.find("div", class_="pagination")
    if not pag:
        return False
    return bool(pag.find("a", string=re.compile(r"Next", re.I)))


def run_query(session, scan):
    """
    GET /screen/raw/ with the query, paginate through all result pages.
    Returns (headers, all_rows, error_msg).
    """
    print(f"[*] {scan['title']} ...")

    all_headers = []
    all_rows    = []
    total       = None

    for page in range(1, MAX_PAGES + 1):
        params = {
            "query": scan["query"],
            "sort":  "Market Capitalization",
            "order": "desc",
            "limit": "50",
            "page":  str(page),
        }
        resp = session.get(
            SCREEN_RAW_URL,
            params=params,
            headers={**HEADERS, "Referer": BASE_URL + "/screens/"},
            timeout=30,
        )

        if resp.status_code != 200:
            return [], [], f"HTTP {resp.status_code}"

        soup = BeautifulSoup(resp.text, "html.parser")

        # Check for query error
        err_el = soup.find(class_="errorlist") or soup.find(class_="error-msg")
        if err_el:
            msg = err_el.get_text(strip=True)
            print(f"    [WARN] {msg[:120]}")
            return [], [], msg

        if page == 1:
            total = get_total_results(soup)
            if total is not None:
                pages_needed = min(MAX_PAGES, -(-total // 50))  # ceil div
                print(f"    Total: {total} companies across {pages_needed} page(s)")

        hdrs, rows = parse_results_page(soup)

        if not all_headers and hdrs:
            all_headers = hdrs
        if not rows:
            print(f"    Page {page}: 0 rows — stopping.")
            break

        all_rows.extend(rows)
        print(f"    Page {page}: {len(rows)} rows (running total: {len(all_rows)})")

        if not has_next_page(soup):
            break

        time.sleep(1.2)   # polite delay

    print(f"    [OK] {len(all_rows)} companies fetched.")
    time.sleep(1.5)
    return all_headers, all_rows, ""

# ── HTML report builder ───────────────────────────────────────────────────────

CSS = """
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
     background:#f8fafc;color:#1e293b;line-height:1.6}
header{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);
       color:#fff;padding:2rem 2.5rem}
header h1{font-size:1.8rem;font-weight:700}
header p{color:#94a3b8;margin-top:.3rem;font-size:.9rem}
.timestamp{display:inline-block;background:rgba(255,255,255,.1);
           border-radius:999px;padding:.2rem .8rem;
           font-size:.8rem;color:#e2e8f0;margin-top:.6rem}
nav{background:#fff;border-bottom:1px solid #e2e8f0;
    padding:.75rem 2.5rem;display:flex;gap:1.5rem;flex-wrap:wrap;
    position:sticky;top:0;z-index:10}
nav a{text-decoration:none;font-size:.82rem;font-weight:600;
      padding-bottom:2px;transition:opacity .2s}
nav a:hover{opacity:.7}
main{max-width:1300px;margin:0 auto;padding:2rem 1.5rem;
     display:flex;flex-direction:column;gap:2rem}
.scan-card{background:#fff;border-radius:12px;
           box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden}
.card-header{padding:1.1rem 1.5rem;background:#fafafa;
             border-bottom:1px solid #f1f5f9;
             display:flex;align-items:center;
             justify-content:space-between;gap:1rem}
.card-header h2{font-size:1.05rem;font-weight:700}
.badge{display:inline-block;border-radius:999px;padding:.12rem .65rem;
       font-size:.73rem;font-weight:600;margin-top:.3rem;
       background:#f1f5f9;color:#475569}
.count-badge{background:#e0e7ff;color:#3730a3;border-radius:999px;
             padding:.2rem .8rem;font-size:.8rem;font-weight:700;
             white-space:nowrap}
.card-body{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.83rem}
thead tr{background:#f1f5f9}
th{text-align:left;padding:.55rem .85rem;font-size:.73rem;
   text-transform:uppercase;letter-spacing:.04em;color:#64748b;
   white-space:nowrap}
td{padding:.48rem .85rem;border-bottom:1px solid #f1f5f9;white-space:nowrap}
td.sno{color:#94a3b8;font-size:.78rem;text-align:center}
td.company{font-weight:600}
td.company a{color:#1e293b;text-decoration:none}
td.company a:hover{color:#4f46e5;text-decoration:underline}
td.num{text-align:right;font-variant-numeric:tabular-nums}
tbody tr:hover{background:#f8fafc}
tbody tr:last-child td{border-bottom:none}
.no-results{padding:2rem;text-align:center;color:#94a3b8;font-size:.9rem}
.error-card{padding:1.25rem 1.5rem;color:#b91c1c;font-size:.88rem}
.query-block{margin:0 1.5rem 1.5rem;background:#0f172a;
             border-radius:8px;padding:.9rem 1.2rem;position:relative}
.ql{font-size:.7rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.08em;color:#64748b;margin-bottom:.35rem}
.query-block code{display:block;color:#7dd3fc;font-size:.79rem;
                  font-family:'SFMono-Regular',Consolas,monospace;
                  white-space:pre-wrap;word-break:break-word;
                  line-height:1.7;padding-right:4.5rem}
.copy-btn{position:absolute;top:.9rem;right:.9rem;background:#334155;
          color:#e2e8f0;border:none;border-radius:6px;
          padding:.25rem .7rem;font-size:.73rem;cursor:pointer}
.copy-btn:hover{background:#475569}
.copy-btn.copied{background:#15803d}
footer{text-align:center;padding:2rem;font-size:.78rem;color:#94a3b8}
"""

JS = """
function copyQuery(id,btn){
  navigator.clipboard.writeText(document.getElementById(id).textContent).then(function(){
    btn.textContent='Copied!';btn.classList.add('copied');
    setTimeout(function(){btn.textContent='Copy';btn.classList.remove('copied');},2000);
  });
}
"""

# Columns that should be right-aligned (numeric)
NUMERIC_COLS = {
    "Current Price", "CMP", "Market Capitalization", "Mar Cap",
    "Div Yld", "Dividend yield", "ROCE", "Return on capital employed",
    "Sales Var 3Yrs", "Sales growth 3Years", "Profit Var 3Yrs",
    "Profit growth 3Years", "Return on equity", "Debt to Equity",
    "Promoter Holding", "OPM", "RSI", "P/E",
}


def build_table_html(headers, rows):
    if not rows:
        return "<div class='no-results'>No companies matched this criteria.</div>"

    display_headers = [h for h in headers if not h.startswith("__")]
    head = "".join(
        "<th>" + h + "</th>" for h in display_headers
    )

    body = ""
    for row in rows:
        cells = ""
        for h in display_headers:
            val = str(row.get(h, ""))
            if h in ("S.No.", "S.No"):
                cells += "<td class='sno'>" + val + "</td>"
            elif h == "Name" and row.get("__url__"):
                cells += "<td class='company'><a href='" + row["__url__"] + "' target='_blank'>" + val + "</a></td>"
            elif any(nc in h for nc in NUMERIC_COLS):
                cells += "<td class='num'>" + val + "</td>"
            else:
                cells += "<td>" + val + "</td>"
        body += "<tr>" + cells + "</tr>"

    return (
        "<div class='card-body'>"
        "<table><thead><tr>" + head + "</tr></thead>"
        "<tbody>" + body + "</tbody></table>"
        "</div>"
    )


def build_scan_section(scan, headers, rows, error):
    qid = "q" + scan["id"]
    count = str(len(rows)) + " companies"

    content = ("<div class='error-card'>Error: " + error + "</div>") if error \
              else build_table_html(headers, rows)

    return (
        "<section class='scan-card' id='" + scan["id"] + "'>"
        "<div class='card-header' style='border-left:5px solid " + scan["color"] + "'>"
        "<div>"
        "<h2 style='color:" + scan["color"] + "'>" + scan["title"] + "</h2>"
        "<span class='badge'>" + scan["subtitle"] + "</span>"
        "</div>"
        "<span class='count-badge'>" + count + "</span>"
        "</div>"
        + content +
        "<div class='query-block'>"
        "<div class='ql'>Screener.in Query</div>"
        "<code id='" + qid + "'>" + scan["query"] + "</code>"
        "<button class='copy-btn' onclick=\"copyQuery('" + qid + "',this)\">Copy</button>"
        "</div>"
        "</section>"
    )


def build_html(results):
    total = sum(len(v[1]) for v in results.values())
    nav = "".join(
        "<a href='#" + s["id"] + "' style='border-bottom:2px solid "
        + s["color"] + ";color:" + s["color"] + "'>"
        + s["title"].split(":")[0] + "</a>"
        for s in SCANS
    )
    sections = "".join(
        build_scan_section(s, *results[s["id"]]) for s in SCANS
    )
    return (
        "<!DOCTYPE html><html lang='en'><head>"
        "<meta charset='UTF-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1.0'>"
        "<title>Screener Results " + DISPLAY_TS + "</title>"
        "<style>" + CSS + "</style>"
        "</head><body>"
        "<header>"
        "<h1>Multibagger Scan Results</h1>"
        "<p>Live results from screener.in &mdash; "
        + str(total) + " total companies across 5 scans</p>"
        "<span class='timestamp'>Generated: " + DISPLAY_TS + "</span>"
        "</header>"
        "<nav>" + nav + "</nav>"
        "<main>" + sections + "</main>"
        "<footer>Data from screener.in &middot; "
        + DISPLAY_TS + " &middot; Not financial advice.</footer>"
        "<script>" + JS + "</script>"
        "</body></html>"
    )

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Screener.in Multibagger Scan Runner")
    print("=" * 60)

    session = init_session()
    results = {}

    for scan in SCANS:
        headers, rows, error = run_query(session, scan)
        results[scan["id"]] = (headers, rows, error)

    print("\n[*] Building HTML report ...")
    html     = build_html(results)
    filename = "04_screener_results_" + TIMESTAMP + ".html"
    out_path = os.path.join(REPORTS_DIR, filename)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(html)

    print("[OK] Report saved: " + out_path)
    print()
    total = sum(len(results[s["id"]][1]) for s in SCANS)
    print("Summary:")
    for scan in SCANS:
        n   = len(results[scan["id"]][1])
        bar = "#" * min(n, 40)
        print(f"  {scan['title']:<45} {n:>4}  {bar}")
    print(f"  {'TOTAL':<45} {total:>4}")
    print()


if __name__ == "__main__":
    main()
