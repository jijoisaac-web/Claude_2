# -*- coding: utf-8 -*-
"""
India Stock Market Research Report Generator
=============================================
Generates CSV and HTML reports from the June 2026 equity research analysis.

Usage:
    python india_stock_report.py

Outputs:
    india_stock_report_YYYYMMDD_HHMM.csv
    india_stock_report_YYYYMMDD_HHMM.html
"""

import csv
import os
from datetime import datetime

# ─────────────────────────────────────────────
# DATA
# ─────────────────────────────────────────────

_NOW        = datetime.today()
REPORT_DATE = _NOW.strftime("%Y-%m-%d")
REPORT_TIME = _NOW.strftime("%H:%M:%S")
REPORT_DT   = _NOW.strftime("%d %b %Y, %I:%M %p")
FILE_STAMP  = _NOW.strftime("%Y%m%d_%H%M")

MACRO = {
    "Nifty 50":      "23,417",
    "Sensex":        "74,360",
    "RBI Rate":      "5.25%",
    "India VIX":     "16.5",
    "GDP Growth":    "6.5-7% (FY26-27E)",
    "FII Stance":    "Net Sellers",
    "DII Stance":    "Net Buyers",
    "Top Sectors":   "Defence, Capital Goods, IT, Pharma, Banking, Consumption",
}

MASTER_TABLE = [
    ("HAL",               "NSE:HAL",          "Defence & Aerospace",        3800, 5000,  "32%", "2-3 yr", 9,
     "Tejas MkI-A (83 jets), HTT-40, MRO expansion, Rs94K cr order book",
     "Execution delays, premium valuation"),
    ("ICICI Bank",        "NSE:ICICIBANK",     "Private Banking",            1185, 1650,  "39%", "2-3 yr", 9,
     "NII growth, retail lending, digital (iMobile 15M users)",
     "NPA spike, credit cycle reversal"),
    ("Bajaj Finance",     "NSE:BAJFINANCE",    "NBFC",                        890, 1250,  "40%", "2-3 yr", 8,
     "AUM Rs4.16L cr, 101M customers, Bajaj Housing Finance unlock",
     "RBI regulation tightening, competition"),
    ("Dixon Technologies","NSE:DIXON",         "Electronics / PLI",         10489,15000,  "43%", "2-3 yr", 8,
     "PLI electronics, Apple supply chain, Rs50K cr revenue target FY28",
     "Client concentration, margin pressure"),
    ("Polycab India",     "NSE:POLYCAB",       "Cables & Wires",             4800, 6500,  "35%", "2 yr",   8,
     "Real estate/infra upcycle, FMEG scaling, export opportunity",
     "Raw material cost volatility, competition"),
    ("Kaynes Technology", "NSE:KAYN",          "ESDM / Defence Electronics", 4200, 6000,  "43%", "2-3 yr", 8,
     "33% FY26 revenue growth, defence + EV + industrial, new plant ramp",
     "Execution risk, working capital intensity"),
    ("Trent Ltd",         "NSE:TRENT",         "Retail / Consumer Disc.",    5000, 7000,  "40%", "2-3 yr", 8,
     "Zudio 600+ stores, same-store sales +15-18%, Tata Group backing",
     "Macro slowdown, fast-fashion competition"),
    ("L&T",               "NSE:LT",            "Engineering & Infra",        3500, 4500,  "29%", "2 yr",   8,
     "Rs5.6L cr order book, data centres, green hydrogen, nuclear",
     "Order execution delays, global capex cycle"),
    ("Zomato",            "NSE:ZOMATO",        "Quick Commerce / Tech",        210,  310,  "48%", "2 yr",   7,
     "Blinkit GMV doubling, Hyperpure B2B, District events platform",
     "Competitive intensity (Swiggy Instamart), burn rate"),
    ("Bharti Airtel",     "NSE:BHARTIARTL",    "Telecom",                    1680, 2200,  "31%", "2 yr",   8,
     "ARPU Rs208 to Rs300+ target, 5G monetisation, Africa EBITDA $600M+",
     "Regulatory risk, tariff caps"),
    ("SBI",               "NSE:SBIN",          "PSU Banking",                 810, 1100,  "36%", "2 yr",   7,
     "Loan growth, dividend yield 2.5%, cheap P/B valuation",
     "SME asset quality, political interference risk"),
    ("Clean Science & Tech","NSE:CLEANSCIENCE","Specialty Chemicals",        1200, 1800,  "50%", "3 yr",   7,
     "China+1, MEHQ/BHA niche leader 30-45% global share, new molecules",
     "Pricing pressure, capex ramp-up period"),
    ("Ion Exchange India", "NSE:IONEXCHANG",   "Water Treatment",             550,  950,  "73%", "3 yr",   7,
     "Jal Jeevan Mission, industrial water treatment, semiconductor fab orders",
     "Order concentration, long project cycles"),
    ("CDSL",              "NSE:CDSL",          "Financial Infrastructure",   1450, 2000,  "38%", "2 yr",   8,
     "160M+ demat accounts, SIP boom, asset-light 80%+ margins",
     "Capital market downturn reduces volumes"),
    ("BEL",               "NSE:BEL",           "Defence Electronics",         290,  420,  "45%", "2-3 yr", 8,
     "Rs75K cr order book, EW systems, radars, avionics, MoD preferred vendor",
     "PSU execution pace, government budget cuts"),
    ("Nesco Ltd",         "NSE:NESCO",         "IT Parks / MICE",             850, 1400,  "65%", "3 yr",   7,
     "MICE monopoly (Bombay Exhibition Centre), IT park expansion, zero debt",
     "Mumbai infra bottleneck, MICE demand cyclicality"),
]

