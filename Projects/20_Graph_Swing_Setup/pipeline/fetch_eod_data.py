"""
fetch_eod_data.py
==================
Daily incremental fetch of NSE end-of-day price/volume/delivery data, appended
onto the accumulating long-format history at data/daily_eod.csv -- which IS
daily_eod.csv as rs_ranking.py consumes it (it needs the full trailing history
in one file, not a single day's snapshot, to compute 252-day quarterly returns).

SOURCES
-------
Equity bhavcopy ("Securities Bhavdata Full" report -- the one report that
includes delivery %, which the raw CM bhavcopy does not):
    https://archives.nseindia.com/products/content/sec_bhavdata_full_{DDMMYYYY}.csv
Confidence: HIGH -- static file, archives.nseindia.com family, same host
pattern load_stock_universe.py already proved works from GitHub Actions.

NIFTY 500 benchmark close (RS ranking requires a Ticker == "NIFTY500" row set
covering the same date range as the universe):
    https://archives.nseindia.com/content/indices/ind_close_all_{DDMMYYYY}.csv
Confidence: MEDIUM-HIGH -- same static-file host family; exact "Index Name"
label match ("Nifty 500" vs "NIFTY 500" etc.) is handled case/space-insensitively
below, but if NSE renames the column outright this will raise a clear error
naming the columns it actually got.

WHAT THIS SCRIPT DOES NOT DO
-----------------------------
It does not backfill history -- run backfill_eod_history.py once, manually,
before relying on RS Ranking / MA200 breadth (both need 200-253 trading days).
This script only ever adds ONE new day per run, which is what the daily
schedule needs.
"""

import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd

from nse_fetch_utils import fetch_archive_csv, normalize_columns, require_columns

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE.parent / "data"
EOD_PATH = DATA_DIR / "daily_eod.csv"

BENCHMARK_TICKER = "NIFTY500"
BENCHMARK_INDEX_NAME = "nifty 500"  # matched case/space-insensitively against the index CSV
# rs_ranking.py needs >=253 trading sessions. A calendar year gives ~260 trading days
# (365 * 5/7 minus ~15 NSE holidays) -- 400 calendar days of retention leaves ~270+ trading
# days even after weekends/holidays, comfortable margin above the 253 floor without letting
# the file grow unbounded. Keep this in sync with BACKFILL_CALENDAR_DAYS in
# backfill_eod_history.py -- retention shouldn't outlive what the backfill actually seeded.
HISTORY_RETENTION_CALENDAR_DAYS = 400

REQUIRED_EQUITY_COLS = {"SYMBOL", "SERIES", "OPEN_PRICE", "HIGH_PRICE", "LOW_PRICE",
                         "CLOSE_PRICE", "TTL_TRD_QNTY", "DELIV_PER"}


def fetch_equity_day(d: date) -> pd.DataFrame:
    """Fetch one day's equity bhavcopy. Returns None on a non-trading day (404)."""
    url = f"https://archives.nseindia.com/products/content/sec_bhavdata_full_{d.strftime('%d%m%Y')}.csv"
    raw = fetch_archive_csv(url)
    if raw is None:
        return None
    raw = normalize_columns(raw)
    require_columns(raw, REQUIRED_EQUITY_COLS, "sec_bhavdata_full")

    eq = raw[raw["SERIES"].astype(str).str.strip() == "EQ"].copy()
    df = pd.DataFrame({
        "Ticker": eq["SYMBOL"].astype(str).str.strip(),
        "Date": pd.Timestamp(d),
        "Open": pd.to_numeric(eq["OPEN_PRICE"], errors="coerce"),
        "High": pd.to_numeric(eq["HIGH_PRICE"], errors="coerce"),
        "Low": pd.to_numeric(eq["LOW_PRICE"], errors="coerce"),
        "Close": pd.to_numeric(eq["CLOSE_PRICE"], errors="coerce"),
        "Volume": pd.to_numeric(eq["TTL_TRD_QNTY"], errors="coerce"),
        # DELIV_PER is "-" for series/rows where delivery isn't applicable -- coerce to NaN, not a crash.
        "Delivery_Pct": pd.to_numeric(eq["DELIV_PER"], errors="coerce"),
    })
    return df.dropna(subset=["Ticker", "Close"]).drop_duplicates(subset=["Ticker"])


