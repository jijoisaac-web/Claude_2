"""
Swing / Short-to-Medium Term Stock Screener
--------------------------------------------
5 scans for 2-12 week swing trades on Indian equities via screener.in.

Scan 1 – Breakout Watch        : Near 52W high, RSI 60-73, quality filter
Scan 2 – Dip-Buy at Support    : Quality stocks bouncing off DMA 200
Scan 3 – Momentum Continuation : Above 50+DMA 200, earnings acceleration
Scan 4 – Small Cap Swing       : High-ROCE small caps above DMA 200
Scan 5 – High-ROCE Leaders     : ROCE>25%, near-zero debt, in uptrend

Setup : copy .env.example -> .env, set SCREENER_SESSION_ID
Run   : python swing_screener.py
"""

import os, sys, re, time
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
load_dotenv()

BASE_URL       = "https://www.screener.in"
SCREEN_RAW_URL = BASE_URL + "/screen/raw/"
VERIFY_URL     = BASE_URL + "/dash/"
SESSION_ID     = os.getenv("SCREENER_SESSION_ID", "").strip()
TIMESTAMP      = datetime.now().strftime("%Y%m%d_%H%M%S")
DISPLAY_TS     = datetime.now().strftime("%d %b %Y, %I:%M %p")
SCRIPT_DIR     = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR    = os.path.join(SCRIPT_DIR, "Reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

HTTP_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/124.0.0.0 Safari/537.36"),
    "Accept-Language": "en-US,en;q=0.9",
}

MAX_PAGES     = 5
TOP_N         = 25
STOP_PCT      = 7

# ---------------------------------------------------------------------------
SCANS = [
    {
        "id":      "sw1",
        "title":   "Scan 1: Breakout Watch",
        "sub":     "Near 52-week high · RSI 60-73 · Quality filter",
        "signal":  "BREAKOUT",
        "color":   "#7c3aed",
        "sort":    "Market Capitalization",
        "thesis":  ("Stocks testing or breaking 52-week highs with RSI in the "
                    "60-73 momentum zone (not yet overbought). Quality filters "
                    "ensure the breakout is backed by business strength."),
        "query":   ("Market Capitalization > 500 AND "
                    "Current price > High price * 0.94 AND "
                    "Current price > DMA 200 AND "
                    "RSI > 60 AND RSI < 73 AND "
                    "Return on capital employed > 15 AND "
                    "Debt to equity < 1"),
    },
    {
        "id":      "sw2",
        "title":   "Scan 2: Dip-Buy at Support",
        "sub":     "Bouncing off DMA 200 · RSI recovery · High quality",
        "signal":  "DIP-BUY",
        "color":   "#0284c7",
        "sort":    "Market Capitalization",
        "thesis":  ("High-quality companies pulled back to DMA 200 support and "
                    "showing early RSI recovery. Best entry for medium-term holds "
                    "with defined risk at the DMA 200."),
        "query":   ("Market Capitalization > 500 AND "
                    "Current price > 0.93 * DMA 200 AND "
                    "Current price < 1.06 * DMA 200 AND "
                    "RSI > 38 AND RSI < 58 AND "
                    "Return on capital employed > 18 AND "
                    "Debt to equity < 0.5 AND "
                    "Profit growth 3Years > 15"),
    },
    {
        "id":      "sw3",
        "title":   "Scan 3: Momentum Continuation",
        "sub":     "Above 50 & DMA 200 · Earnings acceleration · Uptrend",
        "signal":  "MOMENTUM",
        "color":   "#059669",
        "sort":    "Market Capitalization",
        "thesis":  ("Confirmed uptrend (above both MAs), RSI 58-72, accelerating "
                    "quarterly earnings. Best for positional swings of 4-12 weeks."),
        "query":   ("Market Capitalization > 300 AND "
                    "Market Capitalization < 80000 AND "
                    "Current price > DMA 50 AND "
                    "Current price > DMA 200 AND "
                    "RSI > 58 AND RSI < 72 AND "
                    "Sales growth 3Years > 15 AND "
                    "Profit growth 3Years > 20 AND "
                    "Return on capital employed > 18 AND "
                    "Debt to equity < 0.5"),
    },
    {
        "id":      "sw4",
        "title":   "Scan 4: Small Cap Swing",
        "sub":     "MCap 200-10000 Cr · ROCE>20% · Above DMA 200",
        "signal":  "SMALL-CAP",
        "color":   "#d97706",
        "sort":    "Market Capitalization",
        "thesis":  ("Small caps (200-10000 Cr) with high capital efficiency "
                    "(ROCE>20%), strong promoter holding (>45%), and above DMA 200. "
                    "Higher beta = larger swing gains; size positions accordingly."),
        "query":   ("Market Capitalization > 200 AND "
                    "Market Capitalization < 10000 AND "
                    "Current price > DMA 200 AND "
                    "RSI > 55 AND "
                    "Return on capital employed > 20 AND "
                    "Debt to equity < 0.5 AND "
                    "Promoter holding > 45"),
    },
    {
        "id":      "sw5",
        "title":   "Scan 5: High-ROCE Leaders",
        "sub":     "ROCE > 25% · Debt/Eq < 0.3 · Price in uptrend",
        "signal":  "QUALITY",
        "color":   "#dc2626",
        "sort":    "Return on capital employed",
        "thesis":  ("Best-in-class businesses (ROCE>25%, near-zero debt) in uptrends. "
                    "Lower drawdowns, faster recoveries. Ideal for medium-term holds "
                    "where capital preservation is also a priority."),
        "query":   ("Market Capitalization > 500 AND "
                    "Return on capital employed > 25 AND "
                    "Debt to equity < 0.3 AND "
                    "Current price > DMA 200 AND "
                    "RSI > 55 AND "
                    "Profit growth 3Years > 12"),
    },
]

