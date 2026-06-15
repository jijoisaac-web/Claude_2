# -*- coding: utf-8 -*-
"""
scanner.py -- Technical analysis engine for Nifty 500 Swing Scanner

Setups detected (7 total):
  1. EMA Pullback        -- Price pulled back to 20 EMA in uptrend, now bouncing
  2. Breakout            -- Price breaking above consolidation with high volume
  3. Momentum Recovery   -- RSI recovering from oversold in uptrend
  4. MACD Crossover      -- MACD line crosses above signal line (bullish)
  5. Supertrend Buy      -- Price crosses above Supertrend indicator
  6. 52W High Breakout   -- Stock making new 52-week high with volume
  7. BB Squeeze Breakout -- Bollinger Band squeeze followed by upside breakout
"""

import pandas as pd
import numpy as np
import yfinance as yf
import warnings
warnings.filterwarnings("ignore")


# ---------------------------------------------------------------
# Indicator helpers
# ---------------------------------------------------------------

def ema(series, period):
    return series.ewm(span=period, adjust=False).mean()


def rsi(series, period=14):
    delta    = series.diff()
    gain     = delta.clip(lower=0)
    loss     = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, adjust=False).mean()
    avg_loss = loss.ewm(com=period - 1, adjust=False).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def avg_volume(vol_series, period=20):
    return vol_series.rolling(window=period).mean()


def atr(df, period=14):
    high  = df["High"]
    low   = df["Low"]
    close = df["Close"]
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low  - close.shift()).abs()
    ], axis=1).max(axis=1)
    return tr.rolling(window=period).mean()


def macd(series, fast=12, slow=26, signal=9):
    fast_ema   = series.ewm(span=fast,   adjust=False).mean()
    slow_ema   = series.ewm(span=slow,   adjust=False).mean()
    macd_line  = fast_ema - slow_ema
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram   = macd_line - signal_line
    return macd_line, signal_line, histogram


def supertrend(df, period=10, multiplier=3.0):
    """Returns Supertrend series: True = price above (buy), False = price below (sell)."""
    close = df["Close"]
    high  = df["High"]
    low   = df["Low"]
    atr_s = atr(df, period)

    basic_upper = (high + low) / 2 + multiplier * atr_s
    basic_lower = (high + low) / 2 - multiplier * atr_s

    final_upper = basic_upper.copy()
    final_lower = basic_lower.copy()

    for i in range(1, len(df)):
        final_upper.iloc[i] = (
            basic_upper.iloc[i]
            if basic_upper.iloc[i] < final_upper.iloc[i-1] or close.iloc[i-1] > final_upper.iloc[i-1]
            else final_upper.iloc[i-1]
        )
        final_lower.iloc[i] = (
            basic_lower.iloc[i]
            if basic_lower.iloc[i] > final_lower.iloc[i-1] or close.iloc[i-1] < final_lower.iloc[i-1]
            else final_lower.iloc[i-1]
        )

    supertrend_dir = pd.Series(index=df.index, dtype=bool)
    for i in range(1, len(df)):
        if close.iloc[i] > final_upper.iloc[i]:
            supertrend_dir.iloc[i] = True    # bullish
        elif close.iloc[i] < final_lower.iloc[i]:
            supertrend_dir.iloc[i] = False   # bearish
        else:
            supertrend_dir.iloc[i] = supertrend_dir.iloc[i-1]

    return supertrend_dir, final_lower, final_upper


def bollinger_bands(series, period=20, std_dev=2.0):
    mid   = series.rolling(window=period).mean()
    sigma = series.rolling(window=period).std()
    upper = mid + std_dev * sigma
    lower = mid - std_dev * sigma
    bwidth = (upper - lower) / mid   # normalised bandwidth
    return upper, mid, lower, bwidth


# ---------------------------------------------------------------
# Market cap classifier
# ---------------------------------------------------------------

def classify_market_cap(market_cap_inr):
    if market_cap_inr is None:
        return "Unknown"
    cr = market_cap_inr / 1e7
    if cr >= 20000:
        return "Large Cap"
    elif cr >= 5000:
        return "Mid Cap"
    return "Small Cap"


def fmt_cr(val):
    return round(val / 1e7, 0) if val else None


# ---------------------------------------------------------------
# Data fetch
# ---------------------------------------------------------------

