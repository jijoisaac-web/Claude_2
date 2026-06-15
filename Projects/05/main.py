# -*- coding: utf-8 -*-
"""
main.py — Project 05: Institutional Strategy Engine
─────────────────────────────────────────────────────
Replicates hedge fund / institutional trading strategies for Indian equities:
  1. Mean Reversion      (Bollinger Band + RSI)
  2. Momentum            (EMA trend + 52W breakout)
  3. Factor Model        (Multi-factor quant ranking)
  4. Pairs Trading       (Statistical arbitrage)
  5. Sector Rotation     (Sector momentum overlay)
  6. PEAD                (Post-earnings announcement drift)

Output: Comprehensive Excel report in /results folder
"""

import os, sys, warnings, datetime
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))

from config import CAPITAL, RISK_PCT, MAX_POSITIONS, RESULTS_DIR
from symbols import ALL_SYMBOLS
from data_fetcher import fetch_bulk_ohlcv, fetch_bulk_fundamentals
from portfolio_builder import run_all_strategies, build_portfolio
from report_generator import save_report


BANNER = """
+==================================================================+
|       INSTITUTIONAL STRATEGY ENGINE  -  Project 05              |
|       Indian Equity Market  |  Zerodha NRE  |  INR 20 Lakhs     |
+==================================================================+
|  Strategies: Mean Reversion | Momentum | Factor Model           |
|             Pairs Trading  | Sector Rotation | PEAD              |
+==================================================================+
"""


def main():
    print(BANNER)
    print(f"  Capital    : Rs.{CAPITAL:,.0f}")
    print(f"  Risk/trade : {RISK_PCT}% = Rs.{CAPITAL * RISK_PCT / 100:,.0f}")
    print(f"  Max trades : {MAX_POSITIONS}")
    print(f"  Universe   : {len(ALL_SYMBOLS)} NSE stocks")
    print(f"  Started    : {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 66)

    # ── Step 1: Download price data ───────────────────────────────────────
    print("\n[1/4] Downloading price data...")
    price_data = fetch_bulk_ohlcv(ALL_SYMBOLS)
    print(f"  [OK] Loaded {len(price_data)}/{len(ALL_SYMBOLS)} stocks")

    if not price_data:
        print("  [!!] No data downloaded. Check internet connection.")
        return

    # ── Step 2: Download fundamentals ────────────────────────────────────
    print("\n[2/4] Downloading fundamental data...")
    fundamentals = fetch_bulk_fundamentals(list(price_data.keys()))
    print(f"  [OK] Fundamentals loaded for {len(fundamentals)} stocks")

    # ── Step 3: Run all strategies ────────────────────────────────────────
    print("\n[3/4] Running strategies...")
    all_signals = run_all_strategies(price_data, fundamentals)

    total_raw = sum(
        len(v) for k, v in all_signals.items()
        if not k.endswith("_info")
    )
    print(f"\n  Total raw signals: {total_raw}")

    # ── Step 4: Build portfolio ───────────────────────────────────────────
    print("\n[4/4] Building portfolio...")
    portfolio, sector_info, risk_summary, scored = build_portfolio(all_signals)

    print(f"\n  Selected {len(portfolio)} trades for portfolio:")
    if portfolio:
        print(f"\n  {'Symbol':<14} {'Strategies':<30} {'Entry':>8} {'Stop':>8} "
              f"{'Target':>8} {'NetR:R':>7} {'Invest(Rs.)':>12} {'NetProfit(Rs.)':>14}")
        print("  " + "-" * 110)
        for t in portfolio:
            print(f"  {t['symbol']:<14} {t.get('strategies','')[:29]:<30} "
                  f"{t['entry']:>8.2f} {t['stop']:>8.2f} {t['target']:>8.2f} "
                  f"{t.get('net_rr',0):>7.2f} {t['investment']:>12,.0f} "
                  f"{t.get('net_profit',0):>13,.0f}")

        print("\n  " + "-" * 110)
        print(f"  {'PORTFOLIO TOTAL':<46} "
              f"{'':>8} {'':>8} {'':>8} {'':>7} "
              f"{risk_summary.get('total_invest',0):>12,.0f} "
              f"{risk_summary.get('net_profit_all',0):>13,.0f}")

        print(f"\n  Capital deployed : Rs.{risk_summary.get('total_invest',0):,.0f}  "
              f"({risk_summary.get('deploy_pct',0):.1f}%)")
        print(f"  Capital reserve  : Rs.{risk_summary.get('capital_reserve',0):,.0f}")
        print(f"  Total risk       : Rs.{risk_summary.get('total_risk',0):,.0f}  "
              f"({risk_summary.get('total_risk_pct',0):.2f}% of capital)")
        print(f"  Portfolio R:R    : {risk_summary.get('portfolio_rr',0):.2f}")
        print(f"  Break-even win%  : {risk_summary.get('be_win_rate',50):.1f}%")

        if risk_summary.get("warnings"):
            print("\n  WARNINGS:")
            for w in risk_summary["warnings"]:
                print(f"    {w}")

    # ── Sector Rankings ───────────────────────────────────────────────────
    sr_info = all_signals.get("sector_rotation_info", [])
    if sr_info:
        print("\n  Sector Rankings:")
        for s in sorted(sr_info, key=lambda x: x.get("rank", 99))[:10]:
            arrow = "^" if s.get("signal") == "OVERWEIGHT" else ("v" if s.get("signal") == "UNDERWEIGHT" else "-")
            print(f"    {arrow} #{s.get('rank'):2d} {s.get('sector'):<18} "
                  f"30D: {s.get('ret_30d',0):+.1f}%  90D: {s.get('ret_90d',0):+.1f}%  "
                  f"[{s.get('signal')}]")

    # ── Save report ───────────────────────────────────────────────────────
    all_raw_signals = {
        **all_signals,
        "sector_rotation_info":  all_signals.get("sector_rotation_info", []),
        "sector_rotation_picks": all_signals.get("sector_rotation_picks", []),
    }

    filepath = save_report(portfolio, sector_info, risk_summary, scored, all_raw_signals)

    print(f"\n{'='*66}")
    print(f"  [OK] DONE - {datetime.datetime.now().strftime('%H:%M:%S')}")
    print(f"  Report  : {filepath}")
    print(f"{'='*66}\n")


if __name__ == "__main__":
    main()
