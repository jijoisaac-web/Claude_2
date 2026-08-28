"""
fetch_derivatives.py
======================
Daily fetch + aggregation of NSE F&O data into data/derivatives_data.csv, the
one-row-per-ticker-per-day snapshot classify_oi_buildup() consumes (it expects
Close/Prev_Close and Fut_OI/Prev_Fut_OI side by side in the same row -- the
F&O bhavcopy conveniently carries both a contract's close AND previous close,
and its open interest AND change-in-OI, in a single day's file, so no separate
day-over-day history/diffing is needed here unlike the other fetchers).

SOURCE
------
    https://nsearchives.nseindia.com/content/fo/BhavCopy_NSE_FO_0_0_0_{YYYYMMDD}_F_0000.csv.zip
Confidence: LOW-MEDIUM -- this is the UDiFF "common bhavcopy" naming NSE moved
equities to in July 2024, inferred (not directly confirmed) to apply to the FO
segment the same way. THIS IS THE MOST LIKELY OF THE FOUR FETCHERS TO NEED A
URL/COLUMN-NAME FIX AFTER THE FIRST REAL RUN. If it 404s or the column mapping
below raises, the Actions log will show the exact URL tried and (if the file
did download) the exact column names found -- update FO_URL_TEMPLATES and/or
the _find_col candidate lists accordingly rather than guessing again from
scratch. This is written defensively for exactly that reason: two URL
templates are tried in sequence (current UDiFF path, then the pre-2024 legacy
path) before giving up.

WHAT'S COMPUTED PER TICKER (nearest-expiry contract only)
------------------------------------------------------------
Fut_OI / Prev_Fut_OI : from the nearest-expiry stock-future row's OpnIntrst
                       and (OpnIntrst - ChngInOpnIntrst).
Close / Prev_Close   : from that same future row's ClsPric / PrvsClsgPric --
                       deliberately the FUTURES price, not the underlying
                       equity price, so OI buildup classification stays
                       internally consistent (same contract, same day).
Put_OI / Call_OI     : summed OpnIntrst across all PE / CE option rows at
                       that same nearest expiry (all strikes).
Rollover_Pct         : approximated as next-month future OI / (near-month +
                       next-month future OI) * 100 -- the share of open
                       futures interest already sitting in the next series.
                       This is a reasonable proxy, not NSE's own published
                       rollover figure (which factors in traded volume, not
                       just OI); documented here so it isn't mistaken for that.
"""

from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from nse_fetch_utils import fetch_archive_csv, normalize_columns

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE.parent / "data"
DERIV_PATH = DATA_DIR / "derivatives_data.csv"

FO_URL_TEMPLATES = [
    "https://nsearchives.nseindia.com/content/fo/BhavCopy_NSE_FO_0_0_0_{ymd}_F_0000.csv.zip",
    "https://archives.nseindia.com/content/historical/DERIVATIVES/{yyyy}/{mon}/fo{ddmonyyyy}bhav.csv.zip",
]

# Column-name candidates, most-likely-first, covering both the current UDiFF naming
# and the pre-July-2024 legacy naming in case NSE serves (or reverts to) that shape.
COL_CANDIDATES = {
    "instrument_type": ["FinInstrmTp", "INSTRUMENT"],
    "symbol": ["TckrSymb", "SYMBOL"],
    "expiry": ["XpryDt", "EXPIRY_DT"],
    "option_type": ["OptnTp", "OPTION_TYP"],
    "close": ["ClsPric", "CLOSE"],
    "prev_close": ["PrvsClsgPric", "PREV_CLOSE"],
    "open_interest": ["OpnIntrst", "OPEN_INT"],
    "change_in_oi": ["ChngInOpnIntrst", "CHG_IN_OI"],
    "trade_date": ["TradDt", "TIMESTAMP"],
}

# Instrument-type values meaning "single-stock future" / "single-stock option"
# across the naming conventions above.
FUTURE_TYPES = {"STF", "FUTSTK"}
OPTION_TYPES = {"STO", "OPTSTK"}


def _resolve_columns(df: pd.DataFrame) -> dict:
    resolved = {}
    missing = []
    for logical_name, candidates in COL_CANDIDATES.items():
        found = next((c for c in candidates if c in df.columns), None)
        if found is None:
            missing.append((logical_name, candidates))
        else:
            resolved[logical_name] = found
    if missing:
        raise ValueError(
            f"F&O bhavcopy: couldn't resolve columns for {[m[0] for m in missing]} "
            f"(tried {missing}). Got columns: {list(df.columns)}. "
            f"Update COL_CANDIDATES in fetch_derivatives.py to match."
        )
    return resolved


