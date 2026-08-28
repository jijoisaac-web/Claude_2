"""
fetch_index_levels.py
======================
Daily incremental fetch of headline NSE index levels (NIFTY 50, NIFTY BANK)
for the GraphAlpha dashboard's hero metric cards and Market Momentum chart --
appended onto the accumulating history at data/index_levels.csv.

SOURCE
------
Reuses the SAME archive file fetch_eod_data.py already fetches for the
NIFTY500 benchmark row (one static CSV lists every NSE index's OHLC for the
day, not just NIFTY 500 -- fetch_eod_data.py just happened to only read one
row out of it):
    https://archives.nseindia.com/content/indices/ind_close_all_{DDMMYYYY}.csv
Confidence: MEDIUM-HIGH -- same static-file host family/URL as the proven
benchmark fetch. Column matching is case/space-insensitive with a documented
fallback, same pattern as fetch_eod_data.py's fetch_benchmark_day().

This is a deliberate second network call to the same URL fetch_eod_data.py
already hits that day (rather than threading index-level extraction through
the benchmark fetch) -- keeps this fetcher fully independent so it can fail
or be re-run without touching daily_eod.csv/RS ranking, at the cost of one
extra (cheap, static-file) request per run.

OUTPUT
------
data/index_levels.csv: Date,Index,Open,High,Low,Close,Chg_Pct
One row per (Date, Index) -- Index in {NIFTY50, BANKNIFTY}. Chg_Pct comes
directly from the archive file's own "Change(%)" column when present;
recomputed from the prior row's Close otherwise.

WHAT THIS SCRIPT DOES NOT DO
-----------------------------
No backfill -- like fetch_eod_data.py, this only ever adds ONE new day per
run. History accumulates naturally at one row/index/day; a fresh deploy of
the GraphAlpha "live data" wiring will show a single-point sparkline/chart
until a few days of runs have accumulated, same growth curve every other
accumulating CSV in this pipeline went through (see sector_rotation_history.csv).
"""

import sys
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from nse_fetch_utils import fetch_archive_csv, normalize_columns

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE.parent / "data"
INDEX_LEVELS_PATH = DATA_DIR / "index_levels.csv"

# (internal key used in this pipeline's CSV/JSON -> the "Index Name" label NSE's
# archive file uses for it, matched case/space-insensitively).
TRACKED_INDICES = {
    "NIFTY50": "nifty 50",
    "BANKNIFTY": "nifty bank",
}

# Same retention window as daily_eod.csv (HISTORY_RETENTION_CALENDAR_DAYS there) --
# comfortably covers the dashboard's longest chart range (1Y) even after
# weekends/holidays thin out the calendar-day count.
HISTORY_RETENTION_CALENDAR_DAYS = 400


def _find_col(columns, candidates):
    lowered = {c.strip().lower(): c for c in columns}
    for cand in candidates:
        if cand in lowered:
            return lowered[cand]
    return None


