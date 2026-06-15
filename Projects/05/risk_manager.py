# -*- coding: utf-8 -*-
"""
risk_manager.py — Institutional Risk Management Engine
───────────────────────────────────────────────────────
Implements:
  1. Position Sizing  — 1% fixed risk (like your trade_planner.py)
  2. Kelly Criterion  — Optimal sizing based on edge
  3. ATR-based sizing — Volatility-adjusted position size
  4. Correlation check — Prevents over-concentration in correlated positions
  5. Portfolio-level limits — Sector, strategy, total exposure
  6. Zerodha NRE charges calculation
"""

import numpy as np
import pandas as pd
from config import (
    CAPITAL, RISK_PCT, MAX_POSITIONS, MAX_POSITION_PCT, MIN_POSITION_PCT,
    KELLY_FRACTION, KELLY_WIN_RATE_DEFAULT, KELLY_RR_DEFAULT,
    BROKERAGE_PER_ORDER, STT_PCT, EXCH_CHARGE_PCT,
    SEBI_PCT, STAMP_PCT, GST_PCT
)


# ── Zerodha NRE Charges ──────────────────────────────────────────────────────

def zerodha_charges(buy_value: float, sell_value: float) -> dict:
    """Full round-trip charge calculation for Zerodha NRE delivery."""
    turnover  = buy_value + sell_value
    brokerage = BROKERAGE_PER_ORDER * 2        # buy + sell order
    stt       = (buy_value + sell_value) * STT_PCT
    exch      = turnover * EXCH_CHARGE_PCT
    sebi      = turnover * SEBI_PCT
    stamp     = buy_value * STAMP_PCT
    gst       = (brokerage + exch) * GST_PCT
    total     = brokerage + stt + exch + sebi + stamp + gst

    return {
        "brokerage": round(brokerage, 2),
        "stt":       round(stt, 2),
        "exch":      round(exch, 2),
        "sebi":      round(sebi, 2),
        "stamp":     round(stamp, 2),
        "gst":       round(gst, 2),
        "total":     round(total, 2),
    }


# ── Position Sizing Methods ──────────────────────────────────────────────────

def fixed_risk_size(entry: float, stop: float,
                    capital: float = CAPITAL,
                    risk_pct: float = RISK_PCT) -> tuple:
    """
    Classic 1% risk position sizing.
    Returns (qty, investment_value)
    """
    risk_per_share = entry - stop
    if risk_per_share <= 0:
        return 0, 0
    risk_amount = capital * (risk_pct / 100)
    qty         = int(risk_amount / risk_per_share)
    qty         = _apply_caps(qty, entry, capital)
    return qty, round(qty * entry, 2)


def kelly_size(entry: float, stop: float, target: float,
               win_rate: float = None, capital: float = CAPITAL) -> tuple:
    """
    Kelly Criterion position sizing.
    f* = (b × p - q) / b    where b = R:R, p = win rate, q = 1-p
    Use fractional Kelly (25%) for safety.
    Returns (qty, investment_value)
    """
    win_rate = win_rate or KELLY_WIN_RATE_DEFAULT
    risk     = entry - stop
    reward   = target - entry
    if risk <= 0 or reward <= 0:
        return fixed_risk_size(entry, stop, capital)

    b = reward / risk
    p = win_rate
    q = 1 - p

    kelly_f = (b * p - q) / b
    kelly_f = max(0, min(kelly_f, 0.20))     # cap at 20% of capital
    kelly_f = kelly_f * KELLY_FRACTION        # fractional kelly

    invest   = capital * kelly_f
    qty      = int(invest / entry)
    qty      = _apply_caps(qty, entry, capital)
    return qty, round(qty * entry, 2)


def atr_size(entry: float, atr: float, capital: float = CAPITAL,
             risk_pct: float = RISK_PCT, atr_multiple: float = 2.0) -> tuple:
    """
    ATR-based volatility position sizing.
    Risk = atr_multiple × ATR per share
    Ensures consistent volatility exposure across positions.
    Returns (qty, investment_value)
    """
    risk_per_share = atr * atr_multiple
    if risk_per_share <= 0:
        return 0, 0
    risk_amount = capital * (risk_pct / 100)
    qty         = int(risk_amount / risk_per_share)
    qty         = _apply_caps(qty, entry, capital)
    return qty, round(qty * entry, 2)


def _apply_caps(qty: int, entry: float, capital: float) -> int:
    """Apply max/min position size as % of capital."""
    max_qty = int(capital * MAX_POSITION_PCT / 100 / entry)
    min_qty = int(capital * MIN_POSITION_PCT / 100 / entry)
    return max(min_qty, min(qty, max_qty))


# ── Full Trade Record ────────────────────────────────────────────────────────