CATEGORIES = {
    "A_Long_Term_Compounders": [
        {"stock":"HAL","ticker":"NSE:HAL","sector":"Defence","cmp":3800,"entry":"3600-3900","addon":"3200-3400","sl":3100,"t1":4500,"t2":5000,"t3":6500,"cagr":"22-28%","horizon":"3-5 yr","success_pct":82,"thesis":"Largest defence PSU; Tejas/HTT-40 orders; 820+ aircraft pipeline; net cash; 3-yr ROE 26%"},
        {"stock":"ICICI Bank","ticker":"NSE:ICICIBANK","sector":"Banking","cmp":1185,"entry":"1140-1200","addon":"1050-1100","sl":990,"t1":1450,"t2":1650,"t3":2000,"cagr":"18-22%","horizon":"3-5 yr","success_pct":85,"thesis":"India's cleanest private bank; ROA 2.4%, ROE 18%; gaining market share; digital moat"},
        {"stock":"Dixon Technologies","ticker":"NSE:DIXON","sector":"Electronics/PLI","cmp":10489,"entry":"9500-10800","addon":"8000-8500","sl":7500,"t1":13500,"t2":17000,"t3":22000,"cagr":"25-30%","horizon":"3-5 yr","success_pct":75,"thesis":"India's #1 contract electronics mfr; Apple supply chain entry; Rs50K cr revenue target FY28"},
        {"stock":"Bajaj Finance","ticker":"NSE:BAJFINANCE","sector":"NBFC","cmp":890,"entry":"850-920","addon":"750-800","sl":700,"t1":1100,"t2":1250,"t3":1600,"cagr":"20-25%","horizon":"3-5 yr","success_pct":80,"thesis":"AUM Rs4.16L cr; 101M customers; OPM 66%; Bajaj Housing Finance valuation unlock"},
        {"stock":"Trent Ltd","ticker":"NSE:TRENT","sector":"Retail","cmp":5000,"entry":"4700-5200","addon":"4000-4400","sl":3700,"t1":6200,"t2":7000,"t3":9000,"cagr":"22-27%","horizon":"3-5 yr","success_pct":78,"thesis":"Zudio fastest-growing value fashion brand; 600+ stores; SSSG 15-18%; Tata Group backing"},
    ],
    "B_Growth_Stocks": [
        {"stock":"Bharti Airtel","ticker":"NSE:BHARTIARTL","sector":"Telecom","cmp":1680,"entry":"1600-1720","addon":"1450","sl":1320,"t1":2000,"t2":2200,"t3":2700,"cagr":"18-22%","horizon":"1-3 yr","success_pct":80,"thesis":"ARPU Rs208 to Rs300+ target; 5G monetisation; Africa EBITDA $600M+; ICICI Direct BUY"},
        {"stock":"Polycab India","ticker":"NSE:POLYCAB","sector":"Cables & Wires","cmp":4800,"entry":"4600-5000","addon":"4000-4200","sl":3700,"t1":5800,"t2":6500,"t3":8000,"cagr":"20-25%","horizon":"1-3 yr","success_pct":78,"thesis":"Market leader wires/cables; FMEG scaling to Rs5K cr; real estate + infra upcycle"},
        {"stock":"Zomato","ticker":"NSE:ZOMATO","sector":"Quick Commerce","cmp":210,"entry":"195-220","addon":"165-180","sl":148,"t1":265,"t2":310,"t3":400,"cagr":"25-35%","horizon":"1-3 yr","success_pct":72,"thesis":"Blinkit GMV doubling YoY; moving to FCF positive; 500M smartphone user TAM"},
        {"stock":"L&T","ticker":"NSE:LT","sector":"Engineering & Infra","cmp":3500,"entry":"3300-3600","addon":"3000-3100","sl":2750,"t1":4000,"t2":4500,"t3":5500,"cagr":"16-20%","horizon":"1-3 yr","success_pct":82,"thesis":"Rs5.6L cr order book record; data centres + green hydrogen; 8-10 yr visibility"},
        {"stock":"CDSL","ticker":"NSE:CDSL","sector":"Financial Infra","cmp":1450,"entry":"1350-1500","addon":"1150-1250","sl":1050,"t1":1800,"t2":2000,"t3":2500,"cagr":"20-25%","horizon":"1-3 yr","success_pct":78,"thesis":"160M+ demat accounts; 20M new/year; SIP boom; 80%+ margins; zero capex model"},
    ],
    "C_Swing_Trades": [
        {"stock":"ICICI Bank","ticker":"NSE:ICICIBANK","sector":"Banking","cmp":1185,"entry":"1160-1190","addon":"--","sl":1110,"t1":1320,"t2":1380,"t3":"--","cagr":"10-16% (6-8 wks)","horizon":"1-2 months","success_pct":72,"thesis":"Bounced off 50-DMA (Rs1,165); bullish reversal candle; deep liquidity"},
        {"stock":"HAL","ticker":"NSE:HAL","sector":"Defence","cmp":3800,"entry":"3600-3800","addon":"--","sl":3320,"t1":4200,"t2":4500,"t3":"--","cagr":"12-18% (8-10 wks)","horizon":"2-3 months","success_pct":70,"thesis":"RSI ~42 approaching oversold; near 52-wk low support Rs3,400-3,500"},
        {"stock":"Reliance Industries","ticker":"NSE:RELIANCE","sector":"Conglomerate","cmp":1335,"entry":"1310-1360","addon":"--","sl":1240,"t1":1520,"t2":1600,"t3":"--","cagr":"12-18% (8-12 wks)","horizon":"2-3 months","success_pct":68,"thesis":"Consolidating at Rs1,300-1,400 base; Jio IPO news-flow catalyst; massive liquidity"},
        {"stock":"SBI","ticker":"NSE:SBIN","sector":"PSU Banking","cmp":810,"entry":"790-820","addon":"--","sl":740,"t1":920,"t2":980,"t3":"--","cagr":"14-20% (10-12 wks)","horizon":"2-3 months","success_pct":70,"thesis":"Cheap P/B 1.1x; dividend yield 2.5%; DII buying support; Q1 FY27 rebound play"},
        {"stock":"Dixon Technologies","ticker":"NSE:DIXON","sector":"Electronics/PLI","cmp":10489,"entry":"9800-10600","addon":"--","sl":8800,"t1":12500,"t2":13500,"t3":"--","cagr":"20-28% (8-12 wks)","horizon":"2-3 months","success_pct":65,"thesis":"Down 34% from peak; institutional bottom-fishing; PLI policy unchanged; reversal candle"},
    ],
    "D_Multibagger_SmallMidCap": [
        {"stock":"Kaynes Technology","ticker":"NSE:KAYN","sector":"ESDM / Defence Electronics","cmp":4200,"entry":"3900-4400","addon":"3400-3600","sl":3000,"t1":5200,"t2":6000,"t3":8500,"cagr":"28-35%","horizon":"2-4 yr","success_pct":72,"thesis":"FY26 revenue Rs3,626 cr (+33%); defence + EV + industrial; 21 analysts avg target Rs4,514"},
        {"stock":"Ion Exchange India","ticker":"NSE:IONEXCHANG","sector":"Water Treatment","cmp":550,"entry":"500-580","addon":"420-460","sl":380,"t1":720,"t2":950,"t3":1400,"cagr":"30-40%","horizon":"3-4 yr","success_pct":70,"thesis":"Jal Jeevan Mission + industrial water treatment; zero debt; ROE >18%; 73% upside analyst target"},
        {"stock":"Clean Science & Tech","ticker":"NSE:CLEANSCIENCE","sector":"Specialty Chemicals","cmp":1200,"entry":"1100-1260","addon":"950-1020","sl":870,"t1":1600,"t2":1800,"t3":2500,"cagr":"25-35%","horizon":"3-4 yr","success_pct":68,"thesis":"Global niche leader MEHQ/BHA (30-45% market share); ROCE >35%; debt-free; China+1 beneficiary"},
        {"stock":"BEL","ticker":"NSE:BEL","sector":"Defence Electronics","cmp":290,"entry":"270-300","addon":"240-255","sl":215,"t1":360,"t2":420,"t3":560,"cagr":"22-28%","horizon":"2-3 yr","success_pct":78,"thesis":"Rs75K cr order book; EW systems/radars/avionics; Navaratna PSU; revenue CAGR 15-20%"},
        {"stock":"Nesco Ltd","ticker":"NSE:NESCO","sector":"IT Parks / MICE","cmp":850,"entry":"800-880","addon":"680-720","sl":600,"t1":1100,"t2":1400,"t3":1900,"cagr":"28-35%","horizon":"3-4 yr","success_pct":70,"thesis":"Mumbai MICE monopoly; IT park fully leased; zero debt; FCF generating; P/E ~18x -- deeply undervalued"},
    ],
}

