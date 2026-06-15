# -*- coding: utf-8 -*-
"""
factor_model.py — Multi-Factor Ranking Model (Institutional Quant Style)
─────────────────────────────────────────────────────────────────────────
Factors (weighted composite score):
  30% — Price Momentum (12-1 month return)       : Higher is better
  20% — Quality: ROE                             : Higher is better
  15% — Value: Price-to-Book                     : Lower is better
  15% — Low Volatility (1Y realised vol)         : Lower is better
  10% — Earnings Growth                          : Higher is better
  10% — Value: P/E TTM                           : Lower is better

Each factor is cross-sectionally z-scored, then weighted into a composite.
Top N stocks by composite score are selected for the portfolio.

Institutional use: AQR, Dimensional Fund Advisors, and most systematic
long-only funds use multi-factor models for stock selection and portfolio
construction. This replicates a simplified version of their approach.
"""

import numpy as np
import pandas as pd
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from data_fetcher import add_indicators
from config import FACTOR_WEIGHTS, FACTOR_TOP_N


def _zscore(series: pd.Series) -> pd.Series:
    """Cross-sectional z-score (mean=0, std=1). NaN-safe."""
    mean = series.mean()
    std  = series.std()
    if std == 0 or pd.isna(std):
        return series * 0
    return (series - mean) / std


def score(price_data: dict, fundamentals: dict) -> list:
    """
    Score all symbols and return ranked list.
    price_data    : {symbol: DataFrame}
    fundamentals  : {symbol: dict}
    Returns list of scored signal dicts, sorted by composite score descending.
    """
    rows = []

    for symbol, df in price_data.items():
        try:
            df   = add_indicators(df)
            fund = fundamentals.get(symbol, {})

            if len(df) < 252:
                continue

            last     = df.iloc[-1]
            close    = float(last["Close"])

            # ── Momentum 12-1 ─────────────────────────────────────────────
            ret_252  = float(last.get("Ret_252d") or 0)
            ret_20   = float(last.get("Ret_20d")  or 0)
            mom_12_1 = ret_252 - ret_20

            # ── Quality: ROE ──────────────────────────────────────────────
            roe = fund.get("roe")
            roe = float(roe) if roe is not None else np.nan

            # ── Value: P/B ────────────────────────────────────────────────
            pb  = fund.get("pb")
            pb  = float(pb)  if pb  is not None else np.nan

            # ── Low Volatility ────────────────────────────────────────────
            vol_1y = float(last.get("Vol_20d") or 0)
            if vol_1y == 0:
                vol_1y = np.nan

            # ── Earnings Growth ───────────────────────────────────────────
            eps_g = fund.get("eps_growth")
            eps_g = float(eps_g) if eps_g is not None else np.nan

            # ── Value: P/E ────────────────────────────────────────────────
            pe  = fund.get("pe_ttm")
            pe  = float(pe) if pe is not None and float(pe) > 0 else np.nan

            rows.append({
                "symbol":      symbol,
                "name":        fund.get("name", symbol),
                "sector":      fund.get("sector", "Unknown"),
                "price":       round(close, 2),
                "mom_12_1":    mom_12_1,
                "roe":         roe,
                "pb":          pb,
                "vol_1y":      vol_1y,
                "eps_growth":  eps_g,
                "pe":          pe,
                "market_cap":  fund.get("market_cap", 0),
                "adv_cr":      round(float(last.get("ADV", 0) or 0) / 1e7, 2),
                "rsi":         round(float(last.get("RSI", 50) or 50), 1),
                "ema_trend":   "UP" if float(last.get("EMA_20",0)) > float(last.get("EMA_200",0)) else "DOWN",
                "52w_high":    round(float(last.get("High_52w", close) or close), 2),
                "atr_pct":     round(float(last.get("ATR_pct", 0) or 0), 2),
            })

        except Exception:
            continue

    if not rows:
        return []

    df_all = pd.DataFrame(rows)

    # ── Cross-sectional z-scoring ──────────────────────────────────────────
    # For "lower is better" factors, negate before z-scoring
    df_all["z_mom"]    = _zscore(df_all["mom_12_1"])
    df_all["z_roe"]    = _zscore(df_all["roe"])
    df_all["z_pb"]     = _zscore(-df_all["pb"])      # lower P/B = better → negate
    df_all["z_lowvol"] = _zscore(-df_all["vol_1y"])  # lower vol = better → negate
    df_all["z_epsg"]   = _zscore(df_all["eps_growth"])
    df_all["z_pe"]     = _zscore(-df_all["pe"])      # lower P/E = better → negate

    # ── Composite score ────────────────────────────────────────────────────
    w = FACTOR_WEIGHTS
    df_all["composite"] = (
        df_all["z_mom"].fillna(0)    * w["momentum_12_1"]   +
        df_all["z_roe"].fillna(0)    * w["quality_roe"]     +
        df_all["z_pb"].fillna(0)     * w["value_pb"]        +
        df_all["z_lowvol"].fillna(0) * w["low_volatility"]  +
        df_all["z_epsg"].fillna(0)   * w["earnings_growth"] +
        df_all["z_pe"].fillna(0)     * w["value_pe"]
    )

    df_all["rank"] = df_all["composite"].rank(ascending=False).astype(int)
    df_all = df_all.sort_values("composite", ascending=False)

    # Top N
    top = df_all.head(FACTOR_TOP_N)

    result = []
    for _, row in top.iterrows():
        # Derive entry levels from price data
        sym = row["symbol"]
        pdata = price_data.get(sym)
        entry = float(row["price"])
        stop  = entry
        target = entry

        if pdata is not None and len(pdata) > 20:
            pdata = add_indicators(pdata)
            last  = pdata.iloc[-1]
            atr   = float(last.get("ATR", entry * 0.02) or entry * 0.02)
            ema50 = float(last.get("EMA_50", entry * 0.97) or entry * 0.97)
            stop  = round(max(ema50 * 0.98, entry - 2 * atr), 2)
            target = round(entry + 3 * (entry - stop), 2)   # 3R target

        rr = round((target - entry) / (entry - stop), 2) if entry > stop else 0

        result.append({
            "strategy":   "Factor Model",
            "symbol":     sym,
            "name":       row["name"],
            "sector":     row["sector"],
            "setup":      f"MultiFactorRank#{int(row['rank'])}",
            "direction":  "LONG",
            "entry":      entry,
            "stop":       stop,
            "target":     target,
            "rr":         rr,
            "composite":  round(float(row["composite"]), 3),
            "rank":       int(row["rank"]),
            "mom_12_1":   round(float(row["mom_12_1"]) * 100, 1),
            "roe":        round(float(row["roe"]) * 100, 1) if not pd.isna(row["roe"]) else None,
            "pb":         round(float(row["pb"]), 2)        if not pd.isna(row["pb"])  else None,
            "pe":         round(float(row["pe"]), 1)        if not pd.isna(row["pe"])  else None,
            "eps_growth": round(float(row["eps_growth"]) * 100, 1) if not pd.isna(row["eps_growth"]) else None,
            "vol_1y":     round(float(row["vol_1y"]) * 100, 1) if not pd.isna(row["vol_1y"]) else None,
            "adv_cr":     row["adv_cr"],
            "rsi":        row["rsi"],
            "ema_trend":  row["ema_trend"],
            "conviction": 5,   # factor model picks always get high conviction
        })

    return result
