"""
High Conviction Swing Strategy Scanner
========================================
4-Pillar Scoring System (0-100 pts):
  Fundamental  : 20 pts  (ROCE, profit growth, debt)
  Technical    : 25 pts  (DMA 200, DMA 50, RSI)
  Volume       : 25 pts  (volume ratio, volume trend)
  Options      : 30 pts  (PCR, max pain, OI support)

Entry only when total score >= 70
High conviction entry when score >= 85

Data sources:
  - swing_watchlist.html  : fundamentals + stock list
  - Yahoo Finance (yfinance): OHLCV for technical + volume
  - NSE options API       : PCR, max pain, OI

Run: python strategy_scanner.py
"""

import os, sys, re, time, warnings
from datetime import datetime, timedelta
from collections import defaultdict

warnings.filterwarnings("ignore")

try:
    import yfinance as yf
except ImportError:
    print("[ERROR] yfinance not installed. Run: pip install yfinance")
    sys.exit(1)

try:
    import numpy as np
    import pandas as pd
except ImportError:
    print("[ERROR] pandas/numpy not installed. Run: pip install pandas numpy")
    sys.exit(1)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("[ERROR] requests/bs4 not installed. Run: pip install requests beautifulsoup4")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR  = os.path.join(SCRIPT_DIR, "Reports")
WATCHLIST    = os.path.join(REPORTS_DIR, "swing_watchlist.html")
TIMESTAMP    = datetime.now().strftime("%Y%m%d_%H%M%S")
DISPLAY_TS   = datetime.now().strftime("%d %b %Y, %I:%M %p")
OUT_FILE     = os.path.join(REPORTS_DIR, "04_strategy_conviction_" + TIMESTAMP + ".html")

os.makedirs(REPORTS_DIR, exist_ok=True)

# Scoring thresholds
ENTRY_SCORE    = 70   # minimum score to signal BUY
HC_SCORE       = 85   # high conviction threshold
TARGET_PCT     = 12   # target profit %
STOP_PCT       = 7    # stop loss %
BACKTEST_DAYS  = 60   # days to backtest
HOLD_DAYS      = 20   # max hold period for backtest

# ---------------------------------------------------------------------------
# Step 1 — Read watchlist
# ---------------------------------------------------------------------------

def load_watchlist():
    """Parse swing_watchlist.html and return list of stock dicts."""
    if not os.path.exists(WATCHLIST):
        print("[ERROR] swing_watchlist.html not found at: " + WATCHLIST)
        print("  Run 04_run_screener.bat first to generate the watchlist.")
        sys.exit(1)

    with open(WATCHLIST, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    stocks = []
    for card in soup.find_all("div", class_="card"):
        # Name and URL
        link = card.find("a")
        if not link:
            continue
        name = link.get_text(strip=True)
        url  = link.get("href", "")

        # Extract NSE ticker from screener.in URL
        # URL pattern: https://www.screener.in/company/TICKER/ or /company/TICKER/consolidated/
        m = re.search(r"/company/([^/]+)/", url)
        ticker = m.group(1).upper() if m else ""

        # Metrics from the card
        def get_metric(label_kw):
            for ml in card.find_all("div", class_="ml"):
                if label_kw.lower() in ml.get_text(strip=True).lower():
                    mv = ml.find_previous_sibling("div", class_="mv") or \
                         ml.parent.find("div", class_="mv")
                    if mv:
                        txt = mv.get_text(strip=True).rstrip("%")
                        try: return float(txt)
                        except: return None
            return None

        roce = get_metric("ROCE")
        sg   = get_metric("Sales 3Y")
        pg   = get_metric("Profit 3Y")
        pe   = get_metric("P/E")
        r1   = get_metric("1Y Return")

        # Number of scan appearances (conviction count)
        chips = card.find_all("span", class_="scan-chip")
        scan_count = len(chips)
        scan_ids   = [c.get_text(strip=True) for c in chips]

        if not ticker:
            continue

        stocks.append({
            "name":       name,
            "ticker":     ticker,
            "url":        url,
            "roce":       roce,
            "sg":         sg,
            "pg":         pg,
            "pe":         pe,
            "r1":         r1,
            "scan_count": scan_count,
            "scan_ids":   scan_ids,
        })

    print("[OK] Loaded " + str(len(stocks)) + " stocks from watchlist.")
    return stocks


# ---------------------------------------------------------------------------
# Step 2 — Technical + Volume (Yahoo Finance)
# ---------------------------------------------------------------------------

def safe_float(v):
    try: return float(v)
    except: return None


def calc_rsi(closes, period=14):
    """Wilder RSI from a pandas Series of close prices."""
    delta = closes.diff()
    gain  = delta.clip(lower=0)
    loss  = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period).mean()
    rs  = avg_gain / avg_loss.replace(0, float("nan"))
    rsi = 100 - 100 / (1 + rs)
    return rsi


