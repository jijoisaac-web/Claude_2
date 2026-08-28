"""
technical_signals.py
=====================
Price-action signal layer for the Nifty 750 swing universe: breakout,
pullback, momentum, and volume-confirmation detection from daily_eod.csv.

This is the piece the pipeline was missing -- RS Ranking, sector rotation,
and graph centrality all existed, but nothing looked at candle-by-candle
price action to answer "is this stock actually setting up right now."
find_contagion_candidates() in graph_centrality.py has been sitting dead
for exactly this reason: it needs a real breakout ticker list as input,
which this module now produces.

INPUT CONTRACT
--------------
daily_eod.csv columns (same as rs_ranking.py / correlation_edges.py):
    Ticker,Date,Open,High,Low,Close,Volume,Delivery_Pct,MA20,MA50,MA200,ATR14
Sorted or not -- this module sorts internally. Excludes the benchmark row
set (Ticker == BENCHMARK_TICKER) the same way rs_ranking.py does.

Minimum lookback: MIN_LOOKBACK_DAYS (60) trailing sessions per ticker --
covers the 50-day breakout window, the RSI-14 warmup, and a realistic
pullback-after-breakout window. Tickers below that are skipped (dropped
from the output), same pattern as rs_ranking.py's insufficient-history
handling -- a partial signal is worse than no signal.

OUTPUT
------
compute_technical_signals() returns one row per ticker (latest session
only) with boolean signal flags, RSI_14, Volume_Ratio, and two composite
0-100 scores: Technical_Score (pure price-pattern signals) and
Volume_Score (today's volume vs. its own 20-day average) -- kept separate
so swing_score.py can weight them independently rather than double-counting
volume inside "technical setup."
"""

import numpy as np
import pandas as pd

BENCHMARK_TICKER = "NIFTY500"
MIN_LOOKBACK_DAYS = 60

BREAKOUT_20D_WINDOW = 20
BREAKOUT_50D_WINDOW = 50
RSI_WINDOW = 14
EMA_PULLBACK_SPAN = 20
VOLUME_AVG_WINDOW = 20

# A breakout needs above-average volume behind it, or it's just noise.
BREAKOUT_VOLUME_MULTIPLE = 1.5
# A standalone volume spike signal uses a higher bar than breakout confirmation.
VOLUME_SPIKE_MULTIPLE = 2.0
# RSI band treated as "bullish momentum, not yet overbought."
RSI_BULLISH_LOW = 55
RSI_BULLISH_HIGH = 70
# How far back a prior breakout can be and still count as the setup an
# EMA pullback is retracing from.
PULLBACK_LOOKBACK_DAYS = 10
# How close to the 20 EMA counts as "pulled back to it" (fraction of price).
PULLBACK_BAND_PCT = 0.03

# Technical_Score point weights -- pure price-pattern signals, sums to 100.
# Volume is deliberately excluded here; it's its own top-level Swing_Score
# pillar (see swing_score.py) so it isn't counted twice.
TECHNICAL_WEIGHTS = {
    "Breakout_20D": 35,
    "Breakout_50D": 20,
    "EMA_Pullback": 25,
    "Higher_High": 10,
    "RSI_Bullish": 10,
}


def _rsi(close: pd.Series, window: int = RSI_WINDOW) -> pd.Series:
    """Standard Wilder RSI, vectorized over one ticker's close series (oldest->newest)."""
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    # Avoid NaN when avg_loss is exactly 0 (straight-up move) -- RSI is 100 there.
    rsi = rsi.where(avg_loss != 0, 100.0)
    return rsi


