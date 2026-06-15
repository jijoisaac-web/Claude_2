# -*- coding: utf-8 -*-
"""
mean_reversion.py — Bollinger Band + RSI Mean Reversion Strategy
─────────────────────────────────────────────────────────────────
Logic:
  LONG setup  : Price touches/crosses below lower BB AND RSI < oversold threshold
                AND Z-score < -1.5 (price is statistically cheap vs recent range)
                AND stock above EMA_200 (don't catch falling knives in downtrends)

  Stop Loss   : Below recent swing low OR 1.5 × ATR from entry
  Target      : BB midline (mean reversion to 20 SMA)
  Quality gate: Avg daily value > 5 Cr (liquidity filter)

Institutional use: Used by market-neutral and long/short equity funds to
                   exploit short-term overextension in liquid large/mid caps.
"""

import numpy as np
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from data_fetcher import add_indicators, avg_daily_value
from config import (MR_RSI_OVERSOLD, MR_ZSCORE_ENTRY, MR_MIN_ADV,
                    MR_BB_PERIOD, MR_BB_STD, MR_RSI_PERIOD)


def scan(price_data: dict) -> list:
    """
    Scan all symbols for mean-reversion setups.
    price_data: {symbol: DataFrame}
    Returns list of signal dicts.
    """
    signals = []

    for symbol, df in price_data.items():
        try:
            df = add_indicators(df)
            if len(df) < 60:
                continue

            # Liquidity gate
            if avg_daily_value(df) < MR_MIN_ADV:
                continue

            last = df.iloc[-1]
            prev = df.iloc[-2]

            close   = float(last["Close"])
            rsi     = float(last["RSI"])
            zscore  = float(last["ZScore_20"])
            bb_low  = float(last["BB_lower"])
            bb_mid  = float(last["BB_mid"])
            ema200  = float(last["EMA_200"])
            atr     = float(last["ATR"])
            vol_r   = float(last["Vol_ratio"])
            adv     = float(last["ADV"])

            # ── LONG Setup ──────────────────────────────────────────────────
            long_signals = []

            # 1. Price at/below lower Bollinger Band
            bb_touch = close <= bb_low * 1.005   # within 0.5% of lower band
            if bb_touch:
                long_signals.append("BB_lower_touch")

            # 2. RSI oversold
            rsi_os = rsi < MR_RSI_OVERSOLD
            if rsi_os:
                long_signals.append(f"RSI_oversold({rsi:.0f})")

            # 3. Price statistically cheap (Z-score)
            z_cheap = zscore < MR_ZSCORE_ENTRY
            if z_cheap:
                long_signals.append(f"ZScore({zscore:.2f})")

            # 4. Above 200 EMA — in long-term uptrend (avoid value traps)
            above_200 = close > ema200 * 0.97    # allow 3% buffer
            if above_200:
                long_signals.append("Above_EMA200")

            # Require at least 3 of 4 conditions
            if len(long_signals) < 3:
                continue

            # ── Derive levels ───────────────────────────────────────────────
            stop_loss  = round(min(float(df["Low"].tail(5).min()), close - 1.5 * atr), 2)
            target     = round(bb_mid, 2)                # mean reversion target
            risk       = close - stop_loss
            reward     = target - close
            rr         = round(reward / risk, 2) if risk > 0 else 0

            if rr < 1.0:
                continue   # skip poor R:R

            # RSI divergence check (price made lower low, RSI made higher low)
            rsi_div = False
            if len(df) >= 10:
                price_low_now  = float(df["Close"].tail(5).min())
                price_low_prev = float(df["Close"].iloc[-10:-5].min())
                rsi_low_now    = float(df["RSI"].tail(5).min())
                rsi_low_prev   = float(df["RSI"].iloc[-10:-5].min())
                if price_low_now < price_low_prev and rsi_low_now > rsi_low_prev:
                    rsi_div = True
                    long_signals.append("RSI_Divergence")

            signals.append({
                "strategy":    "Mean Reversion",
                "symbol":      symbol,
                "setup":       " + ".join(long_signals),
                "direction":   "LONG",
                "entry":       round(close, 2),
                "stop":        stop_loss,
                "target":      target,
                "rr":          rr,
                "rsi":         round(rsi, 1),
                "zscore":      round(zscore, 2),
                "vol_ratio":   round(vol_r, 2),
                "adv_cr":      round(adv / 1e7, 2),   # in Crores
                "atr_pct":     round(float(last["ATR_pct"]), 2),
                "conviction":  len(long_signals),
                "rsi_div":     rsi_div,
                "bb_pct":      round(float(last["BB_pct"]) * 100, 1),
            })

        except Exception as e:
            continue

    return sorted(signals, key=lambda x: x["conviction"], reverse=True)
