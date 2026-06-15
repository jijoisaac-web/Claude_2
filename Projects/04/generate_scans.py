"""
Stock Scan HTML Report Generator
Generates timestamped HTML files for 5 multibagger screener scans.
Usage: python generate_scans.py [output_dir]
"""

from datetime import datetime
import os
import sys

TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
DISPLAY_TS = datetime.now().strftime("%d %b %Y, %I:%M %p")
_script_dir = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else _script_dir
os.makedirs(OUT_DIR, exist_ok=True)

SCANS = [
    {
        "id": "scan1",
        "title": "Scan 1: Emerging Multibagger",
        "subtitle": "My Preferred Scan — Screener.in",
        "color": "#4f46e5",
        "badge_color": "#e0e7ff",
        "badge_text": "#3730a3",
        "why": [
            "Focuses on growing businesses",
            "Excludes weak balance sheets",
            "Captures stocks already showing institutional interest",
            "Avoids many value traps",
        ],
        "criteria": [
            ("Market Capitalization", "&gt; 100 Cr", "Lower bound — avoids micro-illiquid names"),
            ("Market Capitalization", "&lt; 30,000 Cr", "Mid-cap ceiling — room to grow"),
            ("Sales Growth 3Y", "&gt; 15%", "Sustained revenue expansion"),
            ("Profit Growth 3Y", "&gt; 20%", "Earnings scaling faster than revenue"),
            ("Return on Capital Employed", "&gt; 18%", "Efficient capital deployment"),
            ("Debt to Equity", "&lt; 0.5", "Clean balance sheet"),
            ("Current Price", "&gt; 80% of All-Time High", "Price strength / institutional interest"),
            ("Promoter Holding", "&gt; 45%", "Skin in the game"),
            ("OPM (Operating Profit Margin)", "&gt; 12%", "Healthy operating profitability"),
            ("Interest Coverage Ratio", "&gt; 5x", "Debt servicing comfort"),
        ],
        "screener_query": "Market Capitalization > 100 AND Market Capitalization < 30000 AND Sales growth 3Years > 15 AND Profit growth 3Years > 20 AND Return on capital employed > 18 AND Debt to equity < 0.5 AND Current price > 0.8 * High price all time AND Promoter holding > 45 AND OPM > 12 AND Interest Coverage Ratio > 5",
    },
    {
        "id": "scan2",
        "title": "Scan 2: Order Book Multibagger",
        "subtitle": "Defense · Railways · EPC · EMS · Capital Goods",
        "color": "#0891b2",
        "badge_color": "#cffafe",
        "badge_text": "#164e63",
        "why": [
            "Order-driven businesses have revenue visibility",
            "Capital goods cycle tends to create multi-year re-ratings",
            "Strong promoter holding reduces floating stock",
            "Momentum filter (200 DMA) confirms trend",
        ],
        "criteria": [
            ("Sales Growth 3Y", "&gt; 15%", "Revenue traction"),
            ("Profit Growth 3Y", "&gt; 20%", "Profitability scaling"),
            ("Return on Capital Employed", "&gt; 18%", "Efficient deployment"),
            ("Debt to Equity", "&lt; 0.7", "Moderate leverage acceptable for capex-heavy sectors"),
            ("Market Capitalization", "&lt; 50,000 Cr", "Pre-large-cap range"),
            ("Current Price", "&gt; 200 DMA", "Uptrend confirmation"),
            ("Promoter Holding", "&gt; 50%", "High promoter commitment"),
        ],
        "manual_checks": [
            "Order book >= 3x annual revenue",
            "Capacity expansion underway",
            "Management guidance remains strong",
        ],
        "screener_query": "Sales growth 3Years > 15 AND Profit growth 3Years > 20 AND Return on capital employed > 18 AND Debt to equity < 0.7 AND Market Capitalization < 50000 AND Current price > 200 DMA AND Promoter holding > 50",
    },
    {
        "id": "scan3",
        "title": "Scan 3: Institutional Accumulation",
        "subtitle": "Follow the Smart Money",
        "color": "#059669",
        "badge_color": "#d1fae5",
        "badge_text": "#065f46",
        "why": [
            "Rising institutional ownership acts as a price catalyst",
            "FII + MF accumulation often precedes strong re-ratings",
            "200 DMA filter ensures trend alignment",
            "Moderate size means institutions are still building positions",
        ],
        "criteria": [
            ("Market Capitalization", "&gt; 500 Cr", "Minimum size for institutional eligibility"),
            ("Market Capitalization", "&lt; 50,000 Cr", "Pre-large-cap range"),
            ("Sales Growth 3Y", "&gt; 15%", "Revenue momentum"),
            ("Profit Growth 3Y", "&gt; 20%", "Earnings momentum"),
            ("Return on Equity", "&gt; 15%", "Shareholder value creation"),
            ("Debt to Equity", "&lt; 0.5", "Clean balance sheet"),
            ("Current Price", "&gt; 200 DMA", "Uptrend confirmation"),
        ],
        "manual_checks": [
            "Increasing mutual fund ownership (QoQ)",
            "Increasing FII ownership (QoQ)",
            "Stable or increasing promoter stake",
        ],
        "screener_query": "Market Capitalization > 500 AND Market Capitalization < 50000 AND Sales growth 3Years > 15 AND Profit growth 3Years > 20 AND Return on equity > 15 AND Debt to equity < 0.5 AND Current price > 200 DMA",
    },
    {
        "id": "scan4",
        "title": "Scan 4: Hidden Small-Cap Compounders",
        "subtitle": "Future Mid-Caps in Disguise",
        "color": "#d97706",
        "badge_color": "#fef3c7",
        "badge_text": "#92400e",
        "why": [
            "Low debt + high ROCE = self-funded growth engine",
            "5-year growth filters eliminate one-year wonders",
            "High promoter holding in small caps signals conviction",
            "These become future mid-caps if execution holds",
        ],
        "criteria": [
            ("Market Capitalization", "&gt; 100 Cr", "Minimum liquidity floor"),
            ("Market Capitalization", "&lt; 10,000 Cr", "True small-cap universe"),
            ("Return on Capital Employed", "&gt; 20%", "High-quality capital allocation"),
            ("Sales Growth 5Y", "&gt; 15%", "Long-term revenue compounding"),
            ("Profit Growth 5Y", "&gt; 15%", "Long-term earnings compounding"),
            ("Debt to Equity", "&lt; 0.3", "Nearly debt-free"),
            ("Promoter Holding", "&gt; 50%", "Strong founder/promoter stake"),
        ],
        "screener_query": "Market Capitalization > 100 AND Market Capitalization < 10000 AND Return on capital employed > 20 AND Sales growth 5Years > 15 AND Profit growth 5Years > 15 AND Debt to equity < 0.3 AND Promoter holding > 50",
    },
    {
        "id": "scan5",
        "title": "Scan 5: Early Momentum + Fundamentals",
        "subtitle": "Where Price Action Meets Quality",
        "color": "#dc2626",
        "badge_color": "#fee2e2",
        "badge_text": "#991b1b",
        "why": [
            "Price above both 50 & 200 DMA = confirmed uptrend",
            "RSI > 55 signals momentum without being overbought",
            "Fundamental filters prevent chasing weak breakouts",
            "Best used after broader market confirms bullish structure",
        ],
        "criteria": [
            ("Current Price", "&gt; 50 DMA", "Short-term trend bullish"),
            ("Current Price", "&gt; 200 DMA", "Long-term trend bullish"),
            ("RSI", "&gt; 55", "Momentum without extreme overbought"),
            ("Sales Growth 3Y", "&gt; 15%", "Revenue momentum"),
            ("Profit Growth 3Y", "&gt; 20%", "Earnings momentum"),
            ("ROCE", "&gt; 18%", "Capital efficiency"),
            ("Debt to Equity", "&lt; 0.5", "Financial stability"),
        ],
        "screener_query": "Current price > 50 DMA AND Current price > 200 DMA AND RSI > 55 AND Sales growth 3Years > 15 AND Profit growth 3Years > 20 AND Return on capital employed > 18 AND Debt to equity < 0.5",
    },
]

