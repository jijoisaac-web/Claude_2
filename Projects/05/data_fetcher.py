# -*- coding: utf-8 -*-
"""
data_fetcher.py — Downloads and caches OHLCV + fundamental data via yfinance
"""

import os
import pickle
import datetime
import warnings
import pandas as pd
import numpy as np
import yfinance as yf
from config import LOOKBACK_DAYS, PRICE_INTERVAL, DATA_DIR

warnings.filterwarnings("ignore")
os.makedirs(DATA_DIR, exist_ok=True)


# ── Cache helpers ─────────────────────────────────────────────────────────────

def _cache_path(key: str) -> str:
    return os.path.join(DATA_DIR, key.replace("/", "_").replace("^", "X") + ".pkl")


def _load_cache(key: str, max_age_hours: int = 6):
    path = _cache_path(key)
    if not os.path.exists(path):
        return None
    age = (datetime.datetime.now() - datetime.datetime.fromtimestamp(
        os.path.getmtime(path))).total_seconds() / 3600
    if age > max_age_hours:
        return None
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception:
        return None


def _save_cache(key: str, data):
    try:
        with open(_cache_path(key), "wb") as f:
            pickle.dump(data, f)
    except Exception:
        pass


# ── Price data ────────────────────────────────────────────────────────────────

