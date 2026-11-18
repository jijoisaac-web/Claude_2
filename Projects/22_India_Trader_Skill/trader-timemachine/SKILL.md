---
name: trader-timemachine
description: Replay a planned Indian intraday trade before risking money. Applies the same opening-range rule to the last ~60 sessions and runs a bootstrap simulation of the rest of today, reporting hit rates, expected P&L NET of Indian charges and slippage, and a plain verdict. Use when the user asks if a trade or setup is worth it, wants a backtest, odds, expected value, or "what would have happened" for an NSE stock.
---

# trader-timemachine

```
python3 <this-folder>/timemachine.py run --paths 10000
python3 <this-folder>/timemachine.py run --symbol HDFCBANK --side long --stop or-mid --target 1.5 --qty 20
```

Reads `trader/plan.json` (and `orders.json` for quantity) if present. Writes `trader/timemachine.json`.

Report: historical triggers, targets/stops/flat exits, target-rate 95% range, mean net P&L per trade, charges per trade, simulation probabilities (target/stop/flat), median and 5th-percentile outcome, then the verdict verbatim.

Be honest about limits (they are in the output): only ~60 days of one regime; bootstrapped bars ignore trends and news; fills at bar prices; stop checked before target within a bar. A positive result on few triggers is not evidence of an edge. If the verdict is NEGATIVE or MIXED, say so first and recommend skipping or paper trading.
Yahoo 5-minute history is limited to ~60 days; do not claim longer backtests.
