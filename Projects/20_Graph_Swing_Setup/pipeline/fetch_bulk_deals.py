"""
fetch_bulk_deals.py
=====================
Daily incremental fetch of NSE bulk/block deal disclosures, appended onto the
accumulating history at data/bulk_deals.csv (institutional_footprint.py does
its own trailing-window filtering internally, so this file just needs to hold
enough recent history -- pruned to BULK_RETENTION_DAYS, comfortably more than
the ~10-day lookback compute_bulk_deal_signals() actually uses).

SOURCE
------
    https://archives.nseindia.com/content/equities/bulk.csv
    https://archives.nseindia.com/content/equities/block.csv
Confidence: HIGH -- static file, archives.nseindia.com family (same host
pattern proven by load_stock_universe.py). NOTE: unlike the bhavcopy endpoints,
this file is NOT date-parameterized -- it always serves the most recent
trading day's deals, so this script is meant to run once per day, close to
(or after) market close; running it twice in one day just re-fetches the same
rows (de-duped harmlessly on Date+Ticker+Client_Name+Deal_Type+Quantity).
"""

from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from nse_fetch_utils import fetch_archive_csv, normalize_columns

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE.parent / "data"
BULK_PATH = DATA_DIR / "bulk_deals.csv"

BULK_RETENTION_DAYS = 40
SOURCES = {
    "BULK": "https://archives.nseindia.com/content/equities/bulk.csv",
    "BLOCK": "https://archives.nseindia.com/content/equities/block.csv",
}


def _find_col(columns, *candidates):
    lowered = {c.strip().lower(): c for c in columns}
    for cand in candidates:
        if cand in lowered:
            return lowered[cand]
    return None


def _parse_deal_csv(raw: pd.DataFrame, deal_source: str) -> pd.DataFrame:
    raw = normalize_columns(raw)
    date_col = _find_col(raw.columns, "date")
    symbol_col = _find_col(raw.columns, "symbol")
    client_col = _find_col(raw.columns, "client name", "clientname")
    side_col = _find_col(raw.columns, "buy/sell", "buysell")
    qty_col = _find_col(raw.columns, "quantity traded", "quantity")
    price_col = _find_col(raw.columns, "trade price / wght. avg. price", "trade price", "price")

    missing_labels = [label for label, col in
                       [("date", date_col), ("symbol", symbol_col), ("client", client_col),
                        ("buy/sell", side_col), ("quantity", qty_col)] if col is None]
    if missing_labels:
        raise ValueError(
            f"{deal_source} deals CSV: couldn't find columns for {missing_labels}. "
            f"Got columns: {list(raw.columns)}. NSE likely renamed this report -- update _find_col candidates."
        )

    df = pd.DataFrame({
        "Date": pd.to_datetime(raw[date_col], errors="coerce", dayfirst=True),
        "Ticker": raw[symbol_col].astype(str).str.strip(),
        "Client_Name": raw[client_col].astype(str).str.strip(),
        "Deal_Type": raw[side_col].astype(str).str.strip().str.upper(),
        "Quantity": pd.to_numeric(raw[qty_col], errors="coerce"),
        "Price": pd.to_numeric(raw[price_col], errors="coerce") if price_col else None,
        "Exchange": "NSE",
        "Deal_Source": deal_source,
    })
    return df.dropna(subset=["Date", "Ticker", "Deal_Type", "Quantity"])


def fetch_today_deals() -> pd.DataFrame:
    frames = []
    for source_label, url in SOURCES.items():
        raw = fetch_archive_csv(url)
        if raw is None or raw.empty:
            print(f"[WARN] {source_label} deals: no data returned from {url}.")
            continue
        try:
            frames.append(_parse_deal_csv(raw, source_label))
        except ValueError as e:
            print(f"[WARN] {e}")
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def main():
    DATA_DIR.mkdir(exist_ok=True)
    existing = pd.read_csv(BULK_PATH, parse_dates=["Date"]) if BULK_PATH.exists() else pd.DataFrame()

    today_deals = fetch_today_deals()
    if today_deals.empty:
        print("[WARN] No bulk/block deals fetched today -- leaving bulk_deals.csv untouched "
              "(could be a genuinely quiet day, or the fetch failed; check warnings above).")
        return

    combined = pd.concat([existing, today_deals], ignore_index=True) if not existing.empty else today_deals
    dedup_cols = ["Date", "Ticker", "Client_Name", "Deal_Type", "Quantity"]
    combined = combined.drop_duplicates(subset=dedup_cols, keep="last")

    cutoff = pd.Timestamp(date.today() - timedelta(days=BULK_RETENTION_DAYS))
    combined = combined[combined["Date"] >= cutoff]

    combined.to_csv(BULK_PATH, index=False)
    print(f"Wrote {BULK_PATH}: {len(combined)} rows ({len(today_deals)} new today), "
          f"{combined['Ticker'].nunique()} tickers, back to {combined['Date'].min().date()}.")


if __name__ == "__main__":
    main()