RANKING_FACTORS = [
    ("Revenue Growth", "&gt; 20%"),
    ("Profit Growth", "&gt; 25%"),
    ("ROCE", "&gt; 20%"),
    ("Debt / Equity", "&lt; 0.3"),
    ("Promoter Holding", "&gt; 50%"),
    ("Market Cap", "Rs 500 Cr - Rs 30,000 Cr"),
    ("Industry Tailwind", "Strong"),
    ("Institutional Ownership", "Rising"),
    ("Order Book", "Growing"),
    ("Capacity Expansion", "Yes"),
]


def scan_card(scan):
    criteria_rows = ""
    for c in scan["criteria"]:
        criteria_rows += "<tr><td class='param'>" + c[0] + "</td><td class='value' style='color:" + scan["color"] + "'>" + c[1] + "</td><td class='note'>" + c[2] + "</td></tr>"

    manual_html = ""
    if scan.get("manual_checks"):
        items = "".join("<li>" + m + "</li>" for m in scan["manual_checks"])
        manual_html = "<div class='manual-checks'><div class='section-label'>Manual Checks</div><ul>" + items + "</ul></div>"

    why_items = "".join("<li>" + w + "</li>" for w in scan["why"])

    return (
        "<section class='scan-card' id='" + scan["id"] + "'>"
        "<div class='card-header' style='border-left:5px solid " + scan["color"] + "'>"
        "<h2 style='color:" + scan["color"] + "'>" + scan["title"] + "</h2>"
        "<span class='badge' style='background:" + scan["badge_color"] + ";color:" + scan["badge_text"] + "'>" + scan["subtitle"] + "</span>"
        "</div>"
        "<div class='card-body'>"
        "<div class='table-wrap'><table>"
        "<thead><tr><th>Parameter</th><th>Filter</th><th>Rationale</th></tr></thead>"
        "<tbody>" + criteria_rows + "</tbody></table></div>"
        + manual_html +
        "<div class='query-block'>"
        "<div class='section-label'>Screener.in Query</div>"
        "<code id='q-" + scan["id"] + "'>" + scan["screener_query"] + "</code>"
        "<button class='copy-btn' onclick=\"copyQuery('q-" + scan["id"] + "', this)\">Copy</button>"
        "</div>"
        "<div class='why-block'>"
        "<div class='section-label'>Why It Works</div>"
        "<ul class='why-list'>" + why_items + "</ul>"
        "</div>"
        "</div></section>"
    )


