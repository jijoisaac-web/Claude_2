"""Load the stock universe (Nifty 50/200/500 constituents) from NSE archives."""
import io
import os
import pandas as pd
import requests

import config

FALLBACK_LARGE_CAPS = [
    # minimal emergency fallback if NSE archives is unreachable
    "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "BHARTIARTL", "SBIN",
    "LICI", "ITC", "HINDUNILVR", "LT", "BAJFINANCE", "HCLTECH", "MARUTI",
    "SUNPHARMA", "KOTAKBANK", "AXISBANK", "TITAN", "ULTRACEMCO", "NTPC",
    "ADANIENT", "ONGC", "TATAMOTORS", "WIPRO", "M&M", "POWERGRID",
    "TATASTEEL", "ASIANPAINT", "COALINDIA", "BAJAJFINSV", "NESTLEIND",
    "JSWSTEEL", "GRASIM", "ADANIPORTS", "HINDALCO", "TECHM", "DRREDDY",
    "CIPLA", "EICHERMOT", "BRITANNIA", "APOLLOHOSP", "DIVISLAB", "TATACONSUM",
    "HEROMOTOCO", "BAJAJ-AUTO", "SHRIRAMFIN", "BPCL", "INDUSINDBK", "UPL", "LTIM",
]

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def load_universe() -> pd.DataFrame:
    """Return DataFrame with columns: Symbol, Company, Industry, YahooTicker."""
    if config.UNIVERSE == "CUSTOM" and config.CUSTOM_UNIVERSE_CSV:
        df = pd.read_csv(config.CUSTOM_UNIVERSE_CSV)
        df = df.rename(columns={c: c.strip().title() for c in df.columns})
    else:
        url = config.NSE_INDEX_URLS[config.UNIVERSE]
        cache_path = os.path.join(config.CACHE_DIR, f"{config.UNIVERSE}_constituents.csv")
        os.makedirs(config.CACHE_DIR, exist_ok=True)
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            r.raise_for_status()
            df = pd.read_csv(io.StringIO(r.text))
            df.to_csv(cache_path, index=False)
        except Exception as e:
            if os.path.exists(cache_path):
                print(f"[universe] download failed ({e}); using cached constituents")
                df = pd.read_csv(cache_path)
            else:
                print(f"[universe] download failed ({e}); using built-in large-cap fallback")
                df = pd.DataFrame({"Symbol": FALLBACK_LARGE_CAPS,
                                   "Company Name": FALLBACK_LARGE_CAPS,
                                   "Industry": "Unknown"})

    df.columns = [c.strip() for c in df.columns]
    sym_col = "Symbol" if "Symbol" in df.columns else df.columns[2]
    name_col = "Company Name" if "Company Name" in df.columns else df.columns[0]
    ind_col = "Industry" if "Industry" in df.columns else None

    out = pd.DataFrame({
        "Symbol": df[sym_col].astype(str).str.strip(),
        "Company": df[name_col].astype(str).str.strip(),
        "Industry": df[ind_col].astype(str).str.strip() if ind_col else "Unknown",
    })
    out = out[~out["Symbol"].str.contains("DUMMY", case=False, na=False)]
    out["YahooTicker"] = out["Symbol"].str.replace("&", "%26", regex=False) \
                                       .str.replace("%26", "&", regex=False) + ".NS"
    out = out.drop_duplicates(subset="Symbol").reset_index(drop=True)
    print(f"[universe] {config.UNIVERSE}: {len(out)} symbols")
    return out


if __name__ == "__main__":
    print(load_universe().head(10))