def fetch_data(symbol, period="1y", interval="1d"):
    try:
        df = yf.download(symbol, period=period, interval=interval,
                         progress=False, auto_adjust=True)
        if df.empty or len(df) < 60:
            return None
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df.dropna(inplace=True)
        return df
    except Exception:
        return None


# ---------------------------------------------------------------
# Screener.in fallback scraper
# ---------------------------------------------------------------

def fetch_from_screener(nse_symbol):
    """
    Scrape key ratios from Screener.in for a given NSE symbol.
    URL: https://www.screener.in/company/{SYMBOL}/consolidated/
    Returns a dict with available fields, None for missing ones.
    """
    try:
        import requests
        from bs4 import BeautifulSoup

        sym = nse_symbol.replace(".NS", "")
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }

        # Try consolidated first, fall back to standalone
        for suffix in ["/consolidated/", "/"]:
            url = "https://www.screener.in/company/{}{}" .format(sym, suffix)
            try:
                r = requests.get(url, headers=headers, timeout=12)
                if r.status_code == 200:
                    break
            except Exception:
                continue
        else:
            return {}

        soup = BeautifulSoup(r.text, "html.parser")

        def parse_num(text):
            """Convert Screener number strings like '1,234.56' or '12.3%' to float."""
            try:
                cleaned = text.replace(",", "").replace("%", "").replace("Cr.", "").strip()
                return float(cleaned)
            except Exception:
                return None

        result = {}

        # Company name
        h1 = soup.select_one("h1")
        if h1:
            result["company_name"] = h1.text.strip()

        # Sector from breadcrumb
        breadcrumb = soup.select(".breadcrumb a")
        if len(breadcrumb) >= 2:
            result["sector"] = breadcrumb[-1].text.strip()

        # Top ratios: Market Cap, Current Price, 52W High/Low, P/E, P/B,
        #             Dividend Yield, ROCE, ROE, Book Value, Debt/Equity
        ratio_map = {
            "Market Cap":      "market_cap_cr",
            "Current Price":   "current_price",
            "High / Low":      "52w_range",
            "Stock P/E":       "pe_ratio",
            "Book Value":      "book_value",
            "Dividend Yield":  "dividend_yield",
            "ROCE":            "roce",
            "ROE":             "roe",
            "Face Value":      "face_value",
        }

        for li in soup.select("#top-ratios li"):
            name_el = li.select_one(".name")
            val_el  = li.select_one(".number")
            if not name_el or not val_el:
                continue
            name = name_el.text.strip()
            val  = val_el.text.strip()

            if "High / Low" in name:
                # Format: "2500 / 1800"
                parts = val.split("/")
                if len(parts) == 2:
                    result["52w_high"] = parse_num(parts[0])
                    result["52w_low"]  = parse_num(parts[1])
            elif "Market Cap" in name:
                result["market_cap_cr"] = parse_num(val)
                # Classify
                mc = result["market_cap_cr"]
                if mc:
                    if mc >= 20000:   result["cap_category"] = "Large Cap"
                    elif mc >= 5000:  result["cap_category"] = "Mid Cap"
                    else:             result["cap_category"] = "Small Cap"
            elif "Stock P/E" in name:
                result["pe_ratio"] = parse_num(val)
            elif "Book Value" in name:
                result["book_value"] = parse_num(val)
            elif "Dividend Yield" in name:
                result["dividend_yield"] = parse_num(val)
            elif "ROCE" in name:
                result["roce"] = parse_num(val)
            elif "ROE" in name:
                result["roe"] = parse_num(val)
            elif "Current Price" in name:
                result["current_price"] = parse_num(val)

        # P/B from price / book_value
        if result.get("current_price") and result.get("book_value") and result["book_value"] != 0:
            result["pb_ratio"] = round(result["current_price"] / result["book_value"], 2)

        # Quarterly / annual data table for growth metrics
        # Screener shows a "quarters" section with Sales and Net Profit rows
        tables = soup.select("section#quarters table, section#profit-loss table")
        for tbl in tables:
            rows = tbl.select("tr")
            for row in rows:
                cells = [td.text.strip() for td in row.select("td")]
                if not cells:
                    continue
                label = cells[0].lower()
                # Net Profit margin from P&L table
                if "net profit" in label and len(cells) >= 3:
                    try:
                        latest = parse_num(cells[-1])
                        prev   = parse_num(cells[-2])
                        if latest is not None and prev and prev != 0:
                            result["earnings_growth"] = round((latest - prev) / abs(prev) * 100, 1)
                    except Exception:
                        pass
                if "sales" in label and "growth" not in label and len(cells) >= 3:
                    try:
                        latest = parse_num(cells[-1])
                        prev   = parse_num(cells[-2])
                        if latest is not None and prev and prev != 0:
                            result["revenue_growth"] = round((latest - prev) / abs(prev) * 100, 1)
                    except Exception:
                        pass

        # Debt/Equity from balance sheet ratios
        for li in soup.select(".company-ratios li, #balance-sheet li"):
            name_el = li.select_one(".name, span")
            val_el  = li.select_one(".number, .value")
            if name_el and val_el:
                n = name_el.text.strip().lower()
                v = val_el.text.strip()
                if "debt" in n and "equity" in n:
                    result["debt_to_equity"] = parse_num(v)

        return result

    except Exception:
        return {}


