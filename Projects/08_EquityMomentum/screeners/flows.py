"""Screener 4 — Flows & positioning (India-specific confirmation signals).

- FII/DII daily provisional net flows (NSE API, with cookie handshake)
- Per-stock delivery % from NSE full bhavcopy (last available session)
- Volume confirmation: 20d avg volume vs 60d avg volume per stock
Degrades gracefully when NSE endpoints are unreachable.
"""
import io
from datetime import date, timedelta

import numpy as np
import pandas as pd
import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}


def _nse_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(HEADERS)
    s.get("https://www.nseindia.com", timeout=15)  # set cookies
    return s


def fii_dii_flows() -> pd.DataFrame | None:
    """Latest FII/DII provisional cash-market net flows (INR crore)."""
    try:
        s = _nse_session()
        r = s.get("https://www.nseindia.com/api/fiidiiTradeReact", timeout=15)
        r.raise_for_status()
        df = pd.DataFrame(r.json())
        for c in ("buyValue", "sellValue", "netValue"):
            if c in df.columns:
                df[c] = pd.to_numeric(df[c], errors="coerce")
        print("[flows] FII/DII flows fetched")
        return df
    except Exception as e:
        print(f"[flows] FII/DII fetch failed: {e}")
        return None


def delivery_pct(max_lookback_days: int = 7) -> pd.DataFrame | None:
    """Per-stock delivery % from the most recent NSE full bhavcopy."""
    for back in range(1, max_lookback_days + 1):
        d = date.today() - timedelta(days=back)
        if d.weekday() >= 5:
            continue
        url = ("https://archives.nseindia.com/products/content/"
               f"sec_bhavdata_full_{d.strftime('%d%m%Y')}.csv")
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            if r.status_code != 200:
                continue
            df = pd.read_csv(io.StringIO(r.text))
            df.columns = [c.strip() for c in df.columns]
            df = df[df["SERIES"].str.strip() == "EQ"].copy()
            df["DELIV_PER"] = pd.to_numeric(df["DELIV_PER"], errors="coerce")
            df["TURNOVER_LACS"] = pd.to_numeric(df["TURNOVER_LACS"], errors="coerce")
            out = df[["SYMBOL", "DELIV_PER", "TURNOVER_LACS"]].copy()
            out["SYMBOL"] = out["SYMBOL"].str.strip()
            out = out.set_index("SYMBOL")
            print(f"[flows] delivery data from bhavcopy {d}")
            return out
        except Exception:
            continue
    print("[flows] bhavcopy unavailable; skipping delivery %")
    return None


def volume_confirmation(volume: pd.DataFrame) -> pd.DataFrame:
    """Volume trend per stock from price data already downloaded."""
    v20 = volume.tail(20).mean()
    v60 = volume.tail(60).mean()
    out = pd.DataFrame({"vol_ratio_20_60": v20 / v60.replace(0, np.nan)})
    out["volume_expanding"] = out["vol_ratio_20_60"] > 1.1
    return out


def run(volume: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame | None]:
    """Returns (per-stock flow signals indexed by Yahoo ticker, market FII/DII df)."""
    out = volume_confirmation(volume)

    deliv = delivery_pct()
    if deliv is not None:
        symbols = pd.Series(out.index.str.replace(".NS", "", regex=False), index=out.index)
        out["delivery_pct"] = symbols.map(deliv["DELIV_PER"]).values
        out["high_delivery"] = out["delivery_pct"] > 50
    else:
        out["delivery_pct"] = np.nan
        out["high_delivery"] = np.nan

    # 0-100 flow score
    score = 50 * (out["vol_ratio_20_60"].clip(0.5, 2.0) - 0.5) / 1.5
    score = score + 50 * (out["delivery_pct"].fillna(50) / 100)
    out["flow_score"] = score.round(1)

    fii = fii_dii_flows()
    return out.sort_values("flow_score", ascending=False), fii