def ranking_table():
    rows = "".join("<tr><td>" + f[0] + "</td><td class='target'>" + f[1] + "</td></tr>" for f in RANKING_FACTORS)
    return (
        "<section class='scan-card' id='ranking'>"
        "<div class='card-header' style='border-left:5px solid #7c3aed'>"
        "<h2 style='color:#7c3aed'>Professional Ranking Filters</h2>"
        "<span class='badge' style='background:#ede9fe;color:#4c1d95'>Post-screening shortlist criteria</span>"
        "</div>"
        "<div class='card-body'>"
        "<div class='table-wrap'><table>"
        "<thead><tr><th>Factor</th><th>Target</th></tr></thead>"
        "<tbody>" + rows + "</tbody></table></div>"
        "<div class='why-block'><div class='section-label'>How to Use</div>"
        "<ul class='why-list'>"
        "<li>Run any of the 5 scans on Screener.in to get a candidate list.</li>"
        "<li>Score each candidate against these 10 factors (1 point each).</li>"
        "<li>Prioritise stocks scoring 7/10 or above for deeper research.</li>"
        "<li>Re-verify quarterly — thesis invalidation is as important as entry.</li>"
        "</ul></div></div></section>"
    )


CSS = """
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }
header { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); color: #fff; padding: 2rem 2.5rem; }
header h1 { font-size: 1.8rem; font-weight: 700; }
header p { color: #94a3b8; margin-top: 0.3rem; font-size: 0.9rem; }
.timestamp { display: inline-block; background: rgba(255,255,255,0.1); border-radius: 999px; padding: 0.2rem 0.8rem; font-size: 0.8rem; color: #e2e8f0; margin-top: 0.6rem; }
nav { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 0.75rem 2.5rem; display: flex; gap: 1.5rem; flex-wrap: wrap; position: sticky; top: 0; z-index: 10; }
nav a { text-decoration: none; font-size: 0.82rem; font-weight: 600; padding-bottom: 2px; transition: opacity 0.2s; }
nav a:hover { opacity: 0.7; }
main { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; display: flex; flex-direction: column; gap: 2rem; }
.scan-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); overflow: hidden; }
.card-header { padding: 1.25rem 1.5rem; background: #fafafa; border-bottom: 1px solid #f1f5f9; }
.card-header h2 { font-size: 1.15rem; font-weight: 700; }
.badge { display: inline-block; border-radius: 999px; padding: 0.15rem 0.7rem; font-size: 0.75rem; font-weight: 600; margin-top: 0.4rem; }
.card-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
thead tr { background: #f1f5f9; }
th { text-align: left; padding: 0.6rem 0.9rem; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
td { padding: 0.55rem 0.9rem; border-bottom: 1px solid #f1f5f9; }
td.param { font-weight: 600; color: #334155; }
td.value { font-weight: 700; font-size: 0.92rem; }
td.target { font-weight: 700; color: #7c3aed; }
td.note { color: #64748b; font-size: 0.83rem; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover { background: #f8fafc; }
.section-label { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 0.5rem; }
.manual-checks ul, .why-list { padding-left: 1.2rem; }
.manual-checks li, .why-list li { margin-bottom: 0.3rem; font-size: 0.88rem; color: #475569; }
.query-block { background: #0f172a; border-radius: 8px; padding: 1rem 1.25rem; position: relative; }
.query-block .section-label { color: #64748b; }
.query-block code { display: block; color: #7dd3fc; font-size: 0.82rem; font-family: 'SFMono-Regular', Consolas, monospace; white-space: pre-wrap; word-break: break-word; line-height: 1.7; padding-right: 5rem; }
.copy-btn { position: absolute; top: 1rem; right: 1rem; background: #334155; color: #e2e8f0; border: none; border-radius: 6px; padding: 0.3rem 0.8rem; font-size: 0.78rem; cursor: pointer; transition: background 0.2s; }
.copy-btn:hover { background: #475569; }
.copy-btn.copied { background: #15803d; color: #fff; }
footer { text-align: center; padding: 2rem; font-size: 0.8rem; color: #94a3b8; }
"""

