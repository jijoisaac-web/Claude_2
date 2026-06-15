# -*- coding: utf-8 -*-
"""
pairs_trading.py — Statistical Arbitrage / Pairs Trading
─────────────────────────────────────────────────────────
Logic (Engle-Granger cointegration approach):
  1. For each pre-defined pair (same sector), compute the spread:
     spread = log(Price_A) - hedge_ratio × log(Price_B)
  2. Estimate hedge ratio via OLS regression over lookback window
  3. Calculate z-score of spread: z = (spread - mean) / std
  4. Entry: z-score > +2  → Short A, Long B (spread is too wide)
             z-score < -2  → Long A, Short B (spread is too narrow)
  5. Exit:  z-score reverts to ±0.5
  6. Stop:  z-score exceeds ±3.5 (spread diverging further)

Note: Indian NRE accounts cannot go short. This module identifies the
LONG leg only, or flags pairs where both can be held as separate positions
(long underperformer as swing trade entry opportunity).

Institutional use: Renaissance, DE Shaw, Two Sigma use stat arb as core
strategy. Works best in liquid large-caps with stable correlations.
"""

import numpy as np
import pandas as pd
from scipy import stats
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from config import (PAIRS_ZSCORE_ENTRY, PAIRS_ZSCORE_EXIT,
                    PAIRS_ZSCORE_STOP, PAIRS_LOOKBACK, PAIRS_MIN_CORR)
from symbols import PAIRS_UNIVERSE


def _hedge_ratio(log_a: np.ndarray, log_b: np.ndarray) -> float:
    """OLS hedge ratio: log_a = alpha + beta × log_b + epsilon"""
    slope, intercept, r, p, se = stats.linregress(log_b, log_a)
    return slope


def _spread_zscore(log_a: pd.Series, log_b: pd.Series, lookback: int):
    """Compute rolling z-score of the cointegrated spread."""
    log_a = log_a.tail(lookback + 20)
    log_b = log_b.tail(lookback + 20)

    hedge = _hedge_ratio(log_a.values, log_b.values)
    spread = log_a - hedge * log_b

    rolling_mean = spread.rolling(lookback).mean()
    rolling_std  = spread.rolling(lookback).std()
    zscore       = (spread - rolling_mean) / rolling_std

    return zscore, spread, hedge


def scan(price_data: dict) -> list:
    signals = []

    for sym_a, sym_b in PAIRS_UNIVERSE:
        try:
            df_a = price_data.get(sym_a)
            df_b = price_data.get(sym_b)

            if df_a is None or df_b is None:
                continue
            if len(df_a) < PAIRS_LOOKBACK + 20 or len(df_b) < PAIRS_LOOKBACK + 20:
                continue

            # Align on common dates
            close_a = df_a["Close"].rename(sym_a)
            close_b = df_b["Close"].rename(sym_b)
            combined = pd.concat([close_a, close_b], axis=1).dropna()

            if len(combined) < PAIRS_LOOKBACK:
                continue

            # Correlation check
            corr = combined[sym_a].pct_change().corr(combined[sym_b].pct_change())
            if corr < PAIRS_MIN_CORR:
                continue

            log_a = np.log(combined[sym_a])
            log_b = np.log(combined[sym_b])

            zscore_series, spread, hedge = _spread_zscore(log_a, log_b, PAIRS_LOOKBACK)

            if zscore_series.empty or zscore_series.isna().all():
                continue

            z_now  = float(zscore_series.iloc[-1])
            z_prev = float(zscore_series.iloc[-2]) if len(zscore_series) > 1 else 0

            price_a = float(combined[sym_a].iloc[-1])
            price_b = float(combined[sym_b].iloc[-1])

            # ── Signal detection ─────────────────────────────────────────

            # Z > +2: A is expensive vs B → Long B (underperformer)
            if z_now >= PAIRS_ZSCORE_ENTRY:
                long_sym   = sym_b
                short_sym  = sym_a
                long_price = price_b
                direction  = f"Long_{sym_b}_Short_{sym_a}"
                z_entry    = z_now

            # Z < -2: A is cheap vs B → Long A (underperformer)
            elif z_now <= -PAIRS_ZSCORE_ENTRY:
                long_sym   = sym_a
                short_sym  = sym_b
                long_price = price_a
                direction  = f"Long_{sym_a}_Short_{sym_b}"
                z_entry    = z_now

            else:
                continue

            # Stop & target based on z-score reversion expectation
            # Convert z-score levels to price levels approximately
            spread_now  = float(spread.iloc[-1])
            spread_mean = float(spread.rolling(PAIRS_LOOKBACK).mean().iloc[-1])
            spread_std  = float(spread.rolling(PAIRS_LOOKBACK).std().iloc[-1])

            # Target: z reverts to 0.5 (partial reversion is realistic)
            spread_target = spread_mean + PAIRS_ZSCORE_EXIT * spread_std
            spread_stop   = spread_mean + PAIRS_ZSCORE_STOP * np.sign(z_now) * spread_std

            # Approximate price target for long leg
            stop_pct   = abs(spread_stop  - spread_now) / 2
            target_pct = abs(spread_target - spread_now) / 2

            stop_price   = round(long_price * (1 - stop_pct),   2)
            target_price = round(long_price * (1 + target_pct), 2)
            rr           = round(target_pct / stop_pct, 2) if stop_pct > 0 else 0

            # Historical z-score stats for context
            z_abs_mean  = float(zscore_series.abs().tail(60).mean())
            z_half_life = _half_life(spread.values)

            signals.append({
                "strategy":     "Pairs Trading",
                "symbol":       long_sym,
                "pair":         f"{sym_a} / {sym_b}",
                "setup":        f"PairsTrade(z={z_now:.2f},corr={corr:.2f})",
                "direction":    "LONG",
                "long_leg":     long_sym,
                "short_leg":    short_sym,
                "entry":        round(long_price, 2),
                "stop":         stop_price,
                "target":       target_price,
                "rr":           rr,
                "z_score":      round(z_now, 2),
                "correlation":  round(corr, 3),
                "hedge_ratio":  round(hedge, 3),
                "half_life_days": z_half_life,
                "z_abs_mean":   round(z_abs_mean, 2),
                "conviction":   4 if abs(z_now) > 2.5 else 3,
                "note":         "NRE: Execute LONG leg only. Monitor short leg as hedge.",
            })

        except Exception:
            continue

    return sorted(signals, key=lambda x: abs(x["z_score"]), reverse=True)


def _half_life(spread: np.ndarray) -> int:
    """Estimate mean-reversion half-life using AR(1) regression."""
    try:
        spread_lag  = spread[:-1]
        spread_diff = np.diff(spread)
        slope, _, _, _, _ = stats.linregress(spread_lag, spread_diff)
        if slope >= 0:
            return 999
        return int(round(-np.log(2) / slope))
    except Exception:
        return 999