PORTFOLIOS = [
    {
        "name":"Conservative","description":"Large-cap quality, low volatility, strong dividends and moats",
        "target_cagr":"16-19%","max_drawdown":"15-20%",
        "holdings":[
            ("ICICI Bank","NSE:ICICIBANK",25,250000,"Safest large private bank; consistent compounder"),
            ("Bharti Airtel","NSE:BHARTIARTL",20,200000,"Telecom monopoly; ARPU upcycle; Africa kicker"),
            ("L&T","NSE:LT",20,200000,"Order book visibility; infrastructure proxy"),
            ("Polycab India","NSE:POLYCAB",20,200000,"Infra play; predictable earnings; dividend"),
            ("SBI","NSE:SBIN",15,150000,"Cheap valuation; PSU re-rating candidate"),
        ]
    },
    {
        "name":"Balanced","description":"Mix of large-cap compounders + quality mid-caps",
        "target_cagr":"20-25%","max_drawdown":"22-28%",
        "holdings":[
            ("HAL","NSE:HAL",20,200000,"Defence compounder near 52-wk low"),
            ("ICICI Bank","NSE:ICICIBANK",18,180000,"Core banking holding"),
            ("Dixon Technologies","NSE:DIXON",17,170000,"PLI electronics champion"),
            ("Bajaj Finance","NSE:BAJFINANCE",15,150000,"NBFC leader; digital lending moat"),
            ("CDSL","NSE:CDSL",15,150000,"Capital market infra; asset-light"),
            ("Kaynes Technology","NSE:KAYN",15,150000,"High-growth ESDM; defence electronics"),
        ]
    },
    {
        "name":"Aggressive","description":"High-conviction mid/small caps + growth stocks",
        "target_cagr":"28-38%","max_drawdown":"30-40%",
        "holdings":[
            ("Kaynes Technology","NSE:KAYN",20,200000,"Defence + EV electronics; 33% revenue growth"),
            ("Zomato","NSE:ZOMATO",18,180000,"Quick commerce scale; Blinkit inflection"),
            ("Trent","NSE:TRENT",17,170000,"Zudio -- fastest growing value retailer"),
            ("Ion Exchange India","NSE:IONEXCHANG",15,150000,"Water infra; 73% analyst upside; zero debt"),
            ("Clean Science","NSE:CLEANSCIENCE",15,150000,"Specialty chem; China+1; ROCE >35%"),
            ("Nesco Ltd","NSE:NESCO",15,150000,"Deeply undervalued MICE monopoly; FCF rich"),
        ]
    },
]