def fetch_technicals(ticker_ns, days=200):
    """
    Download OHLCV from Yahoo Finance for NSE stock.
    Returns dict with technical and volume metrics, or None on failure.
    """
    try:
        df = yf.download(ticker_ns, period=str(days) + "d",
                         auto_adjust=True, progress=False)
        if df is None or len(df) < 50:
            return None

        closes  = df["Close"].squeeze()
        volumes = df["Volume"].squeeze()

        dma_200 = float(closes.tail(200).mean()) if len(closes) >= 200 else float(closes.mean())
        dma_50  = float(closes.tail(50).mean())  if len(closes) >= 50  else float(closes.mean())
        rsi_ser = calc_rsi(closes)
        rsi     = float(rsi_ser.iloc[-1]) if not rsi_ser.empty else 50.0

        cmp_now   = float(closes.iloc[-1])
        vol_today = float(volumes.iloc[-1])
        vol_20d   = float(volumes.tail(20).mean())
        vol_5d    = float(volumes.tail(5).mean())
        vol_ratio = vol_today / vol_20d if vol_20d > 0 else 1.0
        vol_trend = vol_5d / vol_20d if vol_20d > 0 else 1.0  # > 1 = rising

        # 52-week high (approx — last 252 trading days)
        high_52w = float(closes.tail(252).max()) if len(closes) >= 50 else float(closes.max())

        return {
            "cmp":       cmp_now,
            "dma_200":   dma_200,
            "dma_50":    dma_50,
            "rsi":       rsi,
            "vol_today": vol_today,
            "vol_20d":   vol_20d,
            "vol_ratio": vol_ratio,  # today / 20D avg
            "vol_trend": vol_trend,  # 5D avg / 20D avg
            "high_52w":  high_52w,
            "pct_52w":   cmp_now / high_52w * 100 if high_52w > 0 else 0,
            "df":        df,          # for backtest
        }
    except Exception as e:
        print("    [WARN] Yahoo Finance error for " + ticker_ns + ": " + str(e)[:80])
        return None


# ---------------------------------------------------------------------------
# Step 3 — Options Data (NSE)
# ---------------------------------------------------------------------------

NSE_HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept":          "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer":         "https://www.nseindia.com",
    "Connection":      "keep-alive",
}

_nse_session = None

def get_nse_session():
    global _nse_session
    if _nse_session is None:
        s = requests.Session()
        s.headers.update(NSE_HEADERS)
        try:
            s.get("https://www.nseindia.com", timeout=12)
            time.sleep(1)
            _nse_session = s
        except Exception as e:
            print("    [WARN] Could not establish NSE session: " + str(e)[:60])
            _nse_session = s
    return _nse_session


def calc_max_pain(records):
    """
    Max pain = strike where total ITM value (payout to buyers) is minimised.
    Returns (max_pain_strike, pain_dict).
    """
    pain = {}
    strikes_data = {}
    for d in records:
        sp = d.get("strikePrice", 0)
        ce_oi = d.get("CE", {}).get("openInterest", 0)
        pe_oi = d.get("PE", {}).get("openInterest", 0)
        strikes_data[sp] = {"ce_oi": ce_oi, "pe_oi": pe_oi}

    for test_sp in strikes_data:
        total = 0
        for sp, oi in strikes_data.items():
            if sp < test_sp:
                total += (test_sp - sp) * oi["ce_oi"]
            elif sp > test_sp:
                total += (sp - test_sp) * oi["pe_oi"]
        pain[test_sp] = total

    if not pain:
        return None, {}
    return min(pain, key=pain.get), pain


def fetch_options(symbol):
    """
    Fetch NSE options chain and return:
      pcr          : put/call OI ratio
      max_pain     : max pain strike price
      total_ce_oi  : total call open interest
      total_pe_oi  : total put open interest
      put_support  : highest put OI strike below ATM (support level)
    """
    try:
        session = get_nse_session()
        url = "https://www.nseindia.com/api/option-chain-equities?symbol=" + symbol
        r = session.get(url, timeout=12)
        if r.status_code != 200:
            return None
        data = r.json()
        records = data.get("records", {}).get("data", [])
        if not records:
            return None

        total_ce = sum(d.get("CE", {}).get("openInterest", 0) for d in records)
        total_pe = sum(d.get("PE", {}).get("openInterest", 0) for d in records)
        pcr = total_pe / total_ce if total_ce > 0 else 1.0

        max_pain_strike, _ = calc_max_pain(records)

        # Underlying price
        ul_price = data.get("records", {}).get("underlyingValue", 0)

        # Put support: highest put OI concentration below ATM
        put_strikes = [(d["strikePrice"], d.get("PE", {}).get("openInterest", 0))
                       for d in records if "PE" in d and d["strikePrice"] < ul_price]
        put_support = max(put_strikes, key=lambda x: x[1])[0] if put_strikes else None

        time.sleep(0.8)  # polite delay

        return {
            "pcr":          pcr,
            "max_pain":     max_pain_strike,
            "ul_price":     ul_price,
            "total_ce_oi":  total_ce,
            "total_pe_oi":  total_pe,
            "put_support":  put_support,
        }
    except Exception as e:
        return None


