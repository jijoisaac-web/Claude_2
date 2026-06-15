# -*- coding: utf-8 -*-
"""
sector_rotation.py — Sector Momentum Rotation Strategy
───────────────────────────────────────────────────────
Logic:
  1. Rank all sectors by blended momentum score:
       - 30-day return (short-term strength)
       - 90-day return (medium-term momentum)
       - Relative strength vs Nifty 50 (alpha generation)
  2. Invest in stocks from the top 3 sectors
  3. Avoid stocks in bottom 3 sectors regardless of setup quality
  4. Rebalance monthly

Economic cycle mapping (for context):
  Recovery   → Cyclicals (Banking, Auto, Metals)
  Expansion  → IT, Capital Goods, FMCG
  Peak       → Energy, Infra, Realty
  Contraction→ Pharma, FMCG, Consumer Staples

Institutional use: Most long-only mutual funds use sector rotation overlays.
Macro hedge funds (Brevan Howard, BlueCrest) use it as a top-down filter.
"""

import numpy as np
import pandas as pd
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from data_fetcher import add_indicators, fetch_ohlcv
from symbols import UNIVERSE, SYMBOL_SECTOR
from config import SR_LOOKBACK_SHORT, SR_LOOKBACK_LONG, SR_TOP_SECTORS


NIFTY50_SYMBOL = "^NSEI"


def _sector_momentum(price_data: dict) -> pd.DataFrame:
    """Compute per-sector average momentum scores."""
    sector_scores = {}

    for sector, symbols in UNIVERSE.items():
        rets_short = []
        rets_long  = []

        for sym in symbols:
            df = price_data.get(sym)
            if df is None or len(df) < SR_LOOKBACK_LONG + 5:
                continue
            close = df["Close"]
            _rs = close.pct_change(SR_LOOKBACK_SHORT).iloc[-1]
            _rl = close.pct_change(SR_LOOKBACK_LONG).iloc[-1]
            r_short = 0.0 if pd.isna(_rs) else float(_rs)
            r_long  = 0.0 if pd.isna(_rl) else float(_rl)
            rets_short.append(r_short)
            rets_long.append(r_long)

        if not rets_short:
            continue

        sector_scores[sector] = {
            "sector":      sector,
            "ret_30d":     round(np.mean(rets_short) * 100, 2),
            "ret_90d":     round(np.mean(rets_long)  * 100, 2),
            "momentum":    round(0.4 * np.mean(rets_short) + 0.6 * np.mean(rets_long), 4),
            "stock_count": len(rets_short),
        }

    df = pd.DataFrame(list(sector_scores.values()))
    if df.empty:
        return df

    # Rank sectors
    df = df.sort_values("momentum", ascending=False).reset_index(drop=True)
    df["rank"]   = range(1, len(df) + 1)
    df["signal"] = df["rank"].apply(
        lambda r: "OVERWEIGHT" if r <= SR_TOP_SECTORS
                  else ("UNDERWEIGHT" if r > len(df) - SR_TOP_SECTORS else "NEUTRAL")
    )
    return df


def scan(price_data: dict) -> list:
    """
    Returns two outputs:
    1. Sector rankings with signals
    2. Best stocks within top sectors (using momentum of individual stocks)
    """
    sector_df = _sector_momentum(price_data)
    if sector_df.empty:
        return []

    # Get top sectors
    top_sectors = set(sector_df[sector_df["signal"] == "OVERWEIGHT"]["sector"].tolist())
    avoid_sectors = set(sector_df[sector_df["signal"] == "UNDERWEIGHT"]["sector"].tolist())

    signals = []

    # Sector rotation summary signals
    for _, row in sector_df.iterrows():
        signals.append({
            "strategy":    "Sector Rotation",
            "symbol":      f"[SECTOR] {row['sector']}",
            "sector":      row["sector"],
            "setup":       f"SectorRank#{int(row['rank'])}_{row['signal']}",
            "direction":   "INFO",
            "entry":       None,
            "stop":        None,
            "target":      None,
            "rr":          None,
            "ret_30d":     row["ret_30d"],
            "ret_90d":     row["ret_90d"],
            "momentum":    round(float(row["momentum"]) * 100, 2),
            "rank":        int(row["rank"]),
            "signal":      row["signal"],
            "conviction":  SR_TOP_SECTORS + 1 - int(row["rank"]) if row["signal"] == "OVERWEIGHT" else 0,
        })

    # Best individual stocks within top sectors
    stock_signals = []
    for sym, df in price_data.items():
        sector = SYMBOL_SECTOR.get(sym, "Unknown")
        if sector not in top_sectors:
            continue
        try:
            df = add_indicators(df)
            if len(df) < 100:
                continue
            last  = df.iloc[-1]
            close = float(last["Close"])
            ema20 = float(last["EMA_20"])
            ema50 = float(last["EMA_50"])
            ema200= float(last["EMA_200"])
            ret30 = float(last.get("Ret_20d", 0) or 0)
            ret90 = float(last.get("Ret_63d", 0) or 0)
            atr   = float(last["ATR"])
            rsi   = float(last["RSI"])
            adv   = float(last.get("ADV", 0) or 0)

            # Stock must also be in uptrend within the leading sector
            if not (close > ema50 and ema50 > ema200 * 0.97):
                continue
            if rsi < 40 or rsi > 80:
                continue

            stop   = round(ema50 * 0.98, 2)
            target = round(close + 2.5 * (close - stop), 2)
            rr     = round((target - close) / (close - stop), 2) if close > stop else 0

            # Get sector rank for this stock's sector
            sec_rank_row = sector_df[sector_df["sector"] == sector]
            sec_rank = int(sec_rank_row["rank"].iloc[0]) if not sec_rank_row.empty else 99
            sec_ret30 = float(sec_rank_row["ret_30d"].iloc[0]) if not sec_rank_row.empty else 0

            stock_signals.append({
                "strategy":   "Sector Rotation",
                "symbol":     sym,
                "sector":     sector,
                "setup":      f"LeadingSector({sector},Rank#{sec_rank})",
                "direction":  "LONG",
                "entry":      round(close, 2),
                "stop":       stop,
                "target":     target,
                "rr":         rr,
                "ret_30d":    round(ret30 * 100, 1),
                "ret_90d":    round(ret90 * 100, 1),
                "sector_ret30": sec_ret30,
                "rsi":        round(rsi, 1),
                "adv_cr":     round(adv / 1e7, 2),
                "sector_rank": sec_rank,
                "conviction": max(1, SR_TOP_SECTORS + 1 - sec_rank),
            })

        except Exception:
            continue

    # Sort individual stock picks by sector rank then 30d return
    stock_signals.sort(key=lambda x: (x.get("sector_rank", 99), -x.get("ret_30d", 0)))
    return signals + stock_signals