SIGNAL_STYLE = {
    "BREAKOUT":  ("background:#3b0764;color:#d8b4fe",),
    "DIP-BUY":   ("background:#0c4a6e;color:#7dd3fc",),
    "MOMENTUM":  ("background:#052e16;color:#4ade80",),
    "SMALL-CAP": ("background:#431407;color:#fb923c",),
    "QUALITY":   ("background:#450a0a;color:#fca5a5",),
}

# ---------------------------------------------------------------------------
def init_session():
    if not SESSION_ID:
        print("\n[ERROR] SCREENER_SESSION_ID not set in .env")
        print("  1. Log in to screener.in in Chrome")
        print("  2. F12 -> Application -> Cookies -> copy sessionid value")
        print("  3. Add to .env:  SCREENER_SESSION_ID=<value>")
        sys.exit(1)
    s = requests.Session()
    s.headers.update(HTTP_HEADERS)
    s.cookies.set("sessionid", SESSION_ID, domain="www.screener.in")
    print("[*] Verifying session...")
    r = s.get(VERIFY_URL, timeout=15, allow_redirects=True)
    if "/login/" in r.url:
        print("[ERROR] Session expired. Get a fresh sessionid from your browser.")
        sys.exit(1)
    print("[OK] Logged in.\n")
    return s


def parse_page(soup):
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
    headers = []
    for th in all_trs[0].find_all("th"):
        tip = th.get("data-tooltip", "").strip()
        headers.append(tip if tip else th.get_text(strip=True))
    rows = []
    for tr in all_trs[1:]:
        cells = tr.find_all("td")
        if not cells:
            continue
        row = {}
        for i, td in enumerate(cells):
            key = headers[i] if i < len(headers) else "col_" + str(i)
            a = td.find("a", href=lambda h: h and "/company/" in h)
            if a:
                row[key] = a.get_text(strip=True)
                row["__url__"] = BASE_URL + a["href"]
            else:
                row[key] = td.get_text(strip=True)
        rows.append(row)
    return headers, rows


def has_next(soup):
    pag = soup.find("div", class_="pagination")
    return bool(pag and pag.find("a", string=re.compile(r"Next", re.I)))


def run_scan(session, scan):
    print("[->] " + scan["title"] + " ...")
    all_headers, all_rows = [], []
    for page in range(1, MAX_PAGES + 1):
        params = {
            "query": scan["query"],
            "sort":  scan["sort"],
            "order": "desc",
            "limit": "50",
            "page":  str(page),
        }
        try:
            resp = session.get(
                SCREEN_RAW_URL,
                params=params,
                headers=dict(HTTP_HEADERS, Referer=BASE_URL + "/screens/"),
                timeout=30,
            )
        except Exception as e:
            return [], [], str(e)
        if resp.status_code != 200:
            return [], [], "HTTP " + str(resp.status_code)
        soup = BeautifulSoup(resp.text, "html.parser")
        err = soup.find(class_="errorlist") or soup.find(class_="error-msg")
        if err:
            return [], [], err.get_text(strip=True)[:200]
        hdrs, rows = parse_page(soup)
        if not all_headers and hdrs:
            all_headers = hdrs
        if not rows:
            break
        all_rows.extend(rows)
        if not has_next(soup):
            break
        time.sleep(1.2)
    print("    [OK] " + str(len(all_rows)) + " results")
    time.sleep(1.5)
    return all_headers, all_rows[:TOP_N], ""


