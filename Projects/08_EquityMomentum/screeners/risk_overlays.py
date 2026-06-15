"""Risk overlays — what separates institutional momentum from raw screens.

- Liquidity filter (median daily traded value, min price)
- Volatility cap
- Market-regime / momentum-crash filter (Nifty below 200DMA or vol spike => cut exposure)
- Sector caps
- Inverse-vol position sizing scaled to a target portfolio vol
"""
import numpy as np
import pandas as pd

import config


def liquidity_filter(close: pd.DataFrame, volume: pd.DataFrame) -> pd.Series:
    """Boolean per ticker: passes liquidity & price floors."""
    traded_value_cr = (close * volume).tail(60).median() / 1e7  # INR crore
    last_price = close.iloc[-1]
    ok = (traded_value_cr >= config.MIN_MEDIAN_TRADED_VALUE_CR) & (last_price >= config.MIN_PRICE)
    return ok.fillna(False)


def vol_filter(close: pd.DataFrame) -> pd.Series:
    ann_vol = close.pct_change().tail(config.VOL_WINDOW).std() * np.sqrt(252)
    return (ann_vol <= config.MAX_ANN_VOL).fillna(False)


def market_regime(index_close: pd.Series) -> dict:
    """Risk-on/off from Nifty trend + realized vol spike."""
    sma200 = index_close.rolling(200).mean().iloc[-1]
    above_200 = bool(index_close.iloc[-1] > sma200)
    vol21 = float(index_close.pct_change().tail(21).std() * np.sqrt(252))
    vol_spike = vol21 > config.REGIME_VOL_SPIKE
    risk_on = above_200 and not vol_spike
    return {
        "index_above_200dma": above_200,
        "index_ann_vol_21d": round(vol21, 4),
        "vol_spike": vol_spike,
        "risk_on": risk_on,
        "exposure_multiplier": 1.0 if risk_on else config.CRASH_PROTECT_EXPOSURE,
    }


def apply_sector_caps(portfolio: pd.DataFrame, weight_col: str = "weight") -> pd.DataFrame:
    """Iteratively cap each sector at SECTOR_CAP, redistributing excess pro-rata."""
    p = portfolio.copy()
    for _ in range(10):
        sec_w = p.groupby("Industry")[weight_col].sum()
        over = sec_w[sec_w > config.SECTOR_CAP]
        if over.empty:
            break
        for sec, w in over.items():
            mask = p["Industry"] == sec
            p.loc[mask, weight_col] *= config.SECTOR_CAP / w
        p[weight_col] /= p[weight_col].sum()
    return p


def size_positions(close: pd.DataFrame, members: list[str],
                   exposure_multiplier: float = 1.0) -> pd.DataFrame:
    """Inverse-vol weights scaled toward target portfolio vol."""
    rets = close[members].pct_change().tail(config.VOL_WINDOW)
    ann_vol = rets.std() * np.sqrt(252)
    inv = 1.0 / ann_vol.replace(0, np.nan)
    w = inv / inv.sum()

    port_vol = float((rets @ w).std() * np.sqrt(252))
    scale = min(1.0, config.TARGET_PORTFOLIO_VOL / port_vol) if port_vol > 0 else 1.0
    eff = scale * exposure_multiplier

    out = pd.DataFrame({"ann_vol": ann_vol, "weight": w * eff})
    out["cash_weight_total"] = 1 - out["weight"].sum()
    out.attrs["portfolio_vol_unscaled"] = port_vol
    out.attrs["exposure"] = eff
    return out