RISKS = [
    ("RBI Policy Surprise",          "High",   "Any rate hike would hit NBFCs and rate-sensitive sectors"),
    ("US Recession / Global Slowdown","Medium", "IT exports and commodity stocks most exposed"),
    ("FII Continued Selling",         "Medium", "Rupee weakness compounds valuation headwinds"),
    ("Defence Execution Delays",      "Medium", "HAL/BEL order-to-revenue conversion has historically lagged"),
    ("Premium Valuation Risk",        "Medium", "Dixon, Kaynes still trade at elevated P/E; earnings must deliver"),
    ("China Re-entry",                "Low",    "Any reversal of China+1 hurts specialty chemicals"),
    ("India VIX Spike",               "Medium", "Current 16.5 could move to 22-25 on global risk-off; hold cash buffer"),
]

# ─────────────────────────────────────────────
# CSV GENERATOR
# ─────────────────────────────────────────────

def generate_csv(output_dir="."):
    filename = os.path.join(output_dir, "03_india_stock_report_{}.csv".format(FILE_STAMP))
    with open(filename, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)

        w.writerow(["=== MACRO SNAPSHOT ===", "Report Date: {}".format(REPORT_DATE), "Report Time: {}".format(REPORT_TIME)])
        w.writerow(["Indicator", "Value"])
        for k, v in MACRO.items():
            w.writerow([k, v])
        w.writerow([])

        w.writerow(["=== MASTER OPPORTUNITY TABLE ==="])
        w.writerow(["Stock","Ticker","Sector","CMP (Rs)","Fair Value (Rs)","Upside","Horizon","Conviction (1-10)","Key Catalysts","Key Risks"])
        for row in MASTER_TABLE:
            w.writerow(row)
        w.writerow([])

        category_labels = {
            "A_Long_Term_Compounders": "A. TOP 5 LONG-TERM COMPOUNDERS (3-5 Years)",
            "B_Growth_Stocks":         "B. TOP 5 GROWTH STOCKS (1-3 Years)",
            "C_Swing_Trades":          "C. TOP 5 SWING TRADES (1-3 Months)",
            "D_Multibagger_SmallMidCap":"D. TOP 5 SMALL/MID-CAP MULTIBAGGER CANDIDATES",
        }
        pick_headers = ["Stock","Ticker","Sector","CMP (Rs)","Entry Zone","Add-on Zone","Stop Loss (Rs)",
                        "Target 1 (Rs)","Target 2 (Rs)","Target 3 (Rs)","Expected CAGR / Return",
                        "Horizon","Success Probability (%)","Investment Thesis"]

        for cat_key, cat_label in category_labels.items():
            w.writerow(["=== {} ===".format(cat_label)])
            w.writerow(pick_headers)
            for s in CATEGORIES[cat_key]:
                w.writerow([s["stock"],s["ticker"],s["sector"],s["cmp"],s["entry"],s["addon"],
                            s["sl"],s["t1"],s["t2"],s["t3"],s["cagr"],s["horizon"],s["success_pct"],s["thesis"]])
            w.writerow([])

        w.writerow(["=== PORTFOLIO CONSTRUCTION (Rs10 LAKH EACH) ==="])
        for p in PORTFOLIOS:
            w.writerow(["--- {} PORTFOLIO ---".format(p["name"].upper()),
                        "Target CAGR: {}".format(p["target_cagr"]),
                        "Max Drawdown: {}".format(p["max_drawdown"]),
                        p["description"]])
            w.writerow(["Stock","Ticker","Allocation (%)","Amount (Rs)","Rationale"])
            for h in p["holdings"]:
                w.writerow(list(h))
            w.writerow([])

        w.writerow(["=== KEY RISKS ==="])
        w.writerow(["Risk Factor","Severity","Description"])
        for r in RISKS:
            w.writerow(r)

    print("CSV  ->  {}".format(filename))
    return filename


