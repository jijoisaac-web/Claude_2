# India Equity Momentum Screener Suite (Nifty 500)

Python screeners replicating the four ways institutions extract momentum insights from Indian markets, plus the risk overlays that make them investable.

## Modules

| File | Strategy |
|---|---|
| `screener_cross_sectional.py` | **Relative momentum** — 12-1 / 6-1 / 3-1 returns, vol-adjusted, z-scored and winsorized at ±3 (NSE momentum-index methodology). Decile ranks and percentiles. |
| `screener_trend.py` | **Time-series momentum** — 20/50/200 DMA structure, golden cross, 52-week-high proximity, 20d breakouts, RSI(14), MACD. 0–100 trend score. |
| `screener_earnings.py` | **Earnings momentum** — EPS surprise %, surprise streak, analyst rec balance, forward-EPS growth (free-data best effort; runs on top-60 price-momentum names only). |
| `flows.py` | **Flows & positioning** — FII/DII daily net flows (NSE API), per-stock delivery % (NSE bhavcopy), 20d/60d volume expansion. |
| `risk_overlays.py` | **Institutional overlays** — liquidity floor (₹5 cr median daily traded value), vol cap, 25% sector caps, inverse-vol sizing to 18% target vol, momentum-crash regime filter (Nifty < 200DMA or vol spike ⇒ 50% exposure). |
| `trade_signals.py` | **Actionable trades** — swing (5-20 sessions) and positional (3-6 months) setups with entry, ATR-based stop-loss, R-multiple targets, suggested quantity (1% capital risk, halved in RISK-OFF), and exit rules. |
| `run_all.py` | Orchestrates everything → `output/08_Momentum_Screener_Report.xlsx` with trade sheets and a top-30 weighted portfolio. |

## Setup

```bash
pip install -r 08_requirements.txt
```

## Run

One-click (Windows) — installs dependencies on first run and opens the report when done:

```bat
08_run_screener.bat           # full run
08_run_screener.bat fast      # skip earnings
08_run_screener.bat fastest   # skip earnings and flows
```

Or directly:

```bash
python run_all.py                  # full run (~10-20 min for Nifty 500 incl. fundamentals)
python run_all.py --skip-earnings  # ~3-5 min, price/flow signals only
python run_all.py --skip-earnings --skip-flows   # fastest, price signals only
```

Individual screeners also run standalone, e.g. `python screener_cross_sectional.py`.

To validate offline without network: `python test_synthetic.py`.

## Configuration

All parameters live in `config.py` — universe (NIFTY50/200/500/CUSTOM), lookbacks, filters, composite weights (45% cross-sectional, 30% trend, 15% earnings, 10% flows), sector cap, target vol.

## When to run

| Cadence | When (IST) | Why |
|---|---|---|
| **Swing — daily** | Weekdays **after 7:30 pm** | NSE FII/DII provisional flows publish ~6 pm; the delivery bhavcopy ~7 pm; Yahoo EOD prices are final after close. Place orders next morning at open. |
| **Positional — weekly** | **Saturday morning** | Weekly bars are complete; calm review without intraday noise. Rebalance review monthly. |
| Avoid | During market hours (9:15 am–3:30 pm) | Partial daily bars distort RSI/breakout/ATR calculations. |

Automate with Windows Task Scheduler: action = `08_run_screener.bat fast`, trigger = daily 7:45 pm.

## Output sheets

Summary (regime + run info), **Swing_Trades** and **Positional_Trades** (entry/stop/targets/qty/exit rules), Portfolio_Top30 (weighted picks), Composite_Ranks, CrossSectional, Trend, Earnings, Flows_Stock, FII_DII_Market, Parameters.

### Trade sheet columns

`entry` last close (use as limit reference next open) · `stop_loss` swing: tighter of 2×ATR or 10-day low; positional: 50DMA−3% or 3×ATR, capped at 12% · `target_1/2` at R-multiples of risk (swing 1.5R/2.5R, positional 2R/3.5R) · `suggested_qty` sized so a stop-hit loses 1% of `CAPITAL` (0.5% in RISK-OFF) · `exit_rule` trailing and invalidation logic.

## Notes & caveats

- Data: Yahoo Finance (prices/fundamentals) and NSE public endpoints (constituents, flows, bhavcopy). NSE endpoints occasionally block scripted access; modules degrade gracefully and the report is still produced.
- Prices are downloaded fresh at most every 12h (parquet cache in `data/cache`).
- Free Indian fundamentals coverage is patchy — the earnings score reports its own data coverage per stock.
- This is a research/screening tool, not investment advice. Momentum strategies carry sharp drawdown risk at market reversals; the regime filter mitigates but doesn't eliminate it.