def merge_fundamentals(yahoo_data, screener_data):
    """
    Merge Screener data into Yahoo data — only fill None fields.
    Yahoo Finance is preferred; Screener fills the gaps.
    """
    merged = dict(yahoo_data)
    for key, val in screener_data.items():
        if val is not None and (merged.get(key) is None):
            merged[key] = val
    return merged


def fetch_fundamentals(symbol):
    try:
        info    = yf.Ticker(symbol).info
        mktcap  = info.get("marketCap")
        price   = info.get("currentPrice") or info.get("regularMarketPrice")
        w52h    = info.get("fiftyTwoWeekHigh")
        w52l    = info.get("fiftyTwoWeekLow")
        pct_h   = round((price - w52h) / w52h * 100, 1) if price and w52h else None
        pct_l   = round((price - w52l) / w52l * 100, 1) if price and w52l else None

        def safe(val, mult=1, dec=2):
            try:
                return round(float(val) * mult, dec) if val is not None else None
            except Exception:
                return None

        yahoo_data = {
            "company_name":      info.get("longName") or info.get("shortName"),
            "sector":            info.get("sector"),
            "industry":          info.get("industry"),
            "market_cap_cr":     fmt_cr(mktcap),
            "cap_category":      classify_market_cap(mktcap),
            "pe_ratio":          safe(info.get("trailingPE")),
            "forward_pe":        safe(info.get("forwardPE")),
            "pb_ratio":          safe(info.get("priceToBook")),
            "ps_ratio":          safe(info.get("priceToSalesTrailing12Months")),
            "peg_ratio":         safe(info.get("pegRatio")),
            "ev_ebitda":         safe(info.get("enterpriseToEbitda")),
            "roe":               safe(info.get("returnOnEquity"),  mult=100, dec=1),
            "roa":               safe(info.get("returnOnAssets"),  mult=100, dec=1),
            "profit_margin":     safe(info.get("profitMargins"),   mult=100, dec=1),
            "operating_margin":  safe(info.get("operatingMargins"), mult=100, dec=1),
            "revenue_growth":    safe(info.get("revenueGrowth"),   mult=100, dec=1),
            "earnings_growth":   safe(info.get("earningsGrowth"),  mult=100, dec=1),
            "debt_to_equity":    safe(info.get("debtToEquity")),
            "current_ratio":     safe(info.get("currentRatio")),
            "quick_ratio":       safe(info.get("quickRatio")),
            "eps_ttm":           safe(info.get("trailingEps")),
            "book_value":        safe(info.get("bookValue")),
            "dividend_yield":    safe(info.get("dividendYield"), mult=100, dec=2),
            "52w_high":          w52h,
            "52w_low":           w52l,
            "pct_from_52w_high": pct_h,
            "pct_from_52w_low":  pct_l,
            "avg_volume_10d":    info.get("averageVolume10days"),
            "beta":              safe(info.get("beta")),
            "data_source":       "Yahoo Finance",
        }

        # Check if key fields are missing — if so, fill from Screener.in
        missing = [k for k in ["pe_ratio","pb_ratio","roe","market_cap_cr"]
                   if yahoo_data.get(k) is None]
        if missing:
            screener_data = fetch_from_screener(symbol)
            if screener_data:
                yahoo_data = merge_fundamentals(yahoo_data, screener_data)
                yahoo_data["data_source"] = "Yahoo + Screener" if not all(
                    yahoo_data.get(k) is None for k in ["pe_ratio","pb_ratio","roe"]) else "Screener.in"

        return yahoo_data

    except Exception:
        # Yahoo completely failed — try Screener directly
        screener_data = fetch_from_screener(symbol)
        base = {k: None for k in [
            "company_name","sector","industry","market_cap_cr","cap_category",
            "pe_ratio","forward_pe","pb_ratio","ps_ratio","peg_ratio","ev_ebitda",
            "roe","roa","profit_margin","operating_margin","revenue_growth","earnings_growth",
            "debt_to_equity","current_ratio","quick_ratio","eps_ttm","book_value",
            "dividend_yield","52w_high","52w_low","pct_from_52w_high","pct_from_52w_low",
            "avg_volume_10d","beta","data_source",
        ]}
        base["data_source"] = "Screener.in"
        return merge_fundamentals(base, screener_data)