def fetch_indices_for_day(d: date) -> pd.DataFrame:
    """Fetch NIFTY 50 + NIFTY BANK OHLC for one day. Returns None on a non-trading
    day (404) or if the archive file's schema doesn't match what we expect (logged,
    not raised -- a missing index-level day shouldn't take down the rest of the
    fetch layer, same graceful-degradation stance as every other fetcher here)."""
    url = f"https://archives.nseindia.com/content/indices/ind_close_all_{d.strftime('%d%m%Y')}.csv"
    raw = fetch_archive_csv(url)
    if raw is None:
        return None
    raw = normalize_columns(raw)

    name_col = _find_col(raw.columns, ["index name", "index_name"])
    close_col = _find_col(raw.columns, ["closing index value", "close", "close_index_val"])
    open_col = _find_col(raw.columns, ["open index value", "open"])
    high_col = _find_col(raw.columns, ["high index value", "high"])
    low_col = _find_col(raw.columns, ["low index value", "low"])
    chg_pct_col = _find_col(raw.columns, ["change(%)", "change (%)", "pct_change", "% change"])

    if name_col is None or close_col is None:
        print(f"[WARN] ind_close_all_{d.strftime('%d%m%Y')}.csv: couldn't find index-name/close "
              f"columns among {list(raw.columns)} -- skipping index levels for {d}.")
        return None

    rows = []
    names_lower = raw[name_col].astype(str).str.strip().str.lower()
    for key, label in TRACKED_INDICES.items():
        match = raw[names_lower == label]
        if match.empty:
            print(f"[WARN] '{label}' not found in {d} index file "
                  f"(available: {sorted(names_lower.unique())[:15]}...) -- skipping {key} for {d}.")
            continue
        row = match.iloc[0]
        close_val = pd.to_numeric(row[close_col], errors="coerce")
        if pd.isna(close_val):
            continue
        rows.append({
            "Date": pd.Timestamp(d),
            "Index": key,
            "Open": pd.to_numeric(row[open_col], errors="coerce") if open_col else close_val,
            "High": pd.to_numeric(row[high_col], errors="coerce") if high_col else close_val,
            "Low": pd.to_numeric(row[low_col], errors="coerce") if low_col else close_val,
            "Close": close_val,
            "Chg_Pct": pd.to_numeric(row[chg_pct_col], errors="coerce") if chg_pct_col else None,
        })
    if not rows:
        return None
    return pd.DataFrame(rows)


def _recompute_chg_pct(history: pd.DataFrame) -> pd.DataFrame:
    """Fill any missing Chg_Pct (archive file omitted the column, or a row predates
    this fetcher) from the prior row's Close per index -- keeps every row usable for
    the dashboard's 1D-change display even if NSE's own column is absent some days."""
    history = history.sort_values(["Index", "Date"]).reset_index(drop=True)
    out = []
    for _, g in history.groupby("Index", sort=False):
        g = g.sort_values("Date").copy()
        computed = g["Close"].pct_change() * 100.0
        g["Chg_Pct"] = g["Chg_Pct"].where(g["Chg_Pct"].notna(), computed)
        out.append(g)
    return pd.concat(out, ignore_index=True)


def main():
    DATA_DIR.mkdir(exist_ok=True)

    existing = pd.read_csv(INDEX_LEVELS_PATH, parse_dates=["Date"]) if INDEX_LEVELS_PATH.exists() else pd.DataFrame()
    if not existing.empty:
        latest_have = existing["Date"].max().date()
        print(f"Existing index_levels.csv: {len(existing)} rows through {latest_have}.")
    else:
        print("No existing index_levels.csv found -- this run seeds only TODAY's levels. "
              "Sparklines/charts will show a single point until a few days accumulate.")

    today = date.today()
    fetched = None
    for offset in range(5):
        d = today - timedelta(days=offset)
        if not existing.empty and pd.Timestamp(d) in set(existing["Date"]):
            print(f"{d} already present in index_levels.csv -- nothing new to fetch.")
            fetched = pd.DataFrame()
            break
        print(f"Fetching NIFTY 50 / NIFTY BANK levels for {d} ...")
        day_df = fetch_indices_for_day(d)
        if day_df is not None and not day_df.empty:
            fetched = day_df
            print(f"  -> {len(day_df)} index rows for {d}.")
            break
        print(f"  -> no data for {d} (holiday/weekend, or not yet published).")

    if fetched is None:
        print("[WARN] Could not fetch index levels for any recent day after 5 attempts. "
              "Leaving index_levels.csv untouched.")
        sys.exit(0)

    combined = pd.concat([existing, fetched], ignore_index=True) if not fetched.empty else existing
    combined = combined.drop_duplicates(subset=["Index", "Date"], keep="last")

    cutoff = pd.Timestamp(today - timedelta(days=HISTORY_RETENTION_CALENDAR_DAYS))
    combined = combined[combined["Date"] >= cutoff]

    combined = _recompute_chg_pct(combined)
    combined.to_csv(INDEX_LEVELS_PATH, index=False)
    print(f"Wrote {INDEX_LEVELS_PATH}: {len(combined)} rows across {combined['Index'].nunique()} indices, "
          f"{combined['Date'].min().date()} through {combined['Date'].max().date()}.")


if __name__ == "__main__":
    main()