# ---------------------------------------------------------------------------
# Step 4 — Scoring Engine
# ---------------------------------------------------------------------------

def score_fundamental(stock):
    """
    Fundamental Quality: 20 pts
      ROCE > 30%       : 8 pts
      ROCE 20-30%      : 4 pts
      Profit 3Y > 30%  : 7 pts
      Profit 3Y 15-30% : 4 pts
      Multi-scan (4+)  : 5 pts
      Multi-scan (3)   : 3 pts
    """
    pts   = 0
    notes = []
    roce  = stock.get("roce") or 0
    pg    = stock.get("pg")   or 0
    sc    = stock.get("scan_count", 0)

    if roce >= 40:
        pts += 8; notes.append("ROCE " + str(roce) + "% [A+]")
    elif roce >= 30:
        pts += 7; notes.append("ROCE " + str(roce) + "% [A]")
    elif roce >= 20:
        pts += 4; notes.append("ROCE " + str(roce) + "% [B]")

    if pg >= 50:
        pts += 7; notes.append("ProfGrowth " + str(pg) + "%")
    elif pg >= 30:
        pts += 5; notes.append("ProfGrowth " + str(pg) + "%")
    elif pg >= 15:
        pts += 3; notes.append("ProfGrowth " + str(pg) + "%")

    if sc >= 4:
        pts += 5; notes.append("4-scan validated")
    elif sc >= 3:
        pts += 3; notes.append("3-scan validated")

    return min(pts, 20), notes


def score_technical(tech):
    """
    Technical Setup: 25 pts
      Above DMA 200   : 8 pts
      Above DMA 50    : 7 pts
      RSI 55-70       : 10 pts
      RSI 48-55       : 5 pts
      Near 52W high   : bonus up to 3 pts (embedded in RSI range)
    """
    if tech is None:
        return 0, ["No technical data"]

    pts   = 0
    notes = []
    cmp   = tech["cmp"]

    if cmp > tech["dma_200"]:
        pts += 8; notes.append("Above DMA200")
    else:
        notes.append("Below DMA200 [red flag]")

    if cmp > tech["dma_50"]:
        pts += 7; notes.append("Above DMA50")

    rsi = tech["rsi"]
    if 55 <= rsi <= 70:
        pts += 10; notes.append("RSI " + str(round(rsi, 1)) + " [ideal]")
    elif 70 < rsi <= 78:
        pts += 5;  notes.append("RSI " + str(round(rsi, 1)) + " [extended]")
    elif 48 <= rsi < 55:
        pts += 5;  notes.append("RSI " + str(round(rsi, 1)) + " [neutral]")
    elif rsi < 40:
        notes.append("RSI " + str(round(rsi, 1)) + " [oversold - wait]")

    pct_52w = tech.get("pct_52w", 0)
    if pct_52w >= 92:
        notes.append("Near 52W high (" + str(round(pct_52w, 1)) + "%)")

    return min(pts, 25), notes


def score_volume(tech):
    """
    Volume Analysis: 25 pts
      Vol > 2.0x 20D avg  : 15 pts  (strong breakout)
      Vol 1.5-2.0x        : 10 pts  (moderate breakout)
      Vol 1.0-1.5x        : 5 pts   (above average)
      5D avg > 20D avg    : 10 pts  (rising volume trend)
    """
    if tech is None:
        return 0, ["No volume data"]

    pts   = 0
    notes = []
    vr    = tech["vol_ratio"]
    vt    = tech["vol_trend"]

    if vr >= 2.0:
        pts += 15; notes.append("Vol " + str(round(vr, 1)) + "x avg [breakout]")
    elif vr >= 1.5:
        pts += 10; notes.append("Vol " + str(round(vr, 1)) + "x avg [strong]")
    elif vr >= 1.0:
        pts += 5;  notes.append("Vol " + str(round(vr, 1)) + "x avg")
    else:
        notes.append("Vol below avg (" + str(round(vr, 2)) + "x)")

    if vt >= 1.1:
        pts += 10; notes.append("Vol trend rising (5D/20D=" + str(round(vt, 2)) + "x)")
    elif vt >= 0.9:
        pts += 5;  notes.append("Vol trend flat")
    else:
        notes.append("Vol trend declining")

    return min(pts, 25), notes