# ---------------------------------------------------------------------------
def to_num(val):
    try:
        return float(str(val).replace(",", "").replace("%", "").strip())
    except (ValueError, AttributeError):
        return None


def swing_score(row, headers):
    """Return (score 0-10, grade A+/A/B/C, factors list)."""
    score, factors = 0, []

    def get(*keys):
        for k in keys:
            for h in headers:
                if k.lower() in h.lower():
                    v = to_num(row.get(h))
                    if v is not None:
                        return v
        return None

    roce = get("ROCE", "Return on capital employed")
    qp   = get("Qtr Profit Var", "NP Qtr Var")
    qs   = get("Qtr Sales Var", "Sales Qtr Var")
    pe   = get("P/E", "PE")

    if roce is not None:
        if roce >= 30:
            score += 3; factors.append("ROCE " + str(int(roce)) + "% ***")
        elif roce >= 20:
            score += 2; factors.append("ROCE " + str(int(roce)) + "% **")
        elif roce >= 15:
            score += 1; factors.append("ROCE " + str(int(roce)) + "%")

    if qp is not None:
        if qp >= 50:
            score += 3; factors.append("QtrProfit +" + str(int(qp)) + "%")
        elif qp >= 25:
            score += 2; factors.append("QtrProfit +" + str(int(qp)) + "%")
        elif qp >= 10:
            score += 1; factors.append("QtrProfit +" + str(int(qp)) + "%")

    if qs is not None:
        if qs >= 25:
            score += 2; factors.append("QtrSales +" + str(int(qs)) + "%")
        elif qs >= 10:
            score += 1; factors.append("QtrSales +" + str(int(qs)) + "%")

    if pe is not None and pe > 0:
        if pe < 20:
            score += 1; factors.append("P/E " + str(round(pe, 1)))

    score = min(score, 10)
    if score >= 7:
        grade = "A+"
    elif score >= 5:
        grade = "A"
    elif score >= 3:
        grade = "B"
    else:
        grade = "C"
    return score, grade, factors


# ---------------------------------------------------------------------------
NUMERIC_KW = [
    "CMP", "Current Price", "P/E", "Market Cap", "Mar Cap",
    "Div Yld", "NP Qtr", "Sales Qtr", "Qtr Profit", "Qtr Sales", "ROCE",
]
KEY_COLS = [
    "S.No.", "Name",
    "CMP", "Current Price",
    "P/E",
    "Market Cap", "Mar Cap",
    "Div Yld",
    "NP Qtr", "Qtr Profit Var",
    "Sales Qtr", "Qtr Sales Var",
    "ROCE",
]


def is_num_col(h):
    return any(k.lower() in h.lower() for k in NUMERIC_KW)