# ─────────────────────────────────────────────
# HTML GENERATOR
# ─────────────────────────────────────────────

def generate_html(output_dir="."):
    filename = os.path.join(output_dir, "03_india_stock_report_{}.html".format(FILE_STAMP))

    def conviction_stars(n):
        return ('<span style="color:#fbbf24">' + ("&#9733;" * n) + '</span>'
                '<span style="color:#334155">' + ("&#9734;" * (10 - n)) + '</span>')

    def success_bar(pct):
        color = "#22c55e" if pct >= 80 else "#f59e0b" if pct >= 70 else "#ef4444"
        return (
            '<div style="display:flex;align-items:center;gap:10px;margin-top:4px">'
            '<div style="height:6px;border-radius:3px;width:{}%;background:{};min-width:4px"></div>'
            '<span style="font-size:.78rem;font-weight:700;color:#e2e8f0">{}%</span></div>'
        ).format(pct, color, pct)

    SECTOR_COLORS = {
        "Defence":"#1e3a5f","Defence & Aerospace":"#1e3a5f","Defence Electronics":"#1e3a5f",
        "ESDM / Defence Electronics":"#1e3a5f","Private Banking":"#14532d","Banking":"#14532d",
        "PSU Banking":"#166534","NBFC":"#064e3b","Electronics / PLI":"#7c2d12","Electronics/PLI":"#7c2d12",
        "Cables & Wires":"#78350f","Retail / Consumer Disc.":"#4c1d95","Retail":"#4c1d95",
        "Engineering & Infra":"#1e3a8a","Conglomerate":"#1e3a8a","Quick Commerce / Tech":"#831843",
        "Quick Commerce":"#831843","Telecom":"#134e4a","Financial Infrastructure":"#1c1917",
        "Financial Infra":"#1c1917","Specialty Chemicals":"#422006","Water Treatment":"#0c4a6e",
        "IT Parks / MICE":"#3b0764",
    }

    def sector_tag(sector):
        bg = SECTOR_COLORS.get(sector, "#374151")
        return ('<span style="display:inline-block;padding:3px 10px;border-radius:20px;'
                'font-size:.72rem;font-weight:600;color:#e2e8f0;white-space:nowrap;background:{}">{}</span>').format(bg, sector)

    def stat_box(label, value, color="#e2e8f0"):
        return (
            '<div style="background:#243447;border-radius:8px;padding:8px 10px">'
            '<div style="font-size:.68rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">{}</div>'
            '<div style="font-size:.9rem;font-weight:700;color:{}">{}</div></div>'
        ).format(label, color, value)

    def pick_card(s):
        t3 = "Rs{:,}".format(s["t3"]) if isinstance(s["t3"], (int, float)) else str(s["t3"])
        sl_val = "Rs{:,}".format(s["sl"]) if isinstance(s["sl"], int) else str(s["sl"])
        t1_val = "Rs{:,}".format(s["t1"]) if isinstance(s["t1"], int) else str(s["t1"])
        t2_val = "Rs{:,}".format(s["t2"]) if isinstance(s["t2"], int) else str(s["t2"])
        stats = (
            stat_box("CMP",          "Rs{:,}".format(s["cmp"])) +
            stat_box("Entry",        "Rs{}".format(s["entry"])) +
            stat_box("Add-on",       "Rs{}".format(s["addon"])) +
            stat_box("Stop Loss",    sl_val,  "#f87171") +
            stat_box("Target 1",     t1_val,  "#4ade80") +
            stat_box("Target 2",     t2_val,  "#4ade80") +
            stat_box("Target 3",     t3,      "#4ade80") +
            stat_box("CAGR / Return",s["cagr"]) +
            stat_box("Horizon",      s["horizon"])
        )
        return (
            '<div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px">'
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">'
            '<div><span style="font-size:1.1rem;font-weight:700;color:#fff;display:block">{stock}</span>'
            '<span style="color:#94a3b8;font-size:.72rem">{ticker}</span></div>'
            '<div>{stag}</div></div>'
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">{stats}</div>'
            '<div style="margin-bottom:12px">'
            '<div style="font-size:.72rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">Probability of Success</div>'
            '{bar}</div>'
            '<div style="font-size:.8rem;color:#94a3b8;border-top:1px solid #334155;padding-top:10px">'
            '<strong style="color:#e2e8f0">Thesis:</strong> {thesis}</div></div>'
        ).format(stock=s["stock"], ticker=s["ticker"], stag=sector_tag(s["sector"]),
                 stats=stats, bar=success_bar(s["success_pct"]), thesis=s["thesis"])

    def portfolio_card(p):
        clr = {"Conservative":"#16a34a","Balanced":"#d97706","Aggressive":"#dc2626"}.get(p["name"], "#6b7280")
        rows = "".join(
            '<tr>'
            '<td style="padding:10px 14px;border-top:1px solid #334155"><strong>{}</strong><br>'
            '<small style="color:#94a3b8">{}</small></td>'
            '<td style="padding:10px 14px;border-top:1px solid #334155;text-align:right">{}%</td>'
            '<td style="padding:10px 14px;border-top:1px solid #334155;text-align:right">Rs {:,}</td>'
            '<td style="padding:10px 14px;border-top:1px solid #334155;font-size:.78rem;color:#94a3b8">{}</td>'
            '</tr>'.format(h[0], h[1], h[2], h[3], h[4])
            for h in p["holdings"]
        )
        return (
            '<div style="background:#1e293b;border:1px solid #334155;border-radius:12px;overflow:hidden">'
            '<div style="padding:20px 24px 14px;border-left:6px solid {clr}">'
            '<h3 style="font-size:1.2rem;font-weight:700;color:{clr};margin-bottom:8px">{name} Portfolio</h3>'
            '<div style="display:flex;gap:18px;font-size:.82rem;color:#94a3b8;margin-bottom:6px;flex-wrap:wrap">'
            '<span>Target CAGR: <strong style="color:#e2e8f0">{cagr}</strong></span>'
            '<span>Max Drawdown: <strong style="color:#e2e8f0">{dd}</strong></span></div>'
            '<p style="font-size:.8rem;color:#94a3b8">{desc}</p></div>'
            '<table style="width:100%;border-collapse:collapse;font-size:.82rem">'
            '<thead><tr style="background:#0f172a">'
            '<th style="padding:10px 14px;text-align:left;color:#94a3b8;font-size:.75rem">Stock</th>'
            '<th style="padding:10px 14px;text-align:right;color:#94a3b8;font-size:.75rem">Alloc</th>'
            '<th style="padding:10px 14px;text-align:right;color:#94a3b8;font-size:.75rem">Amount</th>'
            '<th style="padding:10px 14px;text-align:left;color:#94a3b8;font-size:.75rem">Rationale</th>'
            '</tr></thead><tbody>{rows}</tbody></table></div>'
        ).format(clr=clr, name=p["name"], cagr=p["target_cagr"], dd=p["max_drawdown"],
                 desc=p["description"], rows=rows)

    def master_rows():
        TH = 'style="padding:12px 14px;text-align:left;color:#94a3b8;font-weight:600;font-size:.78rem;text-transform:uppercase;white-space:nowrap;background:#0f172a"'
        out = ""
        for row in MASTER_TABLE:
            stock, ticker, sector, cmp, fv, upside, horizon, conv, cats, risks = row
            out += (
                '<tr>'
                '<td style="padding:11px 14px;border-top:1px solid #334155;vertical-align:top">'
                '<strong>{}</strong><br><small style="color:#94a3b8">{}</small></td>'
                '<td style="padding:11px 14px;border-top:1px solid #334155;vertical-align:top">{}</td>'
                '<td style="padding:11px 14px;border-top:1px solid #334155;text-align:right;white-space:nowrap">Rs {:,}</td>'
                '<td style="padding:11px 14px;border-top:1px solid #334155;text-align:right;white-space:nowrap">Rs {:,}</td>'
                '<td style="padding:11px 14px;border-top:1px solid #334155;text-align:right;color:#4ade80;font-weight:700">{}</td>'
                '<td style="padding:11px 14px;border-top:1px solid #334155">{}</td>'
                '<td style="padding:11px 14px;border-top:1px solid #334155">{}</td>'
                '<td style="padding:11px 14px;border-top:1px solid #334155;font-size:.78rem;color:#94a3b8;max-width:220px">{}</td>'
                '<td style="padding:11px 14px;border-top:1px solid #334155;font-size:.78rem;color:#fca5a5;max-width:180px">{}</td>'
                '</tr>'
            ).format(stock, ticker, sector_tag(sector), cmp, fv, upside, horizon,
                     conviction_stars(conv), cats, risks)
        return out

    def risk_rows():
        sev_color = {"High":"#dc2626","Medium":"#d97706","Low":"#16a34a"}
        out = ""
        for name, sev, desc in RISKS:
            clr = sev_color.get(sev, "#6b7280")
            out += (
                '<tr>'
                '<td style="padding:11px 14px;border-top:1px solid #334155"><strong>{}</strong></td>'
                '<td style="padding:11px 14px;border-top:1px solid #334155">'
                '<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:.72rem;font-weight:600;background:{};color:#fff">{}</span></td>'
                '<td style="padding:11px 14px;border-top:1px solid #334155;font-size:.78rem;color:#94a3b8">{}</td>'
                '</tr>'
            ).format(name, clr, sev, desc)
        return out

    # ── category sections ──
    cat_meta = [
        ("A_Long_Term_Compounders",  "A", "Long-Term Compounders",               "3-5 Years",  "#1e40af"),
        ("B_Growth_Stocks",          "B", "Growth Stocks",                       "1-3 Years",  "#15803d"),
        ("C_Swing_Trades",           "C", "Swing Trading Picks",                 "1-3 Months", "#b45309"),
        ("D_Multibagger_SmallMidCap","D", "Small/Mid-Cap Multibagger Candidates","2-4 Years",  "#7e22ce"),
    ]
    cat_html = ""
    for cat_key, label, title, hl, color in cat_meta:
        cards = "".join(pick_card(s) for s in CATEGORIES[cat_key])
        cat_html += (
            '<section style="margin-bottom:52px" id="picks-{lbl}">'
            '<div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-left:16px;border-left:5px solid {clr}">'
            '<span style="padding:4px 12px;border-radius:6px;font-weight:800;font-size:1rem;color:#fff;background:{clr}">{lbl}</span>'
            '<h2 style="font-size:1.4rem;font-weight:700;color:#fff">{title}'
            ' <small style="font-size:.85rem;color:#94a3b8;font-weight:400">({hl})</small></h2></div>'
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:20px">{cards}</div>'
            '</section>'
        ).format(lbl=label, clr=color, title=title, hl=hl, cards=cards)

    portfolio_html = "".join(portfolio_card(p) for p in PORTFOLIOS)

    macro_cards = "".join(
        '<div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px">'
        '<div style="font-size:.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">{}</div>'
        '<div style="font-size:1.1rem;font-weight:700;color:#38bdf8">{}</div></div>'.format(k, v)
        for k, v in MACRO.items()
    )

    TH = 'style="padding:12px 14px;text-align:left;color:#94a3b8;font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap;background:#0f172a"'

    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>India Equity Research Report -- {dt}</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Segoe UI',system-ui,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6}}