def _signals_for_ticker(grp: pd.DataFrame) -> dict | None:
    """grp: one ticker's rows, sorted by Date ascending. Returns the latest-session signal row, or None if too short."""
    if len(grp) < MIN_LOOKBACK_DAYS:
        return None

    close = grp["Close"].reset_index(drop=True)
    high = grp["High"].reset_index(drop=True)
    volume = grp["Volume"].reset_index(drop=True)
    n = len(grp)

    ema20 = close.ewm(span=EMA_PULLBACK_SPAN, adjust=False).mean()
    rsi = _rsi(close)
    avg_vol_20 = volume.rolling(VOLUME_AVG_WINDOW, min_periods=VOLUME_AVG_WINDOW).mean()

    # Rolling highs computed on the PRIOR window (shifted by 1) so "today's high"
    # can be compared against the high that preceded it, not itself.
    roll_high_20 = high.rolling(BREAKOUT_20D_WINDOW, min_periods=BREAKOUT_20D_WINDOW).max().shift(1)
    roll_high_50 = high.rolling(BREAKOUT_50D_WINDOW, min_periods=BREAKOUT_50D_WINDOW).max().shift(1)

    today = n - 1
    today_close = close.iloc[today]
    today_vol = volume.iloc[today]
    today_avg_vol = avg_vol_20.iloc[today]
    volume_ratio = float(today_vol / today_avg_vol) if today_avg_vol and today_avg_vol > 0 else np.nan

    breakout_20d = bool(
        pd.notna(roll_high_20.iloc[today])
        and today_close > roll_high_20.iloc[today]
        and pd.notna(volume_ratio) and volume_ratio >= BREAKOUT_VOLUME_MULTIPLE
    )
    breakout_50d = bool(
        pd.notna(roll_high_50.iloc[today])
        and today_close > roll_high_50.iloc[today]
        and pd.notna(volume_ratio) and volume_ratio >= BREAKOUT_VOLUME_MULTIPLE
    )

    # Higher-high: the trailing 20-day high itself is higher than the 20-day
    # high that preceded IT -- a simple two-window swing-structure proxy.
    roll_high_20_prior_block = high.rolling(BREAKOUT_20D_WINDOW, min_periods=BREAKOUT_20D_WINDOW).max()
    higher_high = bool(
        today >= 2 * BREAKOUT_20D_WINDOW - 1
        and pd.notna(roll_high_20_prior_block.iloc[today])
        and pd.notna(roll_high_20_prior_block.iloc[today - BREAKOUT_20D_WINDOW])
        and roll_high_20_prior_block.iloc[today] > roll_high_20_prior_block.iloc[today - BREAKOUT_20D_WINDOW]
    )

    rsi_today = rsi.iloc[today]
    rsi_bullish = bool(pd.notna(rsi_today) and RSI_BULLISH_LOW <= rsi_today <= RSI_BULLISH_HIGH)

    # EMA pullback: a 20D breakout fired within the last PULLBACK_LOOKBACK_DAYS
    # sessions (not necessarily today), price has since eased back to within
    # PULLBACK_BAND_PCT of the 20 EMA, and volume has contracted versus the
    # breakout day itself -- the "quiet pullback after a strong move" setup.
    ema_pullback = False
    lookback_start = max(0, today - PULLBACK_LOOKBACK_DAYS)
    for i in range(lookback_start, today):
        if pd.isna(roll_high_20.iloc[i]) or pd.isna(avg_vol_20.iloc[i]):
            continue
        vol_ratio_i = volume.iloc[i] / avg_vol_20.iloc[i] if avg_vol_20.iloc[i] > 0 else np.nan
        was_breakout_day = (
            close.iloc[i] > roll_high_20.iloc[i]
            and pd.notna(vol_ratio_i) and vol_ratio_i >= BREAKOUT_VOLUME_MULTIPLE
        )
        if not was_breakout_day:
            continue
        near_ema = pd.notna(ema20.iloc[today]) and abs(today_close - ema20.iloc[today]) <= PULLBACK_BAND_PCT * ema20.iloc[today]
        volume_contracted = pd.notna(volume_ratio) and volume_ratio < vol_ratio_i
        if near_ema and volume_contracted:
            ema_pullback = True
            break

    volume_spike = bool(pd.notna(volume_ratio) and volume_ratio >= VOLUME_SPIKE_MULTIPLE)

    flags = {
        "Breakout_20D": breakout_20d,
        "Breakout_50D": breakout_50d,
        "EMA_Pullback": ema_pullback,
        "Higher_High": higher_high,
        "RSI_Bullish": rsi_bullish,
    }
    technical_score = sum(TECHNICAL_WEIGHTS[k] for k, v in flags.items() if v)
    volume_score = float(np.clip((volume_ratio - 1.0) / 2.0 * 100, 0, 100)) if pd.notna(volume_ratio) else 0.0

    return {
        "Ticker": grp["Ticker"].iloc[0],
        **flags,
        "RSI_14": round(float(rsi_today), 1) if pd.notna(rsi_today) else None,
        "Volume_Ratio": round(volume_ratio, 2) if pd.notna(volume_ratio) else None,
        "Volume_Spike": volume_spike,
        "Technical_Score": technical_score,
        "Volume_Score": round(volume_score, 1),
    }


def compute_technical_signals(eod_df: pd.DataFrame, benchmark_ticker: str = BENCHMARK_TICKER) -> pd.DataFrame:
    """
    eod_df: long-format DataFrame with columns [Ticker, Date, Open, High, Low,
    Close, Volume, ...]. Returns one row per ticker (latest session's signals),
    tickers with < MIN_LOOKBACK_DAYS history dropped.
    """
    eod_df = eod_df.sort_values(["Ticker", "Date"])
    rows = []
    for ticker, grp in eod_df[eod_df["Ticker"] != benchmark_ticker].groupby("Ticker"):
        result = _signals_for_ticker(grp.sort_values("Date"))
        if result is not None:
            rows.append(result)
    return pd.DataFrame(rows).sort_values("Technical_Score", ascending=False).reset_index(drop=True)


if __name__ == "__main__":
    eod = pd.read_csv("daily_eod.csv", parse_dates=["Date"])
    signals = compute_technical_signals(eod)
    signals.to_csv("technical_signals.csv", index=False)
    n_breakouts = int(signals["Breakout_20D"].sum())
    print(f"Technical signals written for {len(signals)} tickers ({n_breakouts} with a fresh 20D breakout).")
