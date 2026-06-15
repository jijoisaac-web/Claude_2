# -*- coding: utf-8 -*-
"""
portfolio_builder.py — Combines all strategy signals into a ranked portfolio
─────────────────────────────────────────────────────────────────────────────
Process:
  1. Collect signals from all enabled strategies
  2. Deduplicate: if same stock appears in multiple strategies, merge signals
  3. Score: base conviction + cross-strategy bonus + factor score bonus
  4. Apply portfolio constraints (max positions, sector limits, min R:R)
  5. Build final trade list with full risk metrics
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import numpy as np
from config import STRATEGIES, MAX_POSITIONS, CAPITAL
from risk_manager import build_trade_record, portfolio_risk_check

# Strategy imports
from strategies.mean_reversion import scan as mr_scan
from strategies.momentum       import scan as mom_scan
from strategies.factor_model   import score as factor_score
from strategies.pairs_trading  import scan as pairs_scan
from strategies.sector_rotation import scan as sr_scan
from strategies.pead           import scan as pead_scan


def run_all_strategies(price_data: dict, fundamentals: dict) -> dict:
    """
    Run all enabled strategies and return raw signals.
    Returns: { strategy_name: [signals] }
    """
    all_signals = {}
    print()

    if STRATEGIES.get("mean_reversion"):
        print("  >>Running Mean Reversion strategy...")
        all_signals["mean_reversion"] = mr_scan(price_data)
        print(f"    ->{len(all_signals['mean_reversion'])} signals found")

    if STRATEGIES.get("momentum"):
        print("  >>Running Momentum strategy...")
        all_signals["momentum"] = mom_scan(price_data)
        print(f"    ->{len(all_signals['momentum'])} signals found")

    if STRATEGIES.get("factor_model"):
        print("  >>Running Factor Model...")
        all_signals["factor_model"] = factor_score(price_data, fundamentals)
        print(f"    ->{len(all_signals['factor_model'])} signals found")

    if STRATEGIES.get("pairs_trading"):
        print("  >>Running Pairs Trading (Stat Arb)...")
        all_signals["pairs_trading"] = pairs_scan(price_data)
        print(f"    ->{len(all_signals['pairs_trading'])} pairs signals")

    if STRATEGIES.get("sector_rotation"):
        print("  >>Running Sector Rotation...")
        sr_results = sr_scan(price_data)
        # Split into sector info and stock picks
        all_signals["sector_rotation_info"]  = [s for s in sr_results if s.get("direction") == "INFO"]
        all_signals["sector_rotation_picks"] = [s for s in sr_results if s.get("direction") == "LONG"]
        print(f"    ->{len(all_signals['sector_rotation_picks'])} stock picks in leading sectors")

    if STRATEGIES.get("pead"):
        print("  >>Running PEAD (Earnings Gap) strategy...")
        all_signals["pead"] = pead_scan(price_data)
        print(f"    ->{len(all_signals['pead'])} earnings gap signals")

    return all_signals


def build_portfolio(all_signals: dict, win_rate: float = 0.45) -> tuple:
    """
    Merge, deduplicate, score, and select final portfolio.
    Returns: (portfolio_trades, sector_info, all_raw_signals)
    """

    # ── Collect all actionable stock signals ─────────────────────────────
    actionable_keys = ["mean_reversion", "momentum", "factor_model",
                       "sector_rotation_picks", "pead", "pairs_trading"]

    # Map: symbol → list of signals across strategies
    symbol_signals = {}
    for key in actionable_keys:
        for sig in all_signals.get(key, []):
            sym = sig.get("symbol", "")
            if not sym or sym.startswith("["):
                continue
            if sym not in symbol_signals:
                symbol_signals[sym] = []
            symbol_signals[sym].append(sig)

    # ── Merge multi-strategy hits ─────────────────────────────────────────
    merged = []
    for sym, sigs in symbol_signals.items():
        if not sigs:
            continue

        # Base: pick signal with best R:R as primary
        primary = max(sigs, key=lambda s: (s.get("conviction", 0), s.get("rr", 0)))

        # Composite conviction = sum of individual convictions + cross-strategy bonus
        total_conviction = sum(s.get("conviction", 0) for s in sigs)
        strategies_hit   = list({s.get("strategy") for s in sigs})
        cross_bonus      = (len(strategies_hit) - 1) * 2  # +2 per extra strategy

        # Best levels across all signals
        best_rr  = max((s.get("rr", 0) for s in sigs), default=0)
        best_entry = primary.get("entry", 0)
        best_stop  = primary.get("stop", 0)
        best_target= primary.get("target", 0)

        merged.append({
            **primary,
            "symbol":       sym,
            "strategies":   " + ".join(strategies_hit),
            "strategy_count": len(strategies_hit),
            "conviction":   total_conviction + cross_bonus,
            "rr":           best_rr,
            "entry":        best_entry,
            "stop":         best_stop,
            "target":       best_target,
            "all_setups":   " | ".join(s.get("setup", "") for s in sigs),
        })

    # ── Scoring & filtering ───────────────────────────────────────────────
    scored = []
    for sig in merged:
        entry  = sig.get("entry", 0)
        stop   = sig.get("stop", 0)
        target = sig.get("target", 0)
        rr     = sig.get("rr", 0)

        # Filter: minimum quality gates
        if entry <= 0 or stop <= 0 or entry <= stop:
            continue
        if rr < 1.0:
            continue
        if sig.get("direction") not in ("LONG",):
            continue

        # Final score = conviction × R:R × strategy_count_bonus
        score = sig["conviction"] * (1 + rr * 0.2) * (1 + (sig["strategy_count"] - 1) * 0.3)
        sig["final_score"] = round(score, 3)
        scored.append(sig)

    # Sort by final score
    scored.sort(key=lambda x: x["final_score"], reverse=True)

    # ── Apply portfolio constraints ───────────────────────────────────────
    portfolio = []
    sector_count = {}
    symbols_added = set()

    for sig in scored:
        if len(portfolio) >= MAX_POSITIONS:
            break

        sym    = sig["symbol"]
        sector = sig.get("sector", "Unknown")

        # No duplicates
        if sym in symbols_added:
            continue

        # Sector cap: max 3 stocks per sector
        if sector_count.get(sector, 0) >= 3:
            continue

        # Build full trade record with charges
        trade = build_trade_record(sig, win_rate=win_rate)
        if not trade or trade.get("qty", 0) == 0:
            continue

        # Add extra fields from merged signal
        trade["strategies"]     = sig.get("strategies", "")
        trade["strategy_count"] = sig.get("strategy_count", 1)
        trade["all_setups"]     = sig.get("all_setups", "")
        trade["final_score"]    = sig.get("final_score", 0)

        portfolio.append(trade)
        symbols_added.add(sym)
        sector_count[sector] = sector_count.get(sector, 0) + 1

    # ── Portfolio risk summary ────────────────────────────────────────────
    risk_summary = portfolio_risk_check(portfolio)

    # ── Sector rotation info ──────────────────────────────────────────────
    sector_info = all_signals.get("sector_rotation_info", [])

    return portfolio, sector_info, risk_summary, scored
