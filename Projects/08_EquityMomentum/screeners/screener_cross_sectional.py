"""Screener 1 — Cross-sectional (relative) momentum.

Institutional standard: rank universe on 12-month and 6-month returns skipping
the most recent month (12-1, 6-1), adjust for volatility, z-score normalize,
winsorize at +/-3 — mirroring NSE's momentum index methodology.
"""
import numpy as np
import pandas as pd

import config


def _window_return(close: pd.DataFrame, window: int, skip: int) -> pd.Series:
    """Return over [t-window, t-skip]."""
    if len(close) < window + 1:
        window = len(close) - 1
    start = close.shift(window).iloc[-1]
    end = close.shift(skip).iloc[-1]
    return end / start - 1.0


def _zscore(s: pd.Series, cap: float = None) -> pd.Series:
    z = (s - s.mean()) / s.std(ddof=0)
    if cap:
        z = z.clip(-cap, cap)
    return z


def run(close: pd.DataFrame) -> pd.DataFrame:
    """close: DataFrame[date x ticker] of adjusted closes.
    Returns per-ticker momentum metrics + normalized score, sorted desc."""
    rets = close.pct_change()
    ann_vol = rets.tail(config.VOL_WINDOW).std() * np.sqrt(252)

    out = pd.DataFrame(index=close.columns)
    out["ann_vol"] = ann_vol

    for name, (window, skip) in config.MOM_LOOKBACKS.items():
        out[f"ret_{name}"] = _window_return(close, window, skip)
        out[f"voladj_{name}"] = out[f"ret_{name}"] / ann_vol.replace(0, np.nan)

    out = out.dropna(subset=["ret_12_1", "ret_6_1", "ann_vol"])

    z12 = _zscore(out["voladj_12_1"], config.ZSCORE_CAP)
    z6 = _zscore(out["voladj_6_1"], config.ZSCORE_CAP)
    out["momentum_z"] = config.WEIGHT_12M * z12 + config.WEIGHT_6M * z6
    # NSE-style normalized score: 1 + z if z>=0 else 1/(1-z)
    out["norm_score"] = np.where(out["momentum_z"] >= 0,
                                 1 + out["momentum_z"],
                                 1 / (1 - out["momentum_z"]))
    out["cs_rank"] = out["norm_score"].rank(ascending=False).astype(int)
    out["decile"] = pd.qcut(out["norm_score"], 10, labels=False, duplicates="drop") + 1
    out["cs_percentile"] = out["norm_score"].rank(pct=True) * 100

    return out.sort_values("norm_score", ascending=False)


if __name__ == "__main__":
    import universe, data_loader
    uni = universe.load_universe()
    data = data_loader.download_prices(uni["YahooTicker"].tolist())
    res = run(data["Close"])
    print(res.head(30).round(3))
