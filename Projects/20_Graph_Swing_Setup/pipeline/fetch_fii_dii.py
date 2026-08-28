"""
fetch_fii_dii.py
==================
Daily fetch of FII/DII net trading activity, appended onto the accumulating
history at data/fii_dii_flow.csv (compute_flow_regime() needs a rolling 5-day
window, so this file is pruned to FLOW_RETENTION_DAYS, well beyond that).

SOURCE
------
    https://www.nseindia.com/api/fiidiiTradeReact
Confidence: MEDIUM -- there is no static-archive alternative for this data;
this is the one NSE publishes it through, and it sits behind the session/bot
-protection layer described in nse_fetch_utils.warm_session(). EXPECT THIS TO
FAIL ON SOME DAYS even when correctly coded -- NSE's bot protection targets
this host more aggressively than the static archive hosts, and GitHub Actions
runners share IP ranges that can get rate-limited independent of anything this
script does.

FAILURE HANDLING: on any error (network, non-200, unexpected JSON shape), this
script logs a warning and leaves the existing fii_dii_flow.csv untouched rather
than writing anything -- a stale flow regime (yesterday's) is a far better
failure mode than a crashed pipeline or a silently wrong/empty regime.
"""

from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from nse_fetch_utils import warm_session, BROWSER_HEADERS, REQUEST_TIMEOUT

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE.parent / "data"
FLOW_PATH = DATA_DIR / "fii_dii_flow.csv"

FLOW_RETENTION_DAYS = 30
API_URL = "https://www.nseindia.com/api/fiidiiTradeReact"


def _to_number(v):
    if isinstance(v, (int, float)):
        return float(v)
    return pd.to_numeric(str(v).replace(",", "").strip(), errors="coerce")


def _parse_records(records: list) -> pd.DataFrame:
    """Pure parsing logic, split out from fetch_latest_flow() so it's testable without
    a network call: turns the API's list of {category, date, netValue, ...} dicts into
    one row per date with FII_Net_Cr / DII_Net_Cr columns. Never raises -- returns an
    empty DataFrame (with warnings printed) on any shape it doesn't recognize."""
    if not isinstance(records, list) or not records:
        print(f"[WARN] fiidiiTradeReact returned an unexpected shape (type={type(records)}). "
              f"Leaving fii_dii_flow.csv untouched.")
        return pd.DataFrame()

    rows = {}
    for rec in records:
        category = str(rec.get("category", "")).strip().upper()
        rec_date = rec.get("date")
        net_val = rec.get("netValue")
        if not rec_date or net_val is None:
            continue
        rows.setdefault(rec_date, {"Date": rec_date, "FII_Net_Cr": None, "DII_Net_Cr": None})
        if "FII" in category or "FPI" in category:
            rows[rec_date]["FII_Net_Cr"] = _to_number(net_val)
        elif "DII" in category:
            rows[rec_date]["DII_Net_Cr"] = _to_number(net_val)

    df = pd.DataFrame(rows.values())
    if df.empty:
        print(f"[WARN] fiidiiTradeReact response had no rows matching an FII/DII category "
              f"(raw sample: {records[:2]}). Leaving fii_dii_flow.csv untouched.")
        return df

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce", dayfirst=True)
    df = df.dropna(subset=["Date"])
    complete = df.dropna(subset=["FII_Net_Cr", "DII_Net_Cr"])
    if len(complete) < len(df):
        print(f"[WARN] {len(df) - len(complete)} row(s) missing FII or DII net value -- dropped.")
    return complete


def fetch_latest_flow() -> pd.DataFrame:
    """Returns a DataFrame with columns Date, FII_Net_Cr, DII_Net_Cr -- one row per
    date present in the API response (usually just the latest session, sometimes a
    short trailing series). Returns an empty DataFrame (never raises) on any failure
    so main() can leave the existing file alone."""
    try:
        session = warm_session()
        resp = session.get(API_URL, headers=BROWSER_HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        records = resp.json()
    except Exception as e:
        print(f"[WARN] fiidiiTradeReact fetch failed ({type(e).__name__}: {e}). "
              f"Leaving fii_dii_flow.csv untouched.")
        return pd.DataFrame()

    return _parse_records(records)


def main():
    DATA_DIR.mkdir(exist_ok=True)
    existing = pd.read_csv(FLOW_PATH, parse_dates=["Date"]) if FLOW_PATH.exists() else pd.DataFrame()

    fetched = fetch_latest_flow()
    if fetched.empty:
        if existing.empty:
            print("No existing fii_dii_flow.csv and today's fetch failed -- nothing to write. "
                  "Flow regime will show as missing until a fetch succeeds.")
        return

    combined = pd.concat([existing, fetched], ignore_index=True) if not existing.empty else fetched
    combined = combined.drop_duplicates(subset=["Date"], keep="last").sort_values("Date")

    cutoff = pd.Timestamp(date.today() - timedelta(days=FLOW_RETENTION_DAYS))
    combined = combined[combined["Date"] >= cutoff]

    combined.to_csv(FLOW_PATH, index=False)
    print(f"Wrote {FLOW_PATH}: {len(combined)} rows ({len(fetched)} fetched this run), "
          f"through {combined['Date'].max().date()}.")


if __name__ == "__main__":
    main()
