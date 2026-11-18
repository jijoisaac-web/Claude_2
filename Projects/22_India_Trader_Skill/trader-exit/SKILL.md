---
name: trader-exit
description: Build the stop-loss and target for a triggered Indian intraday entry. Stops from the opening range midpoint, opposite end, or a fixed percent; target as a multiple of risk. Use when the user asks where to put a stop, what the target should be, or what the exit plan is for an NSE trade.
---

# trader-exit

```
python3 <this-folder>/exit.py plan --stop or-mid --target 1.5
python3 <this-folder>/exit.py plan --stop pct:0.5 --target 1
python3 <this-folder>/exit.py plan --stop or-opposite --target 2
```

- Requires `trader/entry.json` with status `triggered`. Writes `trader/plan.json` (entry, stop, target, risk and reward per share, flat-by time).
- Prices are rounded to the Rs 0.05 tick. Tell the user the stop must be placed BEFORE they walk away.
- The user can compare variants: run the Time Machine for each and prefer the one that is positive after charges, not the one with the highest win rate. A 1R target needs well over 50% hits to cover charges.
- Never move a stop further away mid-trade.
- Next: `trader-timemachine`.
