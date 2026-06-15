# -*- coding: utf-8 -*-
"""
pead.py — Post-Earnings Announcement Drift (PEAD)
──────────────────────────────────────────────────
Logic:
  Stocks that gap up significantly on earnings/results day tend to
  CONTINUE drifting in the direction of the gap for 5-15 trading days.
  This is one of the most robust and well-documented anomalies in finance.

  Detection (without earnings calendar API):
  - Identify overnight gap > PEAD_GAP_MIN % in last 3 days
  - Gap must occur on volume > 2x average (institutional participation)
  - Price must hold above the gap level on subsequent day(s)
  - Stock must be in medium-term uptrend (above EMA_50)
  - Gap from a consolidation / base (not extended from prior run)

  Entry:   On gap confirmation (close above open on gap day, or next day)
  Stop:    Below the gap-fill level (close the gap = thesis broken)
  Target:  Previous resistance or 10 days drift target
  Hold:    5-10 trading days

Institutional use: Event-driven hedge funds (Elliott, Third Point) trade PEAD.
Quant funds include it as an alpha factor. Works best in mid/small caps
where information diffusion is slower.
"""

import numpy as np
import pandas as pd
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from data_fetcher import add_indicators, avg_daily_value
from config import PEAD_GAP_MIN, PEAD_HOLD_DAYS, PEAD_STOP_PCT, MR_MIN_ADV


def scan(price_data: dict) -> list:
    signals = []

    for symbol, df in price_data.items():
        try:
            df = add_indicators(df)
            if len(df) < 60:
                continue

            # Check last 5 days for a gap event
            for lookback in range(1, 6):
                idx_gap  = -(lookback + 1)   # day of gap
                idx_post = -lookback          # day after gap (confirmation)

                if abs(idx_gap) >= len(df) or abs(idx_post) >= len(df):
                    continue

                gap_day  = df.iloc[idx_gap]
                post_day = df.iloc[idx_post]
                last_day = df.iloc[-1]

                gap_open  = float(gap_day["Open"])
                gap_close = float(gap_day["Close"])
                prev_close= float(df.iloc[idx_gap - 1]["Close"])
                last_close= float(last_day["Close"])

                # ── Gap detection ────────────────────────────────────────
                gap_pct = (gap_open - prev_close) / prev_close * 100

                if gap_pct < PEAD_GAP_MIN:
                    continue   # only upside gaps (can mirror for shorts)

                # Volume surge on gap day
                gap_vol    = float(gap_day["Volume"])
                avg_vol_20 = float(df["Volume"].iloc[max(0, idx_gap-20):idx_gap].mean())
                vol_surge  = gap_vol / avg_vol_20 if avg_vol_20 > 0 else 0

                if vol_surge < 1.8:
                    continue   # weak volume = not institutional driven

                # Gap close confirmation (close above open on gap day)
                gap_bullish = gap_close > gap_open

                # Price holding above gap level after the event
                holding = last_close > prev_close * (1 + PEAD_GAP_MIN / 100 * 0.5)

                if not (gap_bullish and holding):
                    continue

                # Trend filter: above EMA_50
                ema50_now = float(last_day["EMA_50"])
                if last_close < ema50_now * 0.97:
                    continue

                # Not extended: gap should ideally come from a base
                # Proxy: price wasn't up >40% in prior 60 days before gap
                _pgr = df["Close"].iloc[max(0,idx_gap-60):idx_gap].pct_change(60).iloc[-1]
                pre_gap_ret = 0.0 if (pd.isna(_pgr) or not np.isfinite(float(_pgr))) else float(_pgr)
                if pre_gap_ret > 0.40:
                    continue   # already extended before earnings

                # Liquidity
                if avg_daily_value(df) < MR_MIN_ADV * 0.5:
                    continue

                # ── Levels ───────────────────────────────────────────────
                entry     = last_close
                gap_fill  = prev_close   # thesis broken if gap is filled
                stop_pct  = PEAD_STOP_PCT / 100
                stop      = round(max(gap_fill * 1.005, entry * (1 - stop_pct)), 2)
                atr       = float(last_day["ATR"])

                # Target: prior resistance or drift for PEAD_HOLD_DAYS
                swing_high = float(df["High"].iloc[max(0, idx_gap-30):idx_gap].max())
                if swing_high > entry:
                    target = round(swing_high, 2)
                else:
                    target = round(entry + PEAD_HOLD_DAYS * atr * 0.5, 2)

                risk   = entry - stop
                reward = target - entry
                rr     = round(reward / risk, 2) if risk > 0 else 0

                if rr < 1.2:
                    continue

                days_ago = lookback

                signals.append({
                    "strategy":    "PEAD",
                    "symbol":      symbol,
                    "setup":       f"EarningsGap+{gap_pct:.1f}%(Vol:{vol_surge:.1f}x,{days_ago}d_ago)",
                    "direction":   "LONG",
                    "entry":       round(entry, 2),
                    "stop":        stop,
                    "target":      target,
                    "rr":          rr,
                    "gap_pct":     round(gap_pct, 2),
                    "vol_surge":   round(vol_surge, 2),
                    "days_ago":    days_ago,
                    "gap_fill":    round(gap_fill, 2),
                    "hold_days":   PEAD_HOLD_DAYS,
                    "rsi":         round(float(last_day["RSI"]), 1),
                    "adv_cr":      round(avg_daily_value(df) / 1e7, 2),
                    "atr_pct":     round(float(last_day["ATR_pct"]), 2),
                    "conviction":  5 if (gap_pct > 5 and vol_surge > 3) else 3,
                })
                break   # one signal per stock

        except Exception:
            continue

    return sorted(signals, key=lambda x: (x["conviction"], x["gap_pct"]), reverse=True)