# ---------------------------------------------------------------
# Setup 1: EMA Pullback
# ---------------------------------------------------------------

def check_ema_pullback(df):
    close = df["Close"]
    vol   = df["Volume"]
    e20   = ema(close, 20)
    e50   = ema(close, 50)
    e200  = ema(close, 200)
    r     = rsi(close, 14)
    av    = avg_volume(vol, 20)
    i     = -1

    uptrend      = close.iloc[i] > e50.iloc[i] > e200.iloc[i]
    near_e20     = abs(close.iloc[i] - e20.iloc[i]) / e20.iloc[i] < 0.015
    green_candle = df["Close"].iloc[i] > df["Open"].iloc[i]
    rsi_ok       = 35 < r.iloc[i] < 62
    vol_ok       = vol.iloc[i] >= av.iloc[i] * 0.8

    triggered = uptrend and near_e20 and green_candle and rsi_ok and vol_ok
    return {
        "setup": "EMA Pullback", "triggered": triggered,
        "close": round(float(close.iloc[i]), 2),
        "ema20": round(float(e20.iloc[i]), 2),
        "ema50": round(float(e50.iloc[i]), 2),
        "rsi":   round(float(r.iloc[i]), 1),
        "vol_ratio": round(float(vol.iloc[i] / av.iloc[i]), 2) if av.iloc[i] > 0 else 0,
        "stop_loss": round(float(e50.iloc[i]) * 0.98, 2),
        "target":    round(float(close.iloc[i]) * 1.06, 2),
    }


# ---------------------------------------------------------------
# Setup 2: Breakout
# ---------------------------------------------------------------

def check_breakout(df):
    close = df["Close"]
    vol   = df["Volume"]
    e50   = ema(close, 50)
    r     = rsi(close, 14)
    av    = avg_volume(vol, 20)
    i     = -1

    cons      = close.iloc[-6:-1]
    cons_high = cons.max()
    cons_low  = cons.min()
    tight     = (cons_high - cons_low) / cons_low < 0.05

    above_ema   = close.iloc[i] > e50.iloc[i]
    breakout_up = close.iloc[i] > cons_high
    vol_spike   = vol.iloc[i] >= av.iloc[i] * 1.5
    rsi_ok      = r.iloc[i] < 72

    triggered = above_ema and tight and breakout_up and vol_spike and rsi_ok
    return {
        "setup": "Breakout", "triggered": triggered,
        "close": round(float(close.iloc[i]), 2),
        "breakout_level": round(float(cons_high), 2),
        "ema50": round(float(e50.iloc[i]), 2),
        "rsi":   round(float(r.iloc[i]), 1),
        "vol_ratio": round(float(vol.iloc[i] / av.iloc[i]), 2) if av.iloc[i] > 0 else 0,
        "stop_loss": round(float(cons_low) * 0.99, 2),
        "target":    round(float(close.iloc[i]) * 1.07, 2),
    }


# ---------------------------------------------------------------
# Setup 3: Momentum Recovery
# ---------------------------------------------------------------