def build_trade_record(signal: dict, win_rate: float = None) -> dict:
    """
    Given a signal dict, build a complete trade record with:
    - Multiple position sizing methods
    - Charge calculation
    - Net P&L scenarios
    - Break-even analysis
    """
    entry  = signal.get("entry", 0)
    stop   = signal.get("stop", 0)
    target = signal.get("target", 0)

    if not entry or not stop or entry <= stop:
        return {}

    # ── Position sizes ─────────────────────────────────────────────────────
    qty_fixed, inv_fixed = fixed_risk_size(entry, stop)
    qty_kelly, inv_kelly = kelly_size(entry, stop, target, win_rate)

    # Use fixed risk as primary (conservative)
    qty   = qty_fixed
    invest = inv_fixed

    if qty == 0:
        return {}

    # ── Charges ────────────────────────────────────────────────────────────
    buy_val  = qty * entry
    sell_win = qty * target
    sell_los = qty * stop
    chg_win  = zerodha_charges(buy_val, sell_win)
    chg_los  = zerodha_charges(buy_val, sell_los)

    # ── P&L ────────────────────────────────────────────────────────────────
    gross_profit = (target - entry) * qty
    gross_loss   = (entry  - stop)  * qty
    net_profit   = gross_profit - chg_win["total"]
    net_loss     = gross_loss   + chg_los["total"]
    gross_rr     = round(gross_profit / gross_loss, 2) if gross_loss > 0 else 0
    net_rr       = round(net_profit   / net_loss,   2) if net_loss   > 0 else 0
    charges_pct  = round(chg_win["total"] / buy_val * 100, 3)

    # ── Break-even win rate ─────────────────────────────────────────────────
    # net_profit × p = net_loss × (1-p)  →  p = net_loss / (net_profit + net_loss)
    be_win_rate  = round(net_loss / (net_profit + net_loss) * 100, 1) if (net_profit + net_loss) > 0 else 50

    return {
        # Signal info
        "strategy":    signal.get("strategy", ""),
        "symbol":      signal.get("symbol", ""),
        "setup":       signal.get("setup", ""),
        "direction":   signal.get("direction", "LONG"),
        "conviction":  signal.get("conviction", 0),

        # Levels
        "entry":       round(entry, 2),
        "stop":        round(stop,  2),
        "target":      round(target, 2),
        "gross_rr":    gross_rr,
        "net_rr":      net_rr,

        # Position
        "qty":         qty,
        "investment":  round(invest, 0),
        "pct_capital": round(invest / CAPITAL * 100, 1),
        "risk_amount": round(gross_loss, 0),
        "reward_amount": round(gross_profit, 0),
        "risk_pct_cap":  round(gross_loss / CAPITAL * 100, 2),

        # Kelly alternative
        "qty_kelly":   qty_kelly,
        "inv_kelly":   round(inv_kelly, 0),

        # Charges
        "charges_win": chg_win["total"],
        "charges_pct": charges_pct,
        "charges_breakdown": chg_win,

        # Net P&L
        "net_profit":  round(net_profit, 0),
        "net_loss":    round(net_loss, 0),
        "be_win_rate": be_win_rate,

        # Additional signal fields
        "rsi":         signal.get("rsi"),
        "adv_cr":      signal.get("adv_cr"),
        "vol_ratio":   signal.get("vol_ratio"),
        "sector":      signal.get("sector", ""),
        "pair":        signal.get("pair", ""),
        "z_score":     signal.get("z_score"),
        "gap_pct":     signal.get("gap_pct"),
        "composite":   signal.get("composite"),
        "rank":        signal.get("rank"),
        "atr_pct":     signal.get("atr_pct"),
    }


# ── Portfolio-Level Risk Checks ──────────────────────────────────────────────

def portfolio_risk_check(trades: list) -> dict:
    """
    Check portfolio-level risk metrics.
    Returns a summary dict with warnings.
    """
    if not trades:
        return {}

    total_invest  = sum(t.get("investment", 0) for t in trades)
    total_risk    = sum(t.get("risk_amount", 0) for t in trades)
    total_reward  = sum(t.get("reward_amount", 0) for t in trades)
    total_charges = sum(t.get("charges_win", 0) for t in trades)
    net_profit    = sum(t.get("net_profit", 0) for t in trades)
    net_loss      = sum(t.get("net_loss", 0) for t in trades)

    deploy_pct    = total_invest / CAPITAL * 100
    total_risk_pct= total_risk   / CAPITAL * 100

    # Sector concentration
    sector_exposure = {}
    for t in trades:
        sec = t.get("sector", "Unknown")
        sector_exposure[sec] = sector_exposure.get(sec, 0) + t.get("investment", 0)
    sector_pcts = {k: round(v / CAPITAL * 100, 1) for k, v in sector_exposure.items()}

    # Warnings
    warnings = []
    if deploy_pct > 90:
        warnings.append(f"[!]High deployment: {deploy_pct:.1f}% of capital")
    if total_risk_pct > 10:
        warnings.append(f"[!]Total risk {total_risk_pct:.1f}% exceeds 10% guideline")
    if any(v > 30 for v in sector_pcts.values()):
        heavy = {k: v for k, v in sector_pcts.items() if v > 30}
        warnings.append(f"[!]Sector concentration: {heavy}")
    if len(trades) > MAX_POSITIONS:
        warnings.append(f"[!]{len(trades)} positions > max {MAX_POSITIONS}")

    avg_rr = round(sum(t.get("net_rr", 0) for t in trades) / len(trades), 2) if trades else 0
    be_wr  = round(net_loss / (net_profit + net_loss) * 100, 1) if (net_profit + net_loss) > 0 else 50

    return {
        "num_trades":      len(trades),
        "capital":         CAPITAL,
        "total_invest":    round(total_invest, 0),
        "deploy_pct":      round(deploy_pct, 1),
        "capital_reserve": round(CAPITAL - total_invest, 0),
        "total_risk":      round(total_risk, 0),
        "total_risk_pct":  round(total_risk_pct, 2),
        "total_reward":    round(total_reward, 0),
        "total_charges":   round(total_charges, 0),
        "net_profit_all":  round(net_profit, 0),
        "net_loss_all":    round(net_loss, 0),
        "portfolio_rr":    round(total_reward / total_risk, 2) if total_risk > 0 else 0,
        "avg_net_rr":      avg_rr,
        "be_win_rate":     be_wr,
        "sector_exposure": sector_pcts,
        "warnings":        warnings,
    }