def build_table(scan, headers, rows):
    if not rows:
        return "<div class='no-results'>No stocks matched — try relaxing the query.</div>"

    display = [h for h in headers if not h.startswith("__") and
               any(k.lower() in h.lower() for k in KEY_COLS)]
    if not display:
        display = [h for h in headers if not h.startswith("__")]

    head = ("<th>Swing Score</th>"
            "<th>Entry</th>"
            "<th>Stop -" + str(STOP_PCT) + "%</th>")
    for h in display:
        cls = " class='num'" if is_num_col(h) else ""
        head += "<th" + cls + ">" + h + "</th>"

    body = ""
    for row in rows:
        score, grade, factors = swing_score(row, headers)

        cmp_v = None
        for h in headers:
            if "cmp" in h.lower() or "current price" in h.lower():
                cmp_v = to_num(row.get(h))
                break

        entry = ("Rs." + "{:,.1f}".format(cmp_v)) if cmp_v else "-"
        stop  = ("Rs." + "{:,.1f}".format(cmp_v * (1 - STOP_PCT / 100))) if cmp_v else "-"

        bar_w = int(score / 10 * 100)
        g_cls = "gAp" if grade == "A+" else ("gA" if grade == "A" else ("gB" if grade == "B" else "gC"))
        score_td = (
            "<td>"
            "<div class='sw'>"
            "<span class='" + g_cls + "'>" + grade + "</span>"
            "<div class='sbb'><div class='sbf' style='width:" + str(bar_w) + "%'></div></div>"
            "<span class='sn'>" + str(score) + "/10</span>"
            "</div>"
            "<div class='fac'>" + " &middot; ".join(factors[:3]) + "</div>"
            "</td>"
        )

        cells = (score_td
                 + "<td class='entry'>" + entry + "</td>"
                 + "<td class='stop'>" + stop + "</td>")

        for h in display:
            val = str(row.get(h, ""))
            if h in ("S.No.", "S.No"):
                cells += "<td class='sno'>" + val + "</td>"
            elif "name" in h.lower() and row.get("__url__"):
                cells += ("<td class='co'>"
                          "<a href='" + row["__url__"] + "' target='_blank'>" + val + "</a>"
                          "</td>")
            elif is_num_col(h):
                n = to_num(val)
                if n is not None and ("var" in h.lower() or "growth" in h.lower()):
                    cls = "pos" if n >= 0 else "neg"
                    cells += "<td class='" + cls + "'>" + val + "</td>"
                else:
                    cells += "<td class='num'>" + val + "</td>"
            else:
                cells += "<td>" + val + "</td>"

        body += "<tr>" + cells + "</tr>"

    return ("<div class='cb'>"
            "<table>"
            "<thead><tr>" + head + "</tr></thead>"
            "<tbody>" + body + "</tbody>"
            "</table>"
            "</div>")


def build_section(scan, headers, rows, error):
    sig   = scan["signal"]
    color = scan["color"]
    sid   = scan["id"]
    title = scan["title"]
    sub   = scan["sub"]
    thesis= scan["thesis"]
    query = scan["query"]
    qid   = "q" + sid
    nrows = len(rows)
    sstyle= SIGNAL_STYLE.get(sig, ("background:#1e293b;color:#94a3b8",))[0]

    content = ("<div class='err'>Error: " + error + "</div>") if error else build_table(scan, headers, rows)

    return (
        "<section class='card' id='" + sid + "'>"
        "<div class='ch' style='border-left:4px solid " + color + "'>"
        "  <div>"
        "    <h2 style='color:" + color + "'>" + title + "</h2>"
        "    <div class='csub'>" + sub + "</div>"
        "  </div>"
        "  <div class='chr'>"
        "    <span class='sig' style='" + sstyle + "'>" + sig + "</span>"
        "    <span class='cnt'>" + str(nrows) + " stocks</span>"
        "  </div>"
        "</div>"
        "<div class='thesis'><strong>Thesis:</strong> " + thesis + "</div>"
        + content +
        "<div class='qw'>"
        "  <div class='ql'>Screener.in Query</div>"
        "  <code id='" + qid + "'>" + query + "</code>"
        "  <button class='cpb' onclick='copyQ(\"" + qid + "\",this)'>Copy</button>"
        "</div>"
        "</section>"
    )