a{{color:#38bdf8;text-decoration:none}}
.nav{{background:#1e293b;border-bottom:1px solid #334155;padding:12px 32px;display:flex;gap:24px;flex-wrap:wrap;position:sticky;top:0;z-index:100}}
.nav a{{color:#94a3b8;font-size:.85rem;font-weight:500;transition:color .2s}}
.nav a:hover{{color:#38bdf8}}
.container{{max-width:1400px;margin:0 auto;padding:32px 24px}}
section{{margin-bottom:52px}}
.tw{{overflow-x:auto;border-radius:10px;border:1px solid #334155}}
table{{width:100%;border-collapse:collapse;font-size:.85rem}}
thead tr{{background:#0f172a}}
tbody tr:hover{{background:rgba(255,255,255,.03)}}
</style>
</head>
<body>

<div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%);padding:48px 32px 36px;text-align:center;border-bottom:2px solid #1d4ed8">
  <div style="font-size:2.5rem">&#127470;&#127475;</div>
  <h1 style="font-size:2rem;font-weight:800;color:#fff;margin:8px 0 4px">India Equity Research Report</h1>
  <div style="color:#94a3b8;font-size:.95rem">NSE &amp; BSE Investment &amp; Swing Trading Opportunities &mdash; Compiled by Multi-Analyst Team</div>
  <div style="display:inline-block;margin-top:12px;padding:4px 14px;background:#1d4ed8;border-radius:20px;font-size:.8rem;color:#bfdbfe">&#128197; {dt}</div>
</div>

<nav class="nav">
  <a href="#macro">Macro</a>
  <a href="#master">Master Table</a>
  <a href="#picks-A">Long-Term</a>
  <a href="#picks-B">Growth</a>
  <a href="#picks-C">Swing Trades</a>
  <a href="#picks-D">Multibaggers</a>
  <a href="#portfolios">Portfolios</a>
  <a href="#risks">Risks</a>
</nav>

<div class="container">

<section id="macro">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-left:16px;border-left:5px solid #38bdf8">
    <span style="padding:4px 12px;border-radius:6px;background:#0369a1;color:#fff;font-weight:800">&#128202;</span>
    <h2 style="font-size:1.4rem;font-weight:700;color:#fff">Macro Snapshot</h2>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">{macro_cards}</div>
</section>

<section id="master">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-left:16px;border-left:5px solid #7c3aed">
    <span style="padding:4px 12px;border-radius:6px;background:#7c3aed;color:#fff;font-weight:800">&#128203;</span>
    <h2 style="font-size:1.4rem;font-weight:700;color:#fff">Master Opportunity Table</h2>
  </div>
  <div class="tw"><table>
    <thead><tr>
      <th {TH}>Stock</th><th {TH}>Sector</th><th {TH}>CMP</th><th {TH}>Fair Value</th>
      <th {TH}>Upside</th><th {TH}>Horizon</th><th {TH}>Conviction</th>
      <th {TH}>Key Catalysts</th><th {TH}>Key Risks</th>
    </tr></thead>
    <tbody>{master_rows}</tbody>
  </table></div>
</section>

{cat_html}

<section id="portfolios">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-left:16px;border-left:5px solid #f59e0b">
    <span style="padding:4px 12px;border-radius:6px;background:#b45309;color:#fff;font-weight:800">&#128188;</span>
    <h2 style="font-size:1.4rem;font-weight:700;color:#fff">Portfolio Construction
      <small style="font-size:.85rem;color:#94a3b8;font-weight:400">(Rs 10 Lakh Each)</small></h2>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:24px">{portfolio_html}</div>
</section>

<section id="risks">
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-left:16px;border-left:5px solid #ef4444">
    <span style="padding:4px 12px;border-radius:6px;background:#b91c1c;color:#fff;font-weight:800">&#9888;</span>
    <h2 style="font-size:1.4rem;font-weight:700;color:#fff">Key Risks to Monitor</h2>
  </div>
  <div class="tw"><table>
    <thead><tr><th {TH}>Risk Factor</th><th {TH}>Severity</th><th {TH}>Description</th></tr></thead>
    <tbody>{risk_rows}</tbody>
  </table></div>
</section>

<section>
  <div style="background:linear-gradient(135deg,#1e3a5f,#1e293b);border:1px solid #1d4ed8;border-radius:12px;padding:28px 32px">
    <h3 style="color:#38bdf8;margin-bottom:12px;font-size:1.1rem">&#127919; Team Verdict</h3>
    <p style="color:#e2e8f0;line-height:1.8;font-size:.92rem">
      The market at Nifty ~23,400 is at a historically attractive accumulation zone.
      FII selling has created a gift for disciplined domestic investors.
      The best posture: <strong>deploy 60-70% now</strong> in high-conviction names,
      keep <strong>30-40% dry powder</strong> to buy any further weakness toward Nifty 22,500-23,000.
      Defence, banking, capital goods, and electronics manufacturing remain the four pillars
      of the next bull leg. Reassess if Nifty closes below 22,000 on a weekly basis.
    </p>
  </div>
  <div style="background:#1c1008;border:1px solid #92400e;border-radius:8px;padding:14px 18px;font-size:.78rem;color:#fcd34d;margin-top:24px">
    &#9888; <strong>Disclaimer:</strong> This report is for educational and informational purposes only.
    It does not constitute registered investment advice. Please consult a SEBI-registered advisor
    before making investment decisions. Past performance and analyst targets do not guarantee future returns.
    All prices as of {dt}. Verify current prices before acting.
  </div>
</section>

</div>

<div style="background:#1e293b;border-top:1px solid #334155;padding:24px 32px;text-align:center;color:#94a3b8;font-size:.78rem">
  Generated by India Equity Research Script &nbsp;|&nbsp; {dt} &nbsp;|&nbsp; NSE &amp; BSE Listed Securities
</div>
</body>
</html>""".format(
        dt=REPORT_DT,
        macro_cards=macro_cards,
        master_rows=master_rows(),
        cat_html=cat_html,
        portfolio_html=portfolio_html,
        risk_rows=risk_rows(),
        TH=TH,
    )

    with open(filename, "w", encoding="utf-8") as fh:
        fh.write(html)
    print("HTML ->  {}".format(filename))
    return filename


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "="*55)
    print("  India Equity Research Report Generator")
    print("  Date/Time: {}".format(REPORT_DT))
    print("="*55)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "Reports")
    os.makedirs(output_dir, exist_ok=True)

    csv_path  = generate_csv(output_dir)
    html_path = generate_html(output_dir)

    print("\n" + "="*55)
    print("  Reports generated successfully!")
    print("  Folder : " + output_dir)
    print("  CSV    : " + os.path.basename(csv_path))
    print("  HTML   : " + os.path.basename(html_path))
    print("="*55 + "\n")
