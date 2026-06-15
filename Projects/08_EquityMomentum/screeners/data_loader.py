"""Batch price/volume downloader with local parquet caching (yfinance)."""
import os
import time
import pandas as pd
import yfinance as yf

import config


def _cache_path(name: str) -> str:
    return os.path.join(config.CACHE_DIR, f"{name}.parquet")


def _cache_fresh(path: str) -> bool:
    return (os.path.exists(path) and
            (time.time() - os.path.getmtime(path)) / 3600 < config.CACHE_MAX_AGE_HOURS)


def download_prices(tickers: list[str], label: str = "universe") -> dict[str, pd.DataFrame]:
    """Download OHLCV for tickers. Returns dict of field -> DataFrame[date x ticker].
    Fields: Close (adjusted), Volume, High, Low."""
    paths = {f: _cache_path(f"{label}_{f}") for f in ("Close", "Volume", "High", "Low")}
    if all(_cache_fresh(p) for p in paths.values()):
        print(f"[data] using cached prices for {label}")
        return {f: pd.read_parquet(p) for f, p in paths.items()}

    os.makedirs(config.CACHE_DIR, exist_ok=True)
    frames = {f: [] for f in paths}
    n = config.BATCH_SIZE
    batches = [tickers[i:i + n] for i in range(0, len(tickers), n)]
    for i, batch in enumerate(batches, 1):
        print(f"[data] batch {i}/{len(batches)} ({len(batch)} tickers)")
        raw = yf.download(batch, period=f"{config.LOOKBACK_DAYS}d", interval="1d",
                          auto_adjust=True, progress=False, group_by="column", threads=True)
        if raw is None or raw.empty:
            continue
        for f in frames:
            if f in raw.columns.get_level_values(0):
                sub = raw[f] if isinstance(raw.columns, pd.MultiIndex) else raw[[f]]
                frames[f].append(sub)
        time.sleep(0.5)

    out = {}
    for f, lst in frames.items():
        if not lst:
            raise RuntimeError(f"No data downloaded for field {f}. Check connectivity.")
        df = pd.concat(lst, axis=1)
        df = df.loc[:, ~df.columns.duplicated()]
        df = df.dropna(axis=1, how="all").dropna(axis=0, how="all").sort_index()
        df.to_parquet(paths[f])
        out[f] = df
    print(f"[data] {label}: {out['Close'].shape[1]} tickers x {out['Close'].shape[0]} days")
    return out


def download_index(ticker: str = None) -> pd.Series:
    """Daily closes for the regime index (default Nifty 50)."""
    ticker = ticker or config.REGIME_INDEX
    path = _cache_path("regime_index")
    if _cache_fresh(path):
        return pd.read_parquet(path).iloc[:, 0]
    d = yf.download(ticker, period=f"{config.LOOKBACK_DAYS}d", interval="1d",
                    auto_adjust=True, progress=False)
    s = d["Close"]
    if isinstance(s, pd.DataFrame):
        s = s.iloc[:, 0]
    s.name = "index_close"
    os.makedirs(config.CACHE_DIR, exist_ok=True)
    s.to_frame().to_parquet(path)
    return s