JS = """
function copyQuery(elemId, btn) {
  var text = document.getElementById(elemId).textContent;
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  });
}
"""


def nav_links():
    links = ""
    for s in SCANS:
        label = s["title"].split(":")[0]
        links += "<a href='#" + s["id"] + "' style='border-bottom:2px solid " + s["color"] + ";color:" + s["color"] + "'>" + label + "</a>"
    links += "<a href='#ranking' style='border-bottom:2px solid #7c3aed;color:#7c3aed'>Pro Filters</a>"
    return links


def build_html():
    cards = "".join(scan_card(s) for s in SCANS) + ranking_table()
    return (
        "<!DOCTYPE html><html lang='en'><head>"
        "<meta charset='UTF-8'>"
        "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
        "<title>Multibagger Scans " + DISPLAY_TS + "</title>"
        "<style>" + CSS + "</style>"
        "</head><body>"
        "<header>"
        "<h1>Multibagger Stock Scan Dashboard</h1>"
        "<p>5 systematic screener strategies for finding high-growth Indian equities</p>"
        "<span class='timestamp'>Generated: " + DISPLAY_TS + "</span>"
        "</header>"
        "<nav>" + nav_links() + "</nav>"
        "<main>" + cards + "</main>"
        "<footer>Generated by Multibagger Scan Generator &middot; " + DISPLAY_TS + " &middot; Use on <a href='https://screener.in' target='_blank' style='color:#6366f1'>screener.in</a> &middot; Not financial advice.</footer>"
        "<script>" + JS + "</script>"
        "</body></html>"
    )


def main():
    html = build_html()
    filename = "04_multibagger_scans_" + TIMESTAMP + ".html"
    path = os.path.join(OUT_DIR, filename)
    fh = open(path, "w", encoding="utf-8")
    fh.write(html)
    fh.close()
    print("Generated: " + path)
    return path, filename


if __name__ == "__main__":
    main()