# ---------------------------------------------------------------------------
CSS = """
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
     background:#0f172a;color:#e2e8f0;line-height:1.55}
.sh{background:linear-gradient(135deg,#0f172a,#1a2744 60%,#0f172a);
    border-bottom:1px solid #1e3a5f;padding:1.8rem 2.5rem 1.4rem}
.sh h1{font-size:1.6rem;font-weight:800;color:#f1f5f9}
.sh .sub{color:#64748b;font-size:.85rem;margin-top:.25rem}
.ts{display:inline-block;background:#1e293b;border:1px solid #334155;
    border-radius:999px;padding:.18rem .75rem;font-size:.74rem;
    color:#94a3b8;margin-top:.6rem}
.sumbar{display:flex;gap:1rem;flex-wrap:wrap;padding:1rem 2.5rem;
        background:#0f172a;border-bottom:1px solid #1e293b}
.sb{background:#1e293b;border:1px solid #334155;border-radius:10px;
    padding:.6rem 1.1rem;min-width:100px;text-align:center}
.sb .v{font-size:1.4rem;font-weight:800;color:#f1f5f9;line-height:1}
.sb .l{font-size:.7rem;color:#64748b;margin-top:.25rem;
       text-transform:uppercase;letter-spacing:.05em}
nav{background:#111827;border-bottom:1px solid #1e293b;
    padding:.65rem 2.5rem;display:flex;gap:1rem;flex-wrap:wrap;
    position:sticky;top:0;z-index:20}
nav a{text-decoration:none;font-size:.78rem;font-weight:600;
      padding:.3rem .8rem;border-radius:6px;color:#94a3b8;
      border:1px solid transparent;transition:background .15s}
nav a:hover{background:#1e293b;border-color:#334155;color:#e2e8f0}
main{max-width:1400px;margin:0 auto;padding:1.5rem;
     display:flex;flex-direction:column;gap:1.5rem}
.card{background:#111827;border:1px solid #1e293b;border-radius:14px;overflow:hidden}
.ch{padding:.9rem 1.25rem;display:flex;align-items:flex-start;gap:1rem;
    justify-content:space-between;flex-wrap:wrap;border-bottom:1px solid #1e293b}
.ch h2{font-size:1rem;font-weight:700}
.csub{font-size:.75rem;color:#64748b;margin-top:.2rem}
.chr{display:flex;gap:.5rem;align-items:center;flex-shrink:0}
.sig{border-radius:999px;padding:.22rem .75rem;font-size:.7rem;
     font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.cnt{background:#1e293b;border:1px solid #334155;border-radius:999px;
     padding:.2rem .7rem;font-size:.75rem;color:#94a3b8}
.thesis{padding:.7rem 1.25rem;background:#0f172a;border-bottom:1px solid #1e293b;
        font-size:.78rem;color:#64748b;line-height:1.6}
.thesis strong{color:#94a3b8}
.cb{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.8rem}
thead th{padding:.5rem .75rem;text-align:left;background:#0f172a;
         font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;
         color:#475569;white-space:nowrap;border-bottom:1px solid #1e293b}
thead th.num{text-align:right}
tbody td{padding:.42rem .75rem;border-bottom:1px solid #0f172a;
         white-space:nowrap;vertical-align:middle}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover{background:#1a2234}
td.sno{color:#475569;text-align:center;font-size:.72rem}
td.co a{color:#93c5fd;text-decoration:none;font-weight:600}
td.co a:hover{color:#60a5fa;text-decoration:underline}
td.num{text-align:right;font-variant-numeric:tabular-nums;color:#cbd5e1}
td.pos{color:#4ade80;text-align:right}
td.neg{color:#f87171;text-align:right}
td.entry{color:#fbbf24;text-align:right;font-weight:600}
td.stop{color:#f87171;text-align:right;font-size:.75rem}
.sw{display:flex;align-items:center;gap:.4rem;min-width:90px}
.sbb{flex:1;background:#1e293b;border-radius:999px;height:5px;overflow:hidden}
.sbf{height:100%;border-radius:999px;
     background:linear-gradient(90deg,#f59e0b,#22d3ee)}
.sn{font-size:.7rem;color:#475569}
.gAp{background:#14532d;color:#4ade80;border-radius:5px;
     padding:.1rem .4rem;font-size:.7rem;font-weight:800}
.gA{background:#1e3a5f;color:#60a5fa;border-radius:5px;
    padding:.1rem .4rem;font-size:.7rem;font-weight:800}
.gB{background:#292524;color:#fb923c;border-radius:5px;
    padding:.1rem .4rem;font-size:.7rem;font-weight:800}
.gC{background:#1c1917;color:#78716c;border-radius:5px;
    padding:.1rem .4rem;font-size:.7rem;font-weight:800}
.fac{font-size:.7rem;color:#64748b;margin-top:.2rem;max-width:200px;
     white-space:normal;line-height:1.3}
.qw{margin:.75rem 1.25rem 1.25rem;background:#0f172a;
    border:1px solid #1e293b;border-radius:8px;
    padding:.75rem 1rem;position:relative}
.ql{font-size:.65rem;font-weight:700;text-transform:uppercase;
    letter-spacing:.08em;color:#475569;margin-bottom:.3rem}
.qw code{display:block;color:#67e8f9;font-size:.76rem;
          font-family:'SFMono-Regular',Consolas,monospace;
          white-space:pre-wrap;word-break:break-word;
          line-height:1.65;padding-right:5rem}
.cpb{position:absolute;top:.75rem;right:.75rem;background:#1e293b;
     color:#94a3b8;border:1px solid #334155;border-radius:6px;
     padding:.22rem .65rem;font-size:.7rem;cursor:pointer}
.cpb:hover{background:#334155;color:#e2e8f0}
.cpb.ok{background:#14532d;color:#4ade80;border-color:#166534}
.no-results{padding:2rem;text-align:center;color:#475569;font-size:.88rem}
.err{padding:1rem 1.25rem;color:#f87171;font-size:.83rem}
footer{text-align:center;padding:1.5rem;font-size:.72rem;color:#334155;
       border-top:1px solid #1e293b;margin-top:1rem}
"""