def check_momentum(df):
    close = df["Close"]
    vol   = df["Volume"]
    e200  = ema(close, 200)
    r     = rsi(close, 14)
    av    = avg_volume(vol, 20)
    i     = -1

    above_e200     = close.iloc[i] > e200.iloc[i]
    rsi_recovering = r.iloc[-4:-1].min() < 42 and r.iloc[i] > 45
    higher_low     = close.iloc[i] > close.iloc[-6]
    vol_ok         = vol.iloc[i] >= av.iloc[i] * 0.9

    triggered = above_e200 and rsi_recovering and higher_low and vol_ok
    return {
        "setup": "Momentum Recovery", "triggered": triggered,
        "close":  round(float(close.iloc[i]), 2),
        "ema200": round(float(e200.iloc[i]), 2),
        "rsi":    round(float(r.iloc[i]), 1),
        "vol_ratio": round(float(vol.iloc[i] / av.iloc[i]), 2) if av.iloc[i] > 0 else 0,
        "stop_loss": round(float(close.iloc[-6]) * 0.98, 2),
        "target":    round(float(close.iloc[i]) * 1.05, 2),
    }


# ---------------------------------------------------------------
# Setup 4: MACD Crossover
# Bullish when MACD line crosses above Signal line from below zero
# ---------------------------------------------------------------

def check_macd_crossover(df):
    close = df["Close"]
    vol   = df["Volume"]
    e50   = ema(close, 50)
    av    = avg_volume(vol, 20)
    r     = rsi(close, 14)

    macd_line, signal_line, hist = macd(close)
    i = -1

    # Fresh crossover: MACD crossed above signal in last 2 bars
    crossed_today     = macd_line.iloc[i]   > signal_line.iloc[i]
    crossed_prev      = macd_line.iloc[i-1] < signal_line.iloc[i-1]
    near_zero         = abs(macd_line.iloc[i]) < abs(close.iloc[i]) * 0.01  # not far from zero line
    above_ema50       = close.iloc[i] > e50.iloc[i]
    histogram_rising  = hist.iloc[i] > hist.iloc[i-1]
    rsi_ok            = 40 < r.iloc[i] < 70
    vol_ok            = vol.iloc[i] >= av.iloc[i] * 0.8

    triggered = crossed_today and crossed_prev and above_ema50 and histogram_rising and rsi_ok and vol_ok

    return {
        "setup": "MACD Crossover", "triggered": triggered,
        "close":     round(float(close.iloc[i]), 2),
        "ema50":     round(float(e50.iloc[i]), 2),
        "rsi":       round(float(r.iloc[i]), 1),
        "vol_ratio": round(float(vol.iloc[i] / av.iloc[i]), 2) if av.iloc[i] > 0 else 0,
        "stop_loss": round(float(e50.iloc[i]) * 0.97, 2),
        "target":    round(float(close.iloc[i]) * 1.06, 2),
        "macd_val":  round(float(macd_line.iloc[i]), 3),
        "signal_val": round(float(signal_line.iloc[i]), 3),
    }


# ---------------------------------------------------------------
# Setup 5: Supertrend Buy
# Price crosses above Supertrend (fresh buy signal in last 2 bars)
# ---------------------------------------------------------------

def check_supertrend_buy(df):
    close  = df["Close"]
    vol    = df["Volume"]
    e200   = ema(close, 200)
    av     = avg_volume(vol, 20)
    r      = rsi(close, 14)

    st_dir, st_lower, _ = supertrend(df, period=10, multiplier=3.0)
    i = -1

    # Fresh crossover: was bearish yesterday, bullish today
    fresh_buy    = st_dir.iloc[i] == True and st_dir.iloc[i-1] == False
    above_e200   = close.iloc[i] > e200.iloc[i]
    rsi_ok       = r.iloc[i] < 70
    vol_ok       = vol.iloc[i] >= av.iloc[i] * 1.0

    triggered = fresh_buy and above_e200 and rsi_ok and vol_ok

    return {
        "setup": "Supertrend Buy", "triggered": triggered,
        "close":     round(float(close.iloc[i]), 2),
        "ema200":    round(float(e200.iloc[i]), 2),
        "rsi":       round(float(r.iloc[i]), 1),
        "vol_ratio": round(float(vol.iloc[i] / av.iloc[i]), 2) if av.iloc[i] > 0 else 0,
        "stop_loss": round(float(st_lower.iloc[i]) * 0.99, 2),
        "target":    round(float(close.iloc[i]) * 1.07, 2),
        "supertrend_support": round(float(st_lower.iloc[i]), 2),
    }