def score_options(opt, tech):
    """
    Options Data: 30 pts
      PCR > 1.5           : 15 pts  (heavy put buying = contrarian bullish)
      PCR 1.2-1.5         : 10 pts
      PCR 0.8-1.2         : 5 pts   (neutral)
      Max pain > CMP      : 10 pts  (price should rise to max pain)
      Max pain near CMP   : 5 pts   (within 3%)
      Put support below   : 5 pts   (floor established by OI)
    """
    if opt is None:
        return 10, ["Options data unavailable (neutral 10pts)"]

    pts   = 0
    notes = []
    pcr   = opt.get("pcr", 1.0)
    mp    = opt.get("max_pain")
    cmp   = tech["cmp"] if tech else opt.get("ul_price", 0)
    ps    = opt.get("put_support")

    if pcr >= 1.5:
        pts += 15; notes.append("PCR " + str(round(pcr, 2)) + " [heavy puts=bullish]")
    elif pcr >= 1.2:
        pts += 10; notes.append("PCR " + str(round(pcr, 2)) + " [put bias=bullish]")
    elif pcr >= 0.8:
        pts += 5;  notes.append("PCR " + str(round(pcr, 2)) + " [neutral]")
    else:
        pts += 2;  notes.append("PCR " + str(round(pcr, 2)) + " [call bias=cautious]")

    if mp and cmp:
        mp_pct = (mp - cmp) / cmp * 100
        if mp_pct > 2:
            pts += 10; notes.append("Max Pain Rs." + str(mp) + " above CMP [bullish]")
        elif abs(mp_pct) <= 2:
            pts += 5;  notes.append("Max Pain Rs." + str(mp) + " near CMP")
        else:
            notes.append("Max Pain Rs." + str(mp) + " below CMP [caution]")

    if ps:
        pts += 5; notes.append("Put support at Rs." + str(ps))

    return min(pts, 30), notes


# ---------------------------------------------------------------------------
# Step 5 — Backtesting (Technical + Volume rules, last 60 days)
# ---------------------------------------------------------------------------

