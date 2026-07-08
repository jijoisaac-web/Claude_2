"""Technical indicators computed with pandas."""
import pandas as pd
import numpy as np


def sma(close: pd.Series, period: int) -> pd.Series:
    return close.rolling(period).mean()


def ema(close: pd.Series, period: int) -> pd.Series:
    return close.ewm(span=period, adjust=False).mean()


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    macd_line = ema(close, fast) - ema(close, slow)
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    return macd_line, signal_line, macd_line - signal_line


def bollinger(close: pd.Series, period: int = 20, num_std: float = 2.0):
    mid = sma(close, period)
    std = close.rolling(period).std()
    return mid + num_std * std, mid, mid - num_std * std


def enrich(df: pd.DataFrame) -> pd.DataFrame:
    """Add indicator columns to an OHLCV dataframe (columns: Open High Low Close Volume)."""
    out = df.copy()
    close = out["Close"]
    out["sma20"] = sma(close, 20)
    out["sma50"] = sma(close, 50)
    out["sma200"] = sma(close, 200)
    out["ema20"] = ema(close, 20)
    out["rsi14"] = rsi(close)
    m, s, h = macd(close)
    out["macd"], out["macd_signal"], out["macd_hist"] = m, s, h
    ub, mb, lb = bollinger(close)
    out["bb_upper"], out["bb_mid"], out["bb_lower"] = ub, mb, lb
    out["vol_avg20"] = out["Volume"].rolling(20).mean()
    return out