def fetch_fo_bhavcopy(d: date) -> pd.DataFrame:
    """Try each known URL template in turn. Returns None if none has data for this date."""
    fmt_args = {
        "ymd": d.strftime("%Y%m%d"),
        "yyyy": d.strftime("%Y"),
        "mon": d.strftime("%b").upper(),
        "ddmonyyyy": d.strftime("%d%b%Y").upper(),
    }
    for template in FO_URL_TEMPLATES:
        url = template.format(**fmt_args)
        try:
            raw = fetch_archive_csv(url)
        except Exception as e:
            print(f"[WARN] F&O bhavcopy fetch failed at {url}: {type(e).__name__}: {e}")
            continue
        if raw is not None and not raw.empty:
            print(f"F&O bhavcopy found at {url} ({len(raw)} raw rows).")
            return normalize_columns(raw)
    return None


def aggregate_derivatives(raw: pd.DataFrame, as_of: date) -> pd.DataFrame:
    cols = _resolve_columns(raw)
    df = raw.rename(columns={v: k for k, v in cols.items()})
    df["expiry"] = pd.to_datetime(df["expiry"], errors="coerce", dayfirst=True)
    df["instrument_type"] = df["instrument_type"].astype(str).str.strip().str.upper()
    df["symbol"] = df["symbol"].astype(str).str.strip()
    df["option_type"] = df["option_type"].astype(str).str.strip().str.upper()
    for numeric_col in ("close", "prev_close", "open_interest", "change_in_oi"):
        df[numeric_col] = pd.to_numeric(df[numeric_col], errors="coerce")

    rows = []
    futures = df[df["instrument_type"].isin(FUTURE_TYPES)]
    options = df[df["instrument_type"].isin(OPTION_TYPES)]

    for symbol, fut_group in futures.groupby("symbol"):
        fut_group = fut_group.dropna(subset=["expiry"]).sort_values("expiry")
        if fut_group.empty:
            continue
        near = fut_group.iloc[0]
        days_to_expiry = (near["expiry"].date() - as_of).days

        next_month_oi = fut_group.iloc[1]["open_interest"] if len(fut_group) > 1 else 0.0
        near_oi = near["open_interest"] or 0.0
        total_fut_oi = near_oi + (next_month_oi or 0.0)
        rollover_pct = round((next_month_oi or 0.0) / total_fut_oi * 100, 1) if total_fut_oi > 0 else None

        opts = options[(options["symbol"] == symbol) & (options["expiry"] == near["expiry"])]
        put_oi = opts.loc[opts["option_type"] == "PE", "open_interest"].sum()
        call_oi = opts.loc[opts["option_type"] == "CE", "open_interest"].sum()

        rows.append({
            "Ticker": symbol,
            "Date": pd.Timestamp(as_of),
            "Close": near["close"],
            "Prev_Close": near["prev_close"],
            "Fut_OI": near_oi,
            "Prev_Fut_OI": near_oi - (near["change_in_oi"] or 0.0),
            "Put_OI": put_oi,
            "Call_OI": call_oi,
            "Days_To_Expiry": days_to_expiry,
            "Rollover_Pct": rollover_pct,
        })

    return pd.DataFrame(rows)


def main():
    DATA_DIR.mkdir(exist_ok=True)
    today = date.today()

    raw = None
    used_date = None
    for offset in range(3):  # F&O bhavcopy can lag a day like the equity one
        d = today - timedelta(days=offset)
        raw = fetch_fo_bhavcopy(d)
        if raw is not None:
            used_date = d
            break

    if raw is None:
        print("[WARN] No F&O bhavcopy found in the last 3 days at any known URL. "
              "Leaving derivatives_data.csv untouched -- see the module docstring for "
              "how to fix the URL/schema once a real failure log is available.")
        return

    try:
        result = aggregate_derivatives(raw, used_date)
    except ValueError as e:
        print(f"[WARN] {e}")
        return

    if result.empty:
        print("[WARN] F&O bhavcopy parsed but produced zero ticker rows -- check "
              "FUTURE_TYPES/OPTION_TYPES against the instrument-type values actually present: "
              f"{sorted(raw[_resolve_columns(raw)['instrument_type']].astype(str).str.upper().unique())[:15]}")
        return

    result.to_csv(DERIV_PATH, index=False)
    print(f"Wrote {DERIV_PATH}: {len(result)} tickers for {used_date}.")


if __name__ == "__main__":
    main()
