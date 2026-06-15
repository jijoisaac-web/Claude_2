"""Actionable trade generation — swing (5-20 sessions) and positional (3-6 months).

Converts screener scores into concrete trade plans: entry, ATR-based stop-loss,
R-multiple targets, suggested quantity (fixed-fractional risk), and exit rules.
Position risk is automatically halved in a RISK-OFF regime.
"""
import numpy as np
import pandas as pd

import config


def atr(high: pd.DataFrame, low: pd.DataFrame, close: pd.DataFrame,
        window: int = 14) -> pd.Series:
    prev = close.shift(1)
    tr = pd.concat([(high - low),
                    (high - prev).abs(),
                    (low - prev).abs()], keys=["a", "b", "c"]).groupby(level=1).max()
    return tr.rolling(window).mean().iloc[-1]


def _plan(entry, stop, t1_r, t2_r, risk_budget):
    risk = entry - stop
    qty = np.floor(risk_budget / risk).where(risk > 0, 0)
    return pd.DataFrame({
        "entry": entry.round(2),
        "stop_loss": stop.round(2),
        "risk_pct": (risk / entry * 100).round(2),
        "target_1": (entry + t1_r * risk).round(2),
        "target_2": (entry + t2_r * risk).round(2),
        "rr_target_1": t1_r,
        "rr_target_2": t2_r,
        "suggested_qty": qty.astype(int),
        "capital_at_risk": (qty * risk).round(0),
    })


def run(close: pd.DataFrame, high: pd.DataFrame, low: pd.DataFrame,
        tr_res: pd.DataFrame, comp: pd.DataFrame,
        flow_res: pd.DataFrame | None, earn_res: pd.DataFrame | None,
        regime: dict) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns (swing_trades, positional_trades), indexed by Yahoo ticker."""
    last = close.iloc[-1]
    a14 = atr(high, low, close)
    sma20 = close.rolling(20).mean().iloc[-1]
    sma50 = close.rolling(50).mean().iloc[-1]
    low10 = low.tail(10).min()

    risk_mult = 1.0 if regime.get("risk_on", True) else config.RISKOFF_RISK_FACTOR
    risk_budget = config.CAPITAL * config.RISK_PER_TRADE * risk_mult

    m = tr_res.copy()
    m["composite"] = comp["composite"].reindex(m.index)
    m["vol_expanding"] = (flow_res["volume_expanding"].reindex(m.index)
                          if flow_res is not None else np.nan)
    m["delivery_pct"] = (flow_res["delivery_pct"].reindex(m.index)
                         if flow_res is not None else np.nan)
    m["earnings_score"] = (earn_res["earnings_score"].reindex(m.index)
                           if earn_res is not None else np.nan)

    # ---------------- SWING (5-20 sessions) ----------------
    near_sma20 = (last / sma20 - 1).abs() <= 0.02
    swing_mask = (
        (m["composite"] >= config.SWING_MIN_COMPOSITE)
        & (m["rsi_14"].between(*config.SWING_RSI_RANGE))
        & (m["breakout_20d"] | (m["ma_aligned"] & near_sma20.reindex(m.index).fillna(False)))
    )
    if flow_res is not None:
        swing_mask &= m["vol_expanding"].fillna(False).astype(bool) | m["breakout_20d"]

    sw = m[swing_mask].copy()
    entry = last.reindex(sw.index)
    # stop: tighter of (2x ATR) and just below the 10-day low
    stop = pd.concat([entry - 2 * a14.reindex(sw.index),
                      low10.reindex(sw.index) * 0.995], axis=1).max(axis=1)
    swing = _plan(entry, stop, config.SWING_T1_R, config.SWING_T2_R, risk_budget)
    swing.insert(0, "setup", np.where(sw["breakout_20d"], "20d breakout", "pullback to 20DMA"))
    swing["composite"] = sw["composite"].round(1)
    swing["rsi_14"] = sw["rsi_14"].round(1)
    swing["delivery_pct"] = sw["delivery_pct"].round(1)
    swing["holding"] = "5-20 sessions"
    swing["exit_rule"] = ("Book 50% at T1, trail rest at 20DMA; "
                          "hard exit on close below stop or 20DMA")
    swing = swing.sort_values("composite", ascending=False)

    # ---------------- POSITIONAL (3-6 months) ----------------
    pos_mask = (
        (m["composite"] >= config.POS_MIN_COMPOSITE)
        & m["above_sma200"].astype(bool)
        & m["ma_aligned"].astype(bool)
        & (m["pct_of_52w_high"] >= config.POS_MIN_52W_PCT)
    )
    po = m[pos_mask].copy()
    entry = last.reindex(po.index)
    # stop: wider — below the 50DMA or 3x ATR, whichever gives room but caps risk
    stop = pd.concat([entry - 3 * a14.reindex(po.index),
                      sma50.reindex(po.index) * 0.97], axis=1).min(axis=1)
    stop = stop.clip(lower=entry * (1 - config.POS_MAX_RISK_PCT))   # cap risk per trade
    positional = _plan(entry, stop, config.POS_T1_R, config.POS_T2_R, risk_budget)
    positional.insert(0, "setup", "established uptrend (MA-aligned, near 52w high)")
    positional["composite"] = po["composite"].round(1)
    positional["earnings_score"] = po["earnings_score"].round(1)
    positional["delivery_pct"] = po["delivery_pct"].round(1)
    positional["pct_of_52w_high"] = po["pct_of_52w_high"].round(2)
    positional["holding"] = "3-6 months"
    positional["exit_rule"] = ("Book 1/3 at T1, 1/3 at T2, trail rest at 50DMA; "
                               "exit on weekly close below 50DMA or composite < 50 on rerun")
    positional = positional.sort_values("composite", ascending=False)

    print(f"[trades] swing setups: {len(swing)}, positional setups: {len(positional)} "
          f"(risk/trade: INR {risk_budget:,.0f}{' — halved, RISK-OFF' if risk_mult < 1 else ''})")
    return swing, positional