def _flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Flatten MultiIndex columns produced by newer yfinance for single tickers."""
    if isinstance(df.columns, pd.MultiIndex):
        df = df.copy()
        df.columns = df.columns.get_level_values(0)
    return df


def fetch_ohlcv(symbol: str, days: int = LOOKBACK_DAYS) -> pd.DataFrame:
    """Return daily OHLCV DataFrame for one symbol."""
    cache_key = f"ohlcv_{symbol}_{days}"
    cached = _load_cache(cache_key)
    if cached is not None:
        return _flatten_columns(cached)

    end   = datetime.datetime.today()
    start = end - datetime.timedelta(days=days + 30)  # buffer for weekends

    try:
        df = yf.download(symbol, start=start, end=end,
                         interval=PRICE_INTERVAL, progress=False, auto_adjust=True)
        if df.empty:
            return pd.DataFrame()
        df = _flatten_columns(df)
        df.index = pd.to_datetime(df.index)
        df = df.tail(days)
        _save_cache(cache_key, df)
        return df
    except Exception as e:
        print(f"  [data] Failed {symbol}: {e}")
        return pd.DataFrame()


def fetch_bulk_ohlcv(symbols: list, days: int = LOOKBACK_DAYS) -> dict:
    """Fetch OHLCV for multiple symbols. Returns {symbol: DataFrame}."""
    result = {}
    total = len(symbols)
    for i, sym in enumerate(symbols, 1):
        print(f"  Downloading {i}/{total}: {sym}", end="\r")
        df = fetch_ohlcv(sym, days)
        if not df.empty:
            result[sym] = df
    print()
    return result


def fetch_close_matrix(symbols: list, days: int = LOOKBACK_DAYS) -> pd.DataFrame:
    """Return a DataFrame of Close prices: rows=dates, cols=symbols."""
    cache_key = f"close_matrix_{len(symbols)}_{days}"
    cached = _load_cache(cache_key, max_age_hours=4)
    if cached is not None:
        return cached

    end   = datetime.datetime.today().strftime("%Y-%m-%d")
    start = (datetime.datetime.today() - datetime.timedelta(days=days + 30)).strftime("%Y-%m-%d")

    try:
        raw = yf.download(symbols, start=start, end=end,
                          interval=PRICE_INTERVAL, progress=False,
                          auto_adjust=True, group_by="ticker")

        if isinstance(raw.columns, pd.MultiIndex):
            close = raw.xs("Close", axis=1, level=1) if "Close" in raw.columns.get_level_values(1) else pd.DataFrame()
        else:
            close = raw[["Close"]]

        close = close.dropna(how="all").tail(days)
        _save_cache(cache_key, close)
        return close
    except Exception as e:
        print(f"  [data] Bulk download failed: {e}")
        return pd.DataFrame()


# ── Fundamentals ──────────────────────────────────────────────────────────────

def fetch_fundamentals(symbol: str) -> dict:
    """Return key fundamental metrics from yfinance info."""
    cache_key = f"fundamentals_{symbol}"
    cached = _load_cache(cache_key, max_age_hours=24)
    if cached is not None:
        return cached

    try:
        info = yf.Ticker(symbol).info
        data = {
            "symbol":           symbol,
            "name":             info.get("longName", symbol),
            "sector":           info.get("sector", "Unknown"),
            "market_cap":       info.get("marketCap", 0),
            "pe_ttm":           info.get("trailingPE", None),
            "pe_fwd":           info.get("forwardPE", None),
            "pb":               info.get("priceToBook", None),
            "ev_ebitda":        info.get("enterpriseToEbitda", None),
            "roe":              info.get("returnOnEquity", None),
            "roa":              info.get("returnOnAssets", None),
            "debt_equity":      info.get("debtToEquity", None),
            "current_ratio":    info.get("currentRatio", None),
            "eps_growth":       info.get("earningsGrowth", None),
            "revenue_growth":   info.get("revenueGrowth", None),
            "profit_margin":    info.get("profitMargins", None),
            "div_yield":        info.get("dividendYield", None),
            "beta":             info.get("beta", None),
            "52w_high":         info.get("fiftyTwoWeekHigh", None),
            "52w_low":          info.get("fiftyTwoWeekLow", None),
            "avg_volume":       info.get("averageVolume", None),
            "price":            info.get("currentPrice") or info.get("regularMarketPrice", None),
        }
        _save_cache(cache_key, data)
        return data
    except Exception as e:
        print(f"  [fundamentals] Failed {symbol}: {e}")
        return {"symbol": symbol}


def fetch_bulk_fundamentals(symbols: list) -> dict:
    """Return {symbol: fundamentals_dict} for all symbols."""
    result = {}
    for i, sym in enumerate(symbols, 1):
        print(f"  Fundamentals {i}/{len(symbols)}: {sym}", end="\r")
        result[sym] = fetch_fundamentals(sym)
    print()
    return result


# ── Technical indicators (pure pandas/numpy — no ta-lib dependency) ───────────

def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Add common technical indicators to an OHLCV DataFrame."""
    if df.empty or len(df) < 50:
        return df

    df = df.copy()
    close = df["Close"]
    high  = df["High"]
    low   = df["Low"]
    vol   = df["Volume"]

    # Moving averages
    df["EMA_20"]  = close.ewm(span=20, adjust=False).mean()
    df["EMA_50"]  = close.ewm(span=50, adjust=False).mean()
    df["EMA_200"] = close.ewm(span=200, adjust=False).mean()

    # Bollinger Bands (20, 2)
    sma20        = close.rolling(20).mean()
    std20        = close.rolling(20).std()
    df["BB_upper"] = sma20 + 2 * std20
    df["BB_lower"] = sma20 - 2 * std20
    df["BB_mid"]   = sma20
    df["BB_pct"]   = (close - df["BB_lower"]) / (df["BB_upper"] - df["BB_lower"])

    # RSI (14)
    delta = close.diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    rs    = gain / loss.replace(0, np.nan)
    df["RSI"] = 100 - (100 / (1 + rs))

    # MACD
    ema12         = close.ewm(span=12, adjust=False).mean()
    ema26         = close.ewm(span=26, adjust=False).mean()
    df["MACD"]    = ema12 - ema26
    df["MACD_sig"] = df["MACD"].ewm(span=9, adjust=False).mean()
    df["MACD_hist"] = df["MACD"] - df["MACD_sig"]

    # ATR (14)
    tr = pd.concat([
        high - low,
        (high - close.shift()).abs(),
        (low  - close.shift()).abs()
    ], axis=1).max(axis=1)
    df["ATR"] = tr.rolling(14).mean()
    df["ATR_pct"] = df["ATR"] / close * 100

    # ADX (14)
    plus_dm  = (high.diff()).clip(lower=0)
    minus_dm = (-low.diff()).clip(lower=0)
    plus_dm[plus_dm < minus_dm]  = 0
    minus_dm[minus_dm < plus_dm] = 0
    atr14    = tr.rolling(14).mean()
    plus_di  = 100 * (plus_dm.rolling(14).mean()  / atr14)
    minus_di = 100 * (minus_dm.rolling(14).mean() / atr14)
    dx       = (100 * (plus_di - minus_di).abs() / (plus_di + minus_di))
    df["ADX"]      = dx.rolling(14).mean()
    df["PLUS_DI"]  = plus_di
    df["MINUS_DI"] = minus_di

    # Volume indicators
    df["Vol_MA20"]   = vol.rolling(20).mean()
    df["Vol_ratio"]  = vol / df["Vol_MA20"]

    # Price momentum
    df["Ret_1d"]  = close.pct_change(1)
    df["Ret_5d"]  = close.pct_change(5)
    df["Ret_20d"] = close.pct_change(20)
    df["Ret_63d"] = close.pct_change(63)
    df["Ret_252d"] = close.pct_change(252)

    # Volatility (annualised)
    df["Vol_20d"]  = close.pct_change().rolling(20).std() * (252 ** 0.5)

    # Z-score of price vs 20-day mean
    df["ZScore_20"] = (close - sma20) / std20

    # 52-week high/low
    df["High_52w"] = high.rolling(252).max()
    df["Low_52w"]  = low.rolling(252).min()
    df["Pct_52w_high"] = (close - df["High_52w"]) / df["High_52w"] * 100
    df["Pct_52w_low"]  = (close - df["Low_52w"])  / df["Low_52w"]  * 100

    # Average Daily Value (INR)
    df["ADV"] = (close * vol).rolling(20).mean()

    return df


def avg_daily_value(df: pd.DataFrame) -> float:
    """Return 20-day average daily traded value in INR."""
    if df.empty:
        return 0
    try:
        return float((df["Close"] * df["Volume"]).tail(20).mean())
    except Exception:
        return 0