def backtest_stock(df):
    """
    Simulate the strategy on historical OHLCV data.
    Entry condition: Price above DMA200 + RSI 50-72 + Vol > 1.3x avg
    Target: +TARGET_PCT%, Stop: -STOP_PCT%
    Returns (win_rate, trades_total, trades_win, avg_gain, avg_loss).
    """
    if df is None or len(df) < 60:
        return None

    closes  = df["Close"].squeeze()
    volumes = df["Volume"].squeeze()
    highs   = df["High"].squeeze()
    lows    = df["Low"].squeeze()

    # Calculate indicators for full history
    rsi_series = calc_rsi(closes)
    dma200     = closes.rolling(200).mean()
    vol_avg20  = volumes.rolling(20).mean()

    trades = []
    i = 220  # start after warmup period
    while i < len(df) - HOLD_DAYS - 1:
        if i >= len(closes):
            break
        try:
            cmp      = float(closes.iloc[i])
            d200     = float(dma200.iloc[i]) if not pd.isna(dma200.iloc[i]) else None
            rsi_val  = float(rsi_series.iloc[i]) if not pd.isna(rsi_series.iloc[i]) else 50
            vol_now  = float(volumes.iloc[i])
            vol_avg  = float(vol_avg20.iloc[i]) if not pd.isna(vol_avg20.iloc[i]) else vol_now
            vol_r    = vol_now / vol_avg if vol_avg > 0 else 1.0
        except:
            i += 1
            continue

        # Entry conditions (technical + volume only for backtest)
        if (d200 and cmp > d200 and
                50 <= rsi_val <= 72 and
                vol_r >= 1.3):

            entry    = cmp
            target   = entry * (1 + TARGET_PCT / 100)
            stop_lvl = entry * (1 - STOP_PCT / 100)
            result   = None

            # Simulate forward for HOLD_DAYS
            for j in range(1, HOLD_DAYS + 1):
                if i + j >= len(df):
                    break
                try:
                    day_high = float(highs.iloc[i + j])
                    day_low  = float(lows.iloc[i + j])
                except:
                    break

                if day_high >= target:
                    result = "WIN"
                    gain   = TARGET_PCT
                    break
                if day_low <= stop_lvl:
                    result = "LOSS"
                    gain   = -STOP_PCT
                    break

            if result in ("WIN", "LOSS"):
                trades.append({"result": result, "gain": gain})

            i += max(HOLD_DAYS // 2, 5)  # avoid overlapping trades
        else:
            i += 1

    if not trades:
        return None

    wins   = [t for t in trades if t["result"] == "WIN"]
    losses = [t for t in trades if t["result"] == "LOSS"]
    total  = len(trades)
    wr     = len(wins) / total * 100
    avg_g  = sum(t["gain"] for t in wins)  / len(wins)  if wins   else 0
    avg_l  = sum(t["gain"] for t in losses) / len(losses) if losses else 0

    return {
        "win_rate":   round(wr, 1),
        "total":      total,
        "wins":       len(wins),
        "losses":     len(losses),
        "avg_gain":   round(avg_g, 1),
        "avg_loss":   round(avg_l, 1),
        "expectancy": round((wr/100 * avg_g) + ((1-wr/100) * avg_l), 2),
    }


# ---------------------------------------------------------------------------
# Step 6 — HTML Report Builder
# ---------------------------------------------------------------------------

def tier_label(score):
    if score >= HC_SCORE:   return "HIGH CONVICTION", "#14532d", "#4ade80"
    if score >= ENTRY_SCORE: return "BUY",             "#1e3a5f", "#60a5fa"
    if score >= 60:          return "WATCH",           "#422006", "#fb923c"
    return "SKIP", "#1c1917", "#78716c"


def bar(pct, color):
    w = max(0, min(100, int(pct)))
    return ("<div style='background:#1e293b;border-radius:999px;height:6px;flex:1;overflow:hidden'>"
            "<div style='height:100%;width:" + str(w) + "%;background:" + color +
            ";border-radius:999px'></div></div>")


def pillar_html(label, pts, max_pts, notes_list, color):
    pct  = pts / max_pts * 100
    note = " &bull; ".join(notes_list[:3]) if notes_list else ""
    return (
        "<div style='margin-bottom:.6rem'>"
        "<div style='display:flex;align-items:center;gap:.5rem;margin-bottom:.2rem'>"
        "<span style='font-size:.68rem;font-weight:700;text-transform:uppercase;"
        "letter-spacing:.06em;color:#64748b;width:80px'>" + label + "</span>"
        + bar(pct, color)
        + "<span style='font-size:.75rem;font-weight:700;color:" + color + ";min-width:36px;text-align:right'>"
        + str(pts) + "/" + str(max_pts) + "</span>"
        "</div>"
        "<div style='font-size:.68rem;color:#475569;padding-left:88px'>" + note + "</div>"
        "</div>"
    )


def build_card(stock, tech, opt, bt):
    f_pts, f_notes = score_fundamental(stock)
    t_pts, t_notes = score_technical(tech)
    v_pts, v_notes = score_volume(tech)
    o_pts, o_notes = score_options(opt, tech)
    total = f_pts + t_pts + v_pts + o_pts

    tier, tier_bg, tier_fg = tier_label(total)
    scan_chips = "".join(
        "<span style='background:#1e293b;border:1px solid #334155;border-radius:999px;"
        "padding:.08rem .45rem;font-size:.62rem;color:#94a3b8'>" + s + "</span>"
        for s in stock.get("scan_ids", [])
    )

    cmp  = tech["cmp"]   if tech else 0
    tgt  = cmp * (1 + TARGET_PCT / 100) if cmp else 0
    stop = cmp * (1 - STOP_PCT / 100)   if cmp else 0
    rr   = TARGET_PCT / STOP_PCT

    url  = stock.get("url", "")
    name_html = ("<a href='" + url + "' target='_blank' style='color:#93c5fd;"
                 "text-decoration:none;font-weight:700;font-size:1rem'>"
                 + stock["name"] + "</a>") if url else stock["name"]

    # Backtest section
    if bt:
        wr_color = "#4ade80" if bt["win_rate"] >= 70 else ("#fb923c" if bt["win_rate"] >= 55 else "#f87171")
        bt_html = (
            "<div style='background:#0f172a;border:1px solid #1e293b;border-radius:8px;"
            "padding:.6rem .85rem;margin-top:.6rem'>"
            "<div style='font-size:.65rem;font-weight:700;color:#475569;text-transform:uppercase;"
            "letter-spacing:.06em;margin-bottom:.35rem'>60-Day Backtest (Tech+Vol rules)</div>"
            "<div style='display:flex;gap:1rem;flex-wrap:wrap'>"
            "<div style='text-align:center'><div style='font-size:1.1rem;font-weight:800;color:"
            + wr_color + "'>" + str(bt["win_rate"]) + "%</div>"
            "<div style='font-size:.62rem;color:#475569'>Win Rate</div></div>"
            "<div style='text-align:center'><div style='font-size:1.1rem;font-weight:800;color:#e2e8f0'>"
            + str(bt["total"]) + "</div>"
            "<div style='font-size:.62rem;color:#475569'>Trades</div></div>"
            "<div style='text-align:center'><div style='font-size:1.1rem;font-weight:800;color:#4ade80'>"
            + str(bt["wins"]) + "</div>"
            "<div style='font-size:.62rem;color:#475569'>Wins</div></div>"
            "<div style='text-align:center'><div style='font-size:1.1rem;font-weight:800;color:#f87171'>"
            + str(bt["losses"]) + "</div>"
            "<div style='font-size:.62rem;color:#475569'>Losses</div></div>"
            "<div style='text-align:center'><div style='font-size:1.1rem;font-weight:800;color:#fbbf24'>"
            + str(bt["expectancy"]) + "%</div>"
            "<div style='font-size:.62rem;color:#475569'>Expectancy</div></div>"
            "</div></div>"
        )
    else:
        bt_html = "<div style='font-size:.7rem;color:#475569;margin-top:.5rem'>Backtest: insufficient history</div>"

    return (
        "<div style='background:#111827;border:1px solid #1e293b;border-radius:12px;"
        "padding:1.1rem 1.25rem;margin-bottom:.9rem'>"
        # Header
        "<div style='display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap'>"
        "<div>"
        "<div style='display:flex;align-items:center;gap:.6rem;flex-wrap:wrap'>"
        + name_html
        + "<span style='background:" + tier_bg + ";color:" + tier_fg + ";border-radius:999px;"
        "padding:.15rem .7rem;font-size:.68rem;font-weight:800;letter-spacing:.06em'>"
        + tier + "</span>"
        "</div>"
        "<div style='display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.35rem'>" + scan_chips + "</div>"
        "</div>"
        # Score circle
        "<div style='text-align:center;flex-shrink:0'>"
        "<div style='font-size:2rem;font-weight:900;line-height:1;color:" + tier_fg + "'>"
        + str(total) + "</div>"
        "<div style='font-size:.62rem;color:#475569;text-transform:uppercase'>/ 100</div>"
        "</div>"
        "</div>"
        # Pillar scores
        "<div style='margin-top:.85rem;border-top:1px solid #1e293b;padding-top:.75rem'>"
        + pillar_html("Fundamental", f_pts, 20, f_notes, "#a78bfa")
        + pillar_html("Technical",   t_pts, 25, t_notes, "#60a5fa")
        + pillar_html("Volume",      v_pts, 25, v_notes, "#34d399")
        + pillar_html("Options",     o_pts, 30, o_notes, "#fbbf24")
        + "</div>"
        # Trade parameters
        "<div style='display:flex;gap:.75rem;flex-wrap:wrap;margin-top:.6rem;"
        "background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:.6rem .85rem'>"
        "<div><div style='font-size:.65rem;color:#475569'>CMP</div>"
        "<div style='font-weight:700;color:#e2e8f0'>Rs." + ("%.1f" % cmp if cmp else "-") + "</div></div>"
        "<div><div style='font-size:.65rem;color:#475569'>Target +" + str(TARGET_PCT) + "%</div>"
        "<div style='font-weight:700;color:#4ade80'>Rs." + ("%.1f" % tgt if tgt else "-") + "</div></div>"
        "<div><div style='font-size:.65rem;color:#475569'>Stop -" + str(STOP_PCT) + "%</div>"
        "<div style='font-weight:700;color:#f87171'>Rs." + ("%.1f" % stop if stop else "-") + "</div></div>"
        "<div><div style='font-size:.65rem;color:#475569'>R:R Ratio</div>"
        "<div style='font-weight:700;color:#fbbf24'>" + ("%.1f" % rr) + ":1</div></div>"
        "<div><div style='font-size:.65rem;color:#475569'>RSI</div>"
        "<div style='font-weight:700;color:#e2e8f0'>" + (str(round(tech["rsi"],1)) if tech else "-") + "</div></div>"
        "<div><div style='font-size:.65rem;color:#475569'>Vol Ratio</div>"
        "<div style='font-weight:700;color:#e2e8f0'>" + (str(round(tech["vol_ratio"],1))+"x" if tech else "-") + "</div></div>"
        "</div>"
        + bt_html
        + "</div>"
    )


CSS_GLOBAL = """
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
     background:#0f172a;color:#e2e8f0;line-height:1.5}
"""


def build_report(results):
    # Sort by score descending
    results.sort(key=lambda x: -x["total"])

    buy  = [r for r in results if r["total"] >= ENTRY_SCORE]
    wtch = [r for r in results if 60 <= r["total"] < ENTRY_SCORE]
    skip = [r for r in results if r["total"] < 60]

    # Overall backtest stats
    all_bt = [r["bt"] for r in results if r["bt"]]
    avg_wr = round(sum(b["win_rate"] for b in all_bt) / len(all_bt), 1) if all_bt else 0

    cards_buy  = "".join(
        build_card(r["stock"], r["tech"], r["opt"], r["bt"]) for r in buy)
    cards_wtch = "".join(
        build_card(r["stock"], r["tech"], r["opt"], r["bt"]) for r in wtch)
    cards_skip = "".join(
        build_card(r["stock"], r["tech"], r["opt"], r["bt"]) for r in skip[:5])  # limit skip cards

    wr_color = "#4ade80" if avg_wr >= 70 else ("#fb923c" if avg_wr >= 55 else "#f87171")

    html = (
        "<!DOCTYPE html><html lang='en'><head>"
        "<meta charset='UTF-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>Strategy Conviction Report - " + DISPLAY_TS + "</title>"
        "<style>" + CSS_GLOBAL + "</style></head><body>"
        # Header
        "<div style='background:linear-gradient(135deg,#0f172a,#1e3a5f 50%,#0f172a);"
        "border-bottom:2px solid #1e3a5f;padding:1.5rem 2rem'>"
        "<h1 style='font-size:1.5rem;font-weight:800;color:#f1f5f9'>"
        "High Conviction Swing Strategy</h1>"
        "<div style='color:#64748b;font-size:.82rem;margin-top:.2rem'>"
        "4-Pillar Scoring: Fundamental + Technical + Volume + Options &bull; "
        "Entry threshold: 70/100 &bull; Target +" + str(TARGET_PCT) + "% Stop -" + str(STOP_PCT) + "%</div>"
        "<span style='display:inline-block;background:#1e293b;border:1px solid #334155;"
        "border-radius:999px;padding:.15rem .7rem;font-size:.72rem;color:#94a3b8;margin-top:.5rem'>"
        "Generated " + DISPLAY_TS + "</span></div>"
        # Summary bar
        "<div style='display:flex;gap:.75rem;flex-wrap:wrap;padding:.9rem 2rem;"
        "background:#0f172a;border-bottom:1px solid #1e293b'>"
        "<div style='background:#1e293b;border:1px solid #334155;border-radius:9px;"
        "padding:.5rem 1rem;text-align:center'>"
        "<div style='font-size:1.3rem;font-weight:800;color:#4ade80'>" + str(len(buy)) + "</div>"
        "<div style='font-size:.65rem;color:#64748b;text-transform:uppercase'>BUY Signals</div></div>"
        "<div style='background:#1e293b;border:1px solid #334155;border-radius:9px;"
        "padding:.5rem 1rem;text-align:center'>"
        "<div style='font-size:1.3rem;font-weight:800;color:#fb923c'>" + str(len(wtch)) + "</div>"
        "<div style='font-size:.65rem;color:#64748b;text-transform:uppercase'>WATCH</div></div>"
        "<div style='background:#1e293b;border:1px solid #334155;border-radius:9px;"
        "padding:.5rem 1rem;text-align:center'>"
        "<div style='font-size:1.3rem;font-weight:800;color:" + wr_color + "'>" + str(avg_wr) + "%</div>"
        "<div style='font-size:.65rem;color:#64748b;text-transform:uppercase'>Avg Win Rate</div></div>"
        "<div style='background:#1e293b;border:1px solid #334155;border-radius:9px;"
        "padding:.5rem 1rem;text-align:center'>"
        "<div style='font-size:1.3rem;font-weight:800;color:#fbbf24'>" + ("%.1f" % (TARGET_PCT/STOP_PCT)) + ":1</div>"
        "<div style='font-size:.65rem;color:#64748b;text-transform:uppercase'>R:R Ratio</div></div>"
        "<div style='background:#1e293b;border:1px solid #334155;border-radius:9px;"
        "padding:.5rem 1rem;text-align:center'>"
        "<div style='font-size:1.3rem;font-weight:800;color:#e2e8f0'>" + str(len(results)) + "</div>"
        "<div style='font-size:.65rem;color:#64748b;text-transform:uppercase'>Stocks Scanned</div></div>"
        "</div>"
        # Strategy rules box
        "<div style='max-width:1280px;margin:1rem auto;padding:0 1.5rem'>"
        "<div style='background:#111827;border:1px solid #1e293b;border-radius:12px;"
        "padding:1rem 1.25rem;margin-bottom:1.25rem'>"
        "<div style='font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;"
        "color:#475569;margin-bottom:.6rem'>Strategy Rules</div>"
        "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem;"
        "font-size:.78rem;color:#94a3b8'>"
        "<div><b style='color:#a78bfa'>Fundamental (20pts):</b> ROCE, 3Y Profit Growth, multi-scan validation</div>"
        "<div><b style='color:#60a5fa'>Technical (25pts):</b> Price above DMA200, DMA50, RSI 55-70 zone</div>"
        "<div><b style='color:#34d399'>Volume (25pts):</b> Today vol vs 20D avg, 5D vs 20D trend</div>"
        "<div><b style='color:#fbbf24'>Options (30pts):</b> PCR bullish, Max Pain above CMP, put OI support</div>"
        "</div>"
        "<div style='margin-top:.75rem;padding-top:.6rem;border-top:1px solid #1e293b;"
        "font-size:.74rem;color:#64748b'>"
        "<b style='color:#4ade80'>BUY</b> when score &ge; " + str(ENTRY_SCORE) +
        " &bull; <b style='color:#a3e635'>HIGH CONVICTION</b> when score &ge; " + str(HC_SCORE) +
        " &bull; <b style='color:#fb923c'>WATCH</b> when score 60-69 &bull; "
        "Backtest uses Tech+Vol rules only (no historical options data available)"
        "</div></div>"
        # BUY signals
        + ("<div style='font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;"
           "color:#4ade80;margin-bottom:.5rem'>BUY Signals (" + str(len(buy)) + " stocks)</div>"
           + cards_buy if buy else "")
        + ("<div style='font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;"
           "color:#fb923c;margin:.75rem 0 .5rem'>Watchlist (" + str(len(wtch)) + " stocks)</div>"
           + cards_wtch if wtch else "")
        + ("<div style='font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;"
           "color:#475569;margin:.75rem 0 .5rem'>Skip (" + str(len(skip)) + " stocks — showing top 5)</div>"
           + cards_skip if skip else "")
        + "</div>"
        "<div style='text-align:center;padding:1.25rem;font-size:.7rem;color:#334155;"
        "border-top:1px solid #1e293b;margin-top:.5rem'>"
        "Data: Yahoo Finance &bull; NSE India &bull; screener.in &bull; " + DISPLAY_TS
        + " &bull; <b>Not financial advice.</b> Always use stop losses."
        "</div></body></html>"
    )
    return html


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 62)
    print("  High Conviction Swing Strategy Scanner")
    print("  Scoring: Fundamental(20) + Tech(25) + Vol(25) + Options(30)")
    print("=" * 62)

    stocks = load_watchlist()

    results = []
    for i, stock in enumerate(stocks):
        ticker_ns = stock["ticker"] + ".NS"
        print("\n[" + str(i+1) + "/" + str(len(stocks)) + "] " + stock["name"]
              + " (" + ticker_ns + ")")

        # Technical + Volume
        print("    Fetching price/volume from Yahoo Finance...")
        tech = fetch_technicals(ticker_ns, days=300)
        if tech:
            print("    CMP Rs." + str(round(tech["cmp"], 1))
                  + "  RSI " + str(round(tech["rsi"], 1))
                  + "  Vol " + str(round(tech["vol_ratio"], 1)) + "x avg")
        else:
            print("    [!] No price data")

        # Options
        print("    Fetching NSE options chain...")
        opt = fetch_options(stock["ticker"])
        if opt:
            print("    PCR " + str(round(opt["pcr"], 2))
                  + "  MaxPain Rs." + str(opt.get("max_pain", "-")))
        else:
            print("    [!] Options data unavailable (neutral score applied)")

        # Backtest
        bt = None
        if tech and tech.get("df") is not None:
            bt = backtest_stock(tech["df"])
            if bt:
                print("    Backtest: Win rate " + str(bt["win_rate"])
                      + "% over " + str(bt["total"]) + " trades")

        # Score
        f_pts, _ = score_fundamental(stock)
        t_pts, _ = score_technical(tech)
        v_pts, _ = score_volume(tech)
        o_pts, _ = score_options(opt, tech)
        total    = f_pts + t_pts + v_pts + o_pts
        tier, _, _ = tier_label(total)
        print("    SCORE: " + str(total) + "/100  [" + tier + "]")

        results.append({
            "stock": stock,
            "tech":  tech,
            "opt":   opt,
            "bt":    bt,
            "total": total,
        })

    print("\n[*] Building conviction report...")
    html     = build_report(results)
    out_path = OUT_FILE
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("[OK] Report saved -> " + out_path)

    # Print summary table
    results.sort(key=lambda x: -x["total"])
    print("\n" + "-" * 62)
    print("  {:<26} {:>5}  {}".format("STOCK", "SCORE", "SIGNAL"))
    print("-" * 62)
    for r in results:
        tier, _, _ = tier_label(r["total"])
        print("  {:<26} {:>5}  {}".format(r["stock"]["name"][:26], r["total"], tier))
    print("-" * 62)


if __name__ == "__main__":
    main()