# ---------------------------------------------------------------
# Setup 6: 52-Week High Breakout
# Stock making new 52W high with strong volume — trend continuation
# ---------------------------------------------------------------

def check_52w_high_breakout(df):
    close = df["Close"]
    high  = df["High"]
    vol   = df["Volume"]
    e50   = ema(close, 50)
    av    = avg_volume(vol, 20)
    r     = rsi(close, 14)
    i     = -1

    # 52W high from previous 251 bars (excluding today)
    prev_52w_high = high.iloc[-252:-1].max()

    new_52w_high = close.iloc[i] >= prev_52w_high * 0.995   # within 0.5% of 52W high or above
    above_ema50  = close.iloc[i] > e50.iloc[i]
    vol_spike    = vol.iloc[i] >= av.iloc[i] * 1.3
    rsi_ok       = r.iloc[i] < 80   # allow higher RSI on breakout momentum

    triggered = new_52w_high and above_ema50 and vol_spike and rsi_ok

    return {
        "setup": "52W High Breakout", "triggered": triggered,
        "close":          round(float(close.iloc[i]), 2),
        "ema50":          round(float(e50.iloc[i]), 2),
        "rsi":            round(float(r.iloc[i]), 1),
        "vol_ratio":      round(float(vol.iloc[i] / av.iloc[i]), 2) if av.iloc[i] > 0 else 0,
        "breakout_level": round(float(prev_52w_high), 2),
        "stop_loss":      round(float(close.iloc[i]) * 0.95, 2),
        "target":         round(float(close.iloc[i]) * 1.10, 2),
    }


# ---------------------------------------------------------------
# Setup 7: Bollinger Band Squeeze + Breakout
# Low volatility squeeze followed by price breaking above upper band
# ---------------------------------------------------------------

def check_bb_squeeze_breakout(df):
    close = df["Close"]
    vol   = df["Volume"]
    e50   = ema(close, 50)
    av    = avg_volume(vol, 20)
    r     = rsi(close, 14)

    upper, mid, lower, bwidth = bollinger_bands(close, period=20, std_dev=2.0)
    i = -1

    # Squeeze: bandwidth was below 20-period average of itself in recent bars
    bw_avg    = bwidth.rolling(20).mean()
    was_squeezed  = bwidth.iloc[-6:-1].min() < bw_avg.iloc[i] * 0.75
    now_expanding = bwidth.iloc[i] > bwidth.iloc[i-1]

    # Breakout: price above upper band
    above_upper  = close.iloc[i] > upper.iloc[i]
    above_ema50  = close.iloc[i] > e50.iloc[i]
    vol_ok       = vol.iloc[i] >= av.iloc[i] * 1.2
    rsi_ok       = r.iloc[i] < 75

    triggered = was_squeezed and now_expanding and above_upper and above_ema50 and vol_ok and rsi_ok

    return {
        "setup": "BB Squeeze Breakout", "triggered": triggered,
        "close":     round(float(close.iloc[i]), 2),
        "ema50":     round(float(e50.iloc[i]), 2),
        "rsi":       round(float(r.iloc[i]), 1),
        "vol_ratio": round(float(vol.iloc[i] / av.iloc[i]), 2) if av.iloc[i] > 0 else 0,
        "bb_upper":  round(float(upper.iloc[i]), 2),
        "bb_mid":    round(float(mid.iloc[i]), 2),
        "stop_loss": round(float(mid.iloc[i]) * 0.99, 2),
        "target":    round(float(close.iloc[i]) * 1.08, 2),
    }


# ---------------------------------------------------------------
# Main scan function
# ---------------------------------------------------------------

ALL_CHECKS = [
    check_ema_pullback,
    check_breakout,
    check_momentum,
    check_macd_crossover,
    check_supertrend_buy,
    check_52w_high_breakout,
    check_bb_squeeze_breakout,
]


def scan_symbol(symbol):
    df = fetch_data(symbol)
    if df is None:
        return None

    results = []
    for check_fn in ALL_CHECKS:
        try:
            res = check_fn(df)
            if res["triggered"]:
                res["symbol"] = symbol.replace(".NS", "")
                results.append(res)
        except Exception:
            continue

    if results:
        fund = fetch_fundamentals(symbol)
        for res in results:
            res.update(fund)

    return results if results else None
