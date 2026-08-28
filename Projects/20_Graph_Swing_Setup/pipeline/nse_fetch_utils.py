"""
nse_fetch_utils.py
===================
Shared plumbing for every live NSE data fetcher in this pipeline (fetch_eod_data.py,
fetch_bulk_deals.py, fetch_fii_dii.py, fetch_derivatives.py, backfill_eod_history.py).

DATA SOURCE RELIABILITY -- READ BEFORE DEBUGGING A FAILED FETCH
-----------------------------------------------------------------
NSE serves data from two very differently-behaved hosts:

1. archives.nseindia.com / nsearchives.nseindia.com -- plain static file serving.
   No session, no cookies, just a browser-like User-Agent. This is the pattern
   load_stock_universe.py already proved works reliably from GitHub Actions.
   Used for: equity bhavcopy, index close values, bulk/block deals.

2. www.nseindia.com/api/... -- a real application API sitting behind NSE's bot
   protection. It refuses any request that doesn't carry cookies from a prior
   browser-like visit to a normal page on the same site. `warm_session()` below
   does that handshake (home page, then an inner page, then the API call).
   This path is inherently more fragile on shared/datacenter IPs (GitHub Actions
   runners included) -- expect it to fail some days even when everything is
   coded correctly. Every fetcher built on it must degrade gracefully: log a
   clear warning and leave any previously-accumulated CSV untouched rather than
   crashing the whole daily run.
   Used for: FII/DII trade activity.

NSE CSV files routinely have leading/trailing whitespace in header names (e.g.
" SYMBOL" instead of "SYMBOL") and sometimes shuffle column casing between
report refreshes. Every parser in this pipeline normalizes headers
(strip + uppercase or lower, per-function) and validates required columns
explicitly, raising a message that prints the ACTUAL columns received -- so a
schema drift shows up as one clear error line in the Actions log instead of a
silent wrong-column bug three files downstream. Follow that pattern in any new
fetcher.
"""

import io
import time
import zipfile
from datetime import date, timedelta

import pandas as pd
import requests

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

ARCHIVE_HEADERS = {**BROWSER_HEADERS, "Accept": "text/csv,application/zip,*/*"}

REQUEST_TIMEOUT = 30
POLITE_DELAY_SECONDS = 0.4  # between requests in any loop -- be a good citizen of a free public archive


def fetch_archive_csv(url: str, timeout: int = REQUEST_TIMEOUT):
    """
    GET a static CSV (or CSV-in-ZIP) from archives.nseindia.com / nsearchives.nseindia.com.
    Returns a pandas DataFrame, or None if the resource doesn't exist for this date
    (404 -- expected for weekends/holidays when looping over a date range; NOT an error).
    Raises for any other HTTP failure so real problems aren't swallowed silently.
    """
    resp = requests.get(url, headers=ARCHIVE_HEADERS, timeout=timeout)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()

    if url.lower().endswith(".zip") or resp.content[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            csv_names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
            if not csv_names:
                raise ValueError(f"No CSV found inside zip at {url} (entries: {zf.namelist()})")
            with zf.open(csv_names[0]) as f:
                return pd.read_csv(f)

    return pd.read_csv(io.StringIO(resp.text))


def warm_session() -> requests.Session:
    """
    Perform the cookie handshake www.nseindia.com's bot protection expects before
    it will answer an /api/ call: a plain GET of the homepage, then an inner page,
    both with browser-like headers, carried on the same Session so cookies persist.
    Returns the warmed Session -- call .get(api_url, headers=BROWSER_HEADERS) on it.
    """
    session = requests.Session()
    session.headers.update(BROWSER_HEADERS)
    session.get("https://www.nseindia.com", timeout=REQUEST_TIMEOUT)
    time.sleep(1)  # let NSE's edge finish setting cookies before the next hit
    session.get("https://www.nseindia.com/market-data/live-equity-market", timeout=REQUEST_TIMEOUT)
    time.sleep(1)
    return session


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Strip whitespace from every column header -- NSE CSVs routinely ship ' SYMBOL' etc."""
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df


def require_columns(df: pd.DataFrame, required: set, source_label: str):
    missing = required - set(df.columns)
    if missing:
        raise ValueError(
            f"{source_label}: expected columns {sorted(missing)} not found. "
            f"Got columns: {list(df.columns)}. NSE likely changed this report's schema -- "
            f"update the rename/parse logic for {source_label}."
        )


def trading_days_back(n_calendar_days: int, from_date: date = None):
    """Yield the last n_calendar_days calendar dates (descending, most recent first),
    for callers that loop and skip weekends/holidays via 404 handling rather than a
    trading calendar (NSE archives simply 404 on non-trading days, which is a cheap
    and reliable enough signal not to need a maintained holiday list)."""
    from_date = from_date or date.today()
    for i in range(n_calendar_days):
        yield from_date - timedelta(days=i)
