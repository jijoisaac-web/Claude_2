"""Screener 2 — Time-series (trend) momentum.

Absolute-trend signals per stock: moving-average structure, golden cross,
52-week-high proximity, n-day breakout, RSI, MACD. Produces a 0-100 trend score.
"""
import numpy as np
import pandas as pd

import config


def _rsi(close: pd.DataFrame, window: int) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / window, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / window, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    return (100 - 100 / (1 + rs)).iloc[-1]


def _macd_hist(close: pd.DataFrame) -> pd.Series:
    ema_f = close.ewm(span=config.MACD_FAST, adjust=False).mean()
    ema_s = close.ewm(span=config.MACD_SLOW, adjust=False).mean()
    macd = ema_f - ema_s
    signal = macd.ewm(span=config.MACD_SIGNAL, adjust=False).mean()
    return (macd - signal).iloc[-1]


def run(close: pd.DataFrame, high: pd.DataFrame = None) -> pd.DataFrame:
    high = high if high is not None else close
    last = close.iloc[-1]

    sma20 = close.rolling(config.SMA_FAST).mean().iloc[-1]
    sma50 = close.rolling(config.SMA_MID).mean().iloc[-1]
    sma200 = close.rolling(config.SMA_SLOW).mean().iloc[-1]
    sma50_prev = close.rolling(config.SMA_MID).mean().iloc[-22]
    sma200_prev = close.rolling(config.SMA_SLOW).mean().iloc[-22]

    hi52 = high.tail(252).max()
    breakout_level = high.tail(config.BREAKOUT_WINDOW + 1).iloc[:-1].max()

    out = pd.DataFrame(index=close.columns)
    out["price"] = last
    out["above_sma20"] = last > sma20
    out["above_sma50"] = last > sma50
    out["above_sma200"] = last > sma200
    out["golden_cross"] = (sma50 > sma200) & (sma50_prev <= sma200_prev)
    out["ma_aligned"] = (sma20 > sma50) & (sma50 > sma200)
    out["pct_of_52w_high"] = last / hi52
    out["near_52w_high"] = out["pct_of_52w_high"] >= config.HIGH_52W_PROXIMITY
    out["breakout_20d"] = last > breakout_level
    out["rsi_14"] = _rsi(close, config.RSI_WINDOW)
    out["macd_hist_pos"] = _macd_hist(close) > 0
    out["dist_sma200_pct"] = (last / sma200 - 1) * 100

    # 0-100 composite trend score
    score = (
        15 * out["above_sma200"].astype(float)
        + 10 * out["above_sma50"].astype(float)
        + 5 * out["above_sma20"].astype(float)
        + 15 * out["ma_aligned"].astype(float)
        + 15 * out["near_52w_high"].astype(float)
        + 10 * out["breakout_20d"].astype(float)
        + 10 * out["macd_hist_pos"].astype(float)
        + 10 * out["pct_of_52w_high"].clip(0, 1)
        + 10 * ((out["rsi_14"].clip(40, 80) - 40) / 40).fillna(0)  # reward 40-80 zone
    )
    out["trend_score"] = score.round(1)
    out["trend_percentile"] = out["trend_score"].rank(pct=True) * 100
    out = out.dropna(subset=["price"])
    return out.sort_values("trend_score", ascending=False)


if __name__ == "__main__":
    import universe, data_loader
    uni = universe.load_universe()
    data = data_loader.download_prices(uni["YahooTicker"].tolist())
    print(run(data["Close"], data["High"]).head(30).round(2))
