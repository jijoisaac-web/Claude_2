"""
backfill_eod_history.py
=========================
ONE-TIME (or occasional) historical seed for data/daily_eod.csv. Loops back
BACKFILL_CALENDAR_DAYS calendar days, fetching each trading day's equity +
NIFTY 500 benchmark bhavcopy via fetch_eod_data.fetch_one_day(), and writes
the combined history with MA20/MA50/MA200/ATR14 computed throughout.

WHY THIS EXISTS SEPARATELY FROM fetch_eod_data.py
---------------------------------------------------
rs_ranking.compute_rs_ranking() needs >=253 trading sessions per ticker before
it can compute anything; compute_market_breadth() needs MA200. Starting
daily_eod.csv from an empty file and growing it one day at a time via the
daily pipeline would leave RS Ranking and full breadth in their current
"missing data" dashboard state for roughly a year. Run this once (or after a
long gap in daily runs) to seed that history immediately; fetch_eod_data.py
handles the day-to-day increment after that.

RUNTIME / NSE ARCHIVE ETIQUETTE
---------------------------------
~400 calendar days x 2 requests/day (equity + benchmark), with a polite delay
between requests -- expect several minutes, most of it spent on weekend/holiday
404s that fail fast. This is a workflow_dispatch-only job (see
.github/workflows/backfill_history.yml), never scheduled -- there's no reason
to repeat this hundreds-of-requests job daily when fetch_eod_data.py only adds
one row per day.
"""

import time
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from fetch_eod_data import fetch_one_day, recompute_indicators
from nse_fetch_utils import POLITE_DELAY_SECONDS

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE.parent / "data"
EOD_PATH = DATA_DIR / "daily_eod.csv"

BACKFILL_CALENDAR_DAYS = 400  # keep in sync with HISTORY_RETENTION_CALENDAR_DAYS in fetch_eod_data.py


def main():
    DATA_DIR.mkdir(exist_ok=True)
    today = date.today()

    frames = []
    trading_days_found = 0
    for offset in range(BACKFILL_CALENDAR_DAYS):
        d = today - timedelta(days=offset)
        day_df = fetch_one_day(d)
        if day_df is not None and not day_df.empty:
            frames.append(day_df)
            trading_days_found += 1
            if trading_days_found % 25 == 0:
                print(f"  ... {trading_days_found} trading days fetched so far (currently at {d}).")
        time.sleep(POLITE_DELAY_SECONDS)

    if not frames:
        raise RuntimeError(
            "Backfill fetched zero trading days -- check whether NSE's archive URLs/schema "
            "changed (see nse_fetch_utils.py docstring) before assuming this is a transient failure."
        )

    combined = pd.concat(frames, ignore_index=True).drop_duplicates(subset=["Ticker", "Date"], keep="last")
    print(f"Fetched {trading_days_found} trading days, {len(combined)} total rows, "
          f"{combined['Ticker'].nunique()} tickers.")

    combined = recompute_indicators(combined)
    combined.to_csv(EOD_PATH, index=False)
    print(f"Wrote {EOD_PATH}: {combined['Date'].min().date()} through {combined['Date'].max().date()}.")

    bench_days = (combined["Ticker"] == "NIFTY500").sum()
    print(f"Benchmark (NIFTY500) rows: {bench_days} / {trading_days_found} trading days "
          f"({'OK' if bench_days >= trading_days_found * 0.9 else 'WARNING: many benchmark days missing -- RS ranking needs full benchmark coverage, check fetch_benchmark_day() warnings above'}).")


if __name__ == "__main__":
    main()
