# -*- coding: utf-8 -*-
"""
momentum.py — EMA Trend + Breakout Momentum Strategy
─────────────────────────────────────────────────────
Logic:
  BREAKOUT setup  : Price closes above 52-week high with volume > 1.5x average
                    AND EMA_20 > EMA_50 > EMA_200 (all EMAs aligned bullish)
                    AND ADX > 20 (strong directional trend)

  EMA CROSSOVER   : EMA_20 crosses above EMA_50 with price above EMA_200
                    AND volume expansion on crossover day

  12-1 MOMENTUM   : Top quartile of 12-month return (skipping last month)
                    — The classic academic momentum factor

  Stop Loss       : Below EMA_50 or 2 × ATR from entry (whichever is closer)
  Target          : Previous swing high OR 2R from entry

Institutional use: Trend-following CTAs (AQR, Winton, Man AHL) use momentum
                   as primary signal. Long-only funds use breakout for entry timing.
"""

import numpy as np
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from data_fetcher import add_indicators, avg_daily_value
from config import (MOM_EMA_FAST, MOM_EMA_SLOW, MOM_EMA_TREND,
                    MOM_VOL_MULT, MOM_ADX_MIN, MOM_MIN_ADV)


def scan(price_data: dict) -> list:
    signals = []

    for symbol, df in price_data.items():
        try:
            df = add_indicators(df)
            if len(df) < 220:
                continue

            if avg_daily_value(df) < MOM_MIN_ADV:
                continue

            last  = df.iloc[-1]
            prev  = df.iloc[-2]
            prev2 = df.iloc[-3]

            close    = float(last["Close"])
            ema20    = float(last["EMA_20"])
            ema50    = float(last["EMA_50"])
            ema200   = float(last["EMA_200"])
            adx      = float(last["ADX"])
            vol_r    = float(last["Vol_ratio"])
            high52   = float(last["High_52w"])
            atr      = float(last["ATR"])
            adv      = float(last["ADV"])
            ret_252  = float(last.get("Ret_252d", 0) or 0)
            ret_20   = float(last.get("Ret_20d", 0) or 0)
            ret_12_1 = ret_252 - ret_20   # 12-1 month momentum

            setups = []

            # ── EMA alignment (trend filter) ─────────────────────────────
            ema_aligned = ema20 > ema50 > ema200

            # ── Setup 1: 52-Week Breakout ─────────────────────────────────
            prev_close = float(prev["Close"])
            prev_high52 = float(prev["High_52w"])
            breakout = (close > high52 * 0.998 and
                        prev_close < prev_high52 and
                        vol_r >= MOM_VOL_MULT and
                        ema_aligned)
            if breakout:
                setups.append(f"52W_Breakout(Vol:{vol_r:.1f}x)")

            # ── Setup 2: EMA 20/50 Golden Cross ──────────────────────────
            ema20_prev = float(prev["EMA_20"])
            ema50_prev = float(prev["EMA_50"])
            cross = (ema20 > ema50 and
                     ema20_prev <= ema50_prev and
                     close > ema200 and
                     vol_r > 1.2)
            if cross:
                setups.append("EMA_GoldenCross(20/50)")

            # ── Setup 3: Strong trend continuation ───────────────────────
            trend_cont = (ema_aligned and
                          adx >= MOM_ADX_MIN and
                          close > ema20 and
                          vol_r > 1.0 and
                          float(last["Ret_5d"]) > 0 and
                          float(last["Ret_20d"]) > 0)
            if trend_cont:
                setups.append(f"Trend_Continuation(ADX:{adx:.0f})")

            # ── Setup 4: 12-1 Momentum ranking flag ──────────────────────
            top_momentum = ret_12_1 > 0.25   # >25% 12-1 month return
            if top_momentum:
                setups.append(f"Momentum_12_1({ret_12_1*100:.0f}%)")

            if not setups:
                continue

            # ── Levels ───────────────────────────────────────────────────
            # Stop: below EMA_50 or 2 ATR
            stop_ema  = round(ema50 * 0.99, 2)
            stop_atr  = round(close - 2 * atr, 2)
            stop_loss = max(stop_ema, stop_atr)   # tighter of the two

            risk      = close - stop_loss
            if risk <= 0:
                continue

            # Target: 2R or recent swing high
            swing_highs = df["High"].tail(20).nlargest(3)
            swing_high  = float(swing_highs.iloc[1]) if len(swing_highs) > 1 else close + 2 * risk
            target      = max(round(close + 2 * risk, 2), round(swing_high, 2))
            rr          = round((target - close) / risk, 2)

            signals.append({
                "strategy":   "Momentum",
                "symbol":     symbol,
                "setup":      " + ".join(setups),
                "direction":  "LONG",
                "entry":      round(close, 2),
                "stop":       stop_loss,
                "target":     target,
                "rr":         rr,
                "adx":        round(adx, 1),
                "vol_ratio":  round(vol_r, 2),
                "ema_aligned": ema_aligned,
                "ret_12_1":   round(ret_12_1 * 100, 1),
                "ret_1m":     round(ret_20 * 100, 1),
                "adv_cr":     round(adv / 1e7, 2),
                "atr_pct":    round(float(last["ATR_pct"]), 2),
                "pct_52w_high": round(float(last["Pct_52w_high"]), 1),
                "conviction": len(setups),
            })

        except Exception:
            continue

    return sorted(signals, key=lambda x: (x["conviction"], x["adx"]), reverse=True)