def fetch_benchmark_day(d: date) -> pd.DataFrame:
    """Fetch the NIFTY 500 index close for one day as a single synthetic Ticker row.
    Returns None on a non-trading day, or if the index isn't found in that day's file
    (logged, not raised -- a missing benchmark day shouldn't take down the equity fetch)."""
    url = f"https://archives.nseindia.com/content/indices/ind_close_all_{d.strftime('%d%m%Y')}.csv"
    raw = fetch_archive_csv(url)
    if raw is None:
        return None
    raw = normalize_columns(raw)

    name_col = next((c for c in raw.columns if c.strip().lower() in ("index name", "index_name")), None)
    close_col = next((c for c in raw.columns
                       if c.strip().lower() in ("closing index value", "close", "close_index_val")), None)
    if name_col is None or close_col is None:
        print(f"[WARN] ind_close_all_{d.strftime('%d%m%Y')}.csv: couldn't find index-name/close columns "
              f"among {list(raw.columns)} -- skipping benchmark row for {d}.")
        return None

    match = raw[raw[name_col].astype(str).str.strip().str.lower() == BENCHMARK_INDEX_NAME]
    if match.empty:
        print(f"[WARN] '{BENCHMARK_INDEX_NAME}' not found in {d} index file "
              f"(available: {sorted(raw[name_col].astype(str).str.strip().unique())[:10]}...) -- skipping.")
        return None

    close_val = pd.to_numeric(match.iloc[0][close_col], errors="coerce")
    if pd.isna(close_val):
        return None
    return pd.DataFrame([{
        "Ticker": BENCHMARK_TICKER, "Date": pd.Timestamp(d),
        "Open": close_val, "High": close_val, "Low": close_val, "Close": close_val,
        "Volume": 0, "Delivery_Pct": None,
    }])


def fetch_one_day(d: date) -> pd.DataFrame:
    """Fetch equities + benchmark for one day and combine. Returns None if the equity
    fetch itself finds no trading day (benchmark alone is never sufficient)."""
    equities = fetch_equity_day(d)
    if equities is None:
        return None
    benchmark = fetch_benchmark_day(d)
    return pd.concat([equities, benchmark], ignore_index=True) if benchmark is not None else equities


def _true_range(g: pd.DataFrame) -> pd.Series:
    prev_close = g["Close"].shift(1)
    return pd.concat([
        g["High"] - g["Low"],
        (g["High"] - prev_close).abs(),
        (g["Low"] - prev_close).abs(),
    ], axis=1).max(axis=1)


def recompute_indicators(history: pd.DataFrame) -> pd.DataFrame:
    """Recompute MA20/MA50/MA200/ATR14 for every row from the accumulated history.
    Cheap enough to redo in full each run (~750 tickers x ~300 rows) and keeps every
    row internally consistent regardless of which days were backfilled vs. fetched live."""
    history = history.sort_values(["Ticker", "Date"]).reset_index(drop=True)
    out_frames = []
    for ticker, g in history.groupby("Ticker", sort=False):
        g = g.sort_values("Date").copy()
        g["MA20"] = g["Close"].rolling(20, min_periods=1).mean()
        g["MA50"] = g["Close"].rolling(50, min_periods=1).mean()
        g["MA200"] = g["Close"].rolling(200, min_periods=1).mean()
        g["ATR14"] = _true_range(g).rolling(14, min_periods=1).mean()
        out_frames.append(g)
    return pd.concat(out_frames, ignore_index=True)


def main():
    DATA_DIR.mkdir(exist_ok=True)

    existing = pd.read_csv(EOD_PATH, parse_dates=["Date"]) if EOD_PATH.exists() else pd.DataFrame()
    if not existing.empty:
        latest_have = existing["Date"].max().date()
        print(f"Existing history: {len(existing)} rows, {existing['Ticker'].nunique()} tickers, "
              f"through {latest_have}.")
    else:
        print("No existing daily_eod.csv found -- this run will seed only TODAY's data. "
              "Run backfill_eod_history.py once for RS Ranking / MA200 to work immediately.")

    today = date.today()
    fetched = None
    # Try today, then walk back a few days in case today's bhavcopy isn't published yet
    # (NSE typically posts it a few hours after close; an early-morning run could predate it).
    for offset in range(5):
        d = today - timedelta(days=offset)
        if not existing.empty and pd.Timestamp(d) in set(existing["Date"]):
            print(f"{d} already present in history -- nothing new to fetch.")
            fetched = pd.DataFrame()
            break
        print(f"Fetching equity + benchmark bhavcopy for {d} ...")
        day_df = fetch_one_day(d)
        if day_df is not None and not day_df.empty:
            fetched = day_df
            print(f"  -> {len(day_df)} rows for {d}.")
            break
        print(f"  -> no data for {d} (holiday/weekend, or not yet published).")

    if fetched is None:
        print("[WARN] Could not fetch any recent trading day's bhavcopy after 5 attempts. "
              "Leaving daily_eod.csv untouched.")
        sys.exit(0)

    combined = pd.concat([existing, fetched], ignore_index=True) if fetched is not None and not fetched.empty else existing
    combined = combined.drop_duplicates(subset=["Ticker", "Date"], keep="last")

    cutoff = pd.Timestamp(today - timedelta(days=HISTORY_RETENTION_CALENDAR_DAYS))
    combined = combined[combined["Date"] >= cutoff]

    combined = recompute_indicators(combined)
    combined.to_csv(EOD_PATH, index=False)
    print(f"Wrote {EOD_PATH}: {len(combined)} rows, {combined['Ticker'].nunique()} tickers, "
          f"{combined['Date'].min().date()} through {combined['Date'].max().date()}.")


if __name__ == "__main__":
    main()
