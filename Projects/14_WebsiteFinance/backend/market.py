"""Market data layer: yfinance wrappers with a simple in-memory cache."""
import time
import math
import threading
import pandas as pd
import yfinance as yf

from . import indicators
from .universe import NIFTY50, INDICES, display_name

_cache: dict = {}
_lock = threading.Lock()


def _cached(key: str, ttl: int, fn):
    now = time.time()
    with _lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
    val = fn()
    with _lock:
        _cache[key] = (now, val)
    return val


def _clean(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _round(v, n=2):
    v = _clean(v)
    return round(float(v), n) if v is not None else None


# ---------- quotes ----------

def get_quotes(symbols: list[str]) -> list[dict]:
    """Batch quotes via 5-day daily history (robust, one request)."""
    key = "quotes:" + ",".join(sorted(symbols))
    return _cached(key, 120, lambda: _fetch_quotes(symbols))


def _fetch_quotes(symbols: list[str]) -> list[dict]:
    data = yf.download(symbols, period="5d", interval="1d",
                       group_by="ticker", progress=False, threads=True, auto_adjust=False)
    out = []
    for sym in symbols:
        try:
            df = data[sym] if len(symbols) > 1 else data
            df = df.dropna(subset=["Close"])
            if df.empty:
                continue
            last = df.iloc[-1]
            prev_close = df.iloc[-2]["Close"] if len(df) > 1 else last["Open"]
            price = float(last["Close"])
            change = price - float(prev_close)
            out.append({
                "symbol": sym,
                "name": display_name(sym),
                "price": _round(price),
                "change": _round(change),
                "change_pct": _round(change / float(prev_close) * 100 if prev_close else 0),
                "volume": int(_clean(last.get("Volume")) or 0),
                "date": str(df.index[-1].date()),
            })
        except Exception:
            continue
    return out


# ---------- history / charts ----------

VALID_RANGES = {"1mo": "1d", "3mo": "1d", "6mo": "1d", "1y": "1d", "2y": "1wk", "5y": "1wk"}


def get_history(symbol: str, rng: str = "1y") -> dict:
    interval = VALID_RANGES.get(rng, "1d")
    key = f"hist:{symbol}:{rng}"
    return _cached(key, 300, lambda: _fetch_history(symbol, rng, interval))


def _fetch_history(symbol: str, rng: str, interval: str) -> dict:
    # fetch extra data so long-period indicators (sma200) are valid at range start
    fetch_rng = {"1mo": "1y", "3mo": "1y", "6mo": "2y", "1y": "3y", "2y": "5y", "5y": "10y"}.get(rng, "3y")
    df = yf.Ticker(symbol).history(period=fetch_rng, interval=interval, auto_adjust=False)
    if df.empty:
        return {"symbol": symbol, "candles": []}
    df = indicators.enrich(df)
    n_map = {"1mo": 22, "3mo": 66, "6mo": 132, "1y": 252, "2y": 104, "5y": 260}
    df = df.tail(n_map.get(rng, 252))
    candles = []
    for ts, row in df.iterrows():
        candles.append({
            "time": str(ts.date()),
            "open": _round(row["Open"]), "high": _round(row["High"]),
            "low": _round(row["Low"]), "close": _round(row["Close"]),
            "volume": int(_clean(row["Volume"]) or 0),
            "sma20": _round(row["sma20"]), "sma50": _round(row["sma50"]), "sma200": _round(row["sma200"]),
            "rsi14": _round(row["rsi14"]),
            "macd": _round(row["macd"], 3), "macd_signal": _round(row["macd_signal"], 3),
            "macd_hist": _round(row["macd_hist"], 3),
            "bb_upper": _round(row["bb_upper"]), "bb_lower": _round(row["bb_lower"]),
        })
    return {"symbol": symbol, "name": display_name(symbol), "candles": candles}


# ---------- fundamentals ----------

FUND_FIELDS = {
    "longName": "name", "sector": "sector", "industry": "industry",
    "marketCap": "market_cap", "trailingPE": "pe", "forwardPE": "forward_pe",
    "priceToBook": "pb", "trailingEps": "eps", "dividendYield": "dividend_yield",
    "returnOnEquity": "roe", "debtToEquity": "debt_to_equity",
    "profitMargins": "profit_margin", "revenueGrowth": "revenue_growth",
    "earningsGrowth": "earnings_growth", "beta": "beta",
    "fiftyTwoWeekHigh": "high_52w", "fiftyTwoWeekLow": "low_52w",
    "currentPrice": "price", "bookValue": "book_value",
    "totalRevenue": "revenue", "recommendationKey": "recommendation",
    "targetMeanPrice": "target_price",
}


def get_fundamentals(symbol: str) -> dict:
    return _cached(f"fund:{symbol}", 3600, lambda: _fetch_fundamentals(symbol))


def _fetch_fundamentals(symbol: str) -> dict:
    info = yf.Ticker(symbol).info or {}
    out = {"symbol": symbol}
    for src, dst in FUND_FIELDS.items():
        out[dst] = _clean(info.get(src))
    return out


# ---------- screener ----------

def run_screener() -> dict:
    return _cached("screener", 600, _run_screener)


def _run_screener() -> dict:
    symbols = list(NIFTY50.keys())
    data = yf.download(symbols, period="1y", interval="1d",
                       group_by="ticker", progress=False, threads=True, auto_adjust=False)
    results = []
    for sym in symbols:
        try:
            df = data[sym].dropna(subset=["Close"])
            if len(df) < 60:
                continue
            df = indicators.enrich(df)
            last, prev = df.iloc[-1], df.iloc[-2]
            close = float(last["Close"])
            signals = []

            r = _clean(last["rsi14"])
            if r is not None:
                if r < 30:
                    signals.append({"type": "RSI_OVERSOLD", "side": "bullish",
                                    "detail": f"RSI {r:.1f} — oversold, potential bounce"})
                elif r > 70:
                    signals.append({"type": "RSI_OVERBOUGHT", "side": "bearish",
                                    "detail": f"RSI {r:.1f} — overbought, extended"})

            # golden / death cross (within last 5 sessions)
            s50, s200 = df["sma50"], df["sma200"]
            if s200.notna().iloc[-1]:
                recent = (s50 > s200).astype(int).diff().tail(5)
                if (recent == 1).any():
                    signals.append({"type": "GOLDEN_CROSS", "side": "bullish",
                                    "detail": "SMA50 crossed above SMA200 recently"})
                elif (recent == -1).any():
                    signals.append({"type": "DEATH_CROSS", "side": "bearish",
                                    "detail": "SMA50 crossed below SMA200 recently"})

            # MACD crossover (within last 3 sessions)
            mh = df["macd_hist"].tail(3)
            if mh.notna().all() and len(mh) == 3:
                if mh.iloc[0] < 0 < mh.iloc[-1]:
                    signals.append({"type": "MACD_BULL_CROSS", "side": "bullish",
                                    "detail": "MACD crossed above signal line"})
                elif mh.iloc[0] > 0 > mh.iloc[-1]:
                    signals.append({"type": "MACD_BEAR_CROSS", "side": "bearish",
                                    "detail": "MACD crossed below signal line"})

            # 52-week high/low proximity
            hi, lo = float(df["High"].max()), float(df["Low"].min())
            if close >= hi * 0.98:
                signals.append({"type": "NEAR_52W_HIGH", "side": "bullish",
                                "detail": f"Within 2% of 52-week high ₹{hi:,.0f} — momentum"})
            elif close <= lo * 1.05:
                signals.append({"type": "NEAR_52W_LOW", "side": "bearish",
                                "detail": f"Within 5% of 52-week low ₹{lo:,.0f}"})

            # volume spike
            va = _clean(last["vol_avg20"])
            vol = _clean(last["Volume"])
            if va and vol and vol > 2 * va:
                signals.append({"type": "VOLUME_SPIKE", "side": "neutral",
                                "detail": f"Volume {vol / va:.1f}x the 20-day average"})

            # bollinger touch
            bl, bu = _clean(last["bb_lower"]), _clean(last["bb_upper"])
            if bl is not None and close <= bl:
                signals.append({"type": "BB_LOWER_TOUCH", "side": "bullish",
                                "detail": "Close at/below lower Bollinger band"})
            elif bu is not None and close >= bu:
                signals.append({"type": "BB_UPPER_TOUCH", "side": "bearish",
                                "detail": "Close at/above upper Bollinger band"})

            prev_close = float(prev["Close"])
            results.append({
                "symbol": sym,
                "name": display_name(sym),
                "price": _round(close),
                "change_pct": _round((close - prev_close) / prev_close * 100),
                "rsi": _round(r),
                "above_sma200": bool(close > s200.iloc[-1]) if s200.notna().iloc[-1] else None,
                "pct_from_52w_high": _round((close - hi) / hi * 100),
                "signals": signals,
            })
        except Exception:
            continue
    results.sort(key=lambda x: len(x["signals"]), reverse=True)
    return {"as_of": time.strftime("%Y-%m-%d %H:%M"), "count": len(results), "stocks": results}