JS = """
function copyQ(id,btn){
  navigator.clipboard.writeText(document.getElementById(id).textContent).then(function(){
    btn.textContent='Copied!';btn.classList.add('ok');
    setTimeout(function(){btn.textContent='Copy';btn.classList.remove('ok');},2200);
  });
}
"""


def build_html(results):
    total = sum(len(v[1]) for v in results.values())

    stat = (
        "<div class='sb'><div class='v'>" + str(total) + "</div><div class='l'>Total Stocks</div></div>"
        "<div class='sb'><div class='v'>" + str(len(SCANS)) + "</div><div class='l'>Scan Themes</div></div>"
        "<div class='sb'><div class='v'>Rs.</div><div class='l'>Indian Markets</div></div>"
        "<div class='sb'><div class='v'>2-12w</div><div class='l'>Hold Horizon</div></div>"
    )

    nav = "".join(
        "<a href='#" + s["id"] + "' style='color:" + s["color"] + "'>"
        + s["title"].split(":")[0] + "</a>"
        for s in SCANS
    )

    sections = "".join(
        build_section({s["id"]: s for s in SCANS}[sid], *data)
        for sid, data in results.items()
    )

    return (
        "<!DOCTYPE html>\n<html lang='en'>\n<head>\n"
        "<meta charset='UTF-8'>\n"
        "<meta name='viewport' content='width=device-width,initial-scale=1.0'>\n"
        "<title>Swing Screener - " + DISPLAY_TS + "</title>\n"
        "<style>" + CSS + "</style>\n"
        "</head>\n<body>\n"
        "<header class='sh'>"
        "<h1>Swing &amp; Positional Screener</h1>"
        "<div class='sub'>Short-to-medium term opportunities &middot; Indian equities &middot; screener.in</div>"
        "<span class='ts'>Generated " + DISPLAY_TS + "</span>"
        "</header>\n"
        "<div class='sumbar'>" + stat + "</div>\n"
        "<nav>" + nav + "</nav>\n"
        "<main>" + sections + "</main>\n"
        "<footer>Data from screener.in &middot; " + DISPLAY_TS
        + " &middot; <strong>Not financial advice.</strong>"
          " Entry/stop levels are indicative. Always do your own due diligence.</footer>\n"
        "<script>" + JS + "</script>\n"
        "</body>\n</html>"
    )


# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("  Swing & Positional Screener  --  screener.in")
    print("=" * 60)

    session = init_session()
    results = {}

    for scan in SCANS:
        headers, rows, error = run_scan(session, scan)
        results[scan["id"]] = (headers, rows, error)

    print("\n[*] Building HTML report...")
    html     = build_html(results)
    filename = "04_swing_screener_" + TIMESTAMP + ".html"
    out_path = os.path.join(REPORTS_DIR, filename)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(html)

    # Also write a fixed-name alias so strategy_scanner.py can find it
    watchlist_path = os.path.join(REPORTS_DIR, "swing_watchlist.html")
    with open(watchlist_path, "w", encoding="utf-8") as fh:
        fh.write(html)

    print("[OK] Report saved -> " + out_path + "\n")
    total = sum(len(results[s["id"]][1]) for s in SCANS)
    print("-" * 60)
    print("  {:<44}  {:>6}".format("SCAN", "STOCKS"))
    print("-" * 60)
    for scan in SCANS:
        n = len(results[scan["id"]][1])
        print("  {:<44}  {:>6}  {}".format(scan["title"], n, "#" * min(n, 30)))
    print("-" * 60)
    print("  {:<44}  {:>6}".format("TOTAL", total))
    print("-" * 60)
    print("\n  Open: " + out_path + "\n")


if __name__ == "__main__":
    main()
