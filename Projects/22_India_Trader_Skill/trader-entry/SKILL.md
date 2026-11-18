---
name: trader-entry
description: Check whether an NSE stock has triggered an opening-range breakout (ORB) entry today, long or short, on 5-minute bars, and watch it until trigger, expiry or skip. Use when the user asks if it's time to enter, whether a stock broke out of its opening range, or wants to time an intraday entry in an Indian stock.
---

# trader-entry

```
python3 <this-folder>/entry.py check INFY --side long
python3 <this-folder>/entry.py check INFY --side long --at 09:50        # as of a time today
python3 <this-folder>/entry.py check INFY --side long --date 2026-11-12 # replay a past session
python3 <this-folder>/entry.py watch INFY --every 60
```

Rule: opening range = first 15 minutes (09:15-09:30). Trigger = first 5-minute CLOSE beyond the range, on a bar starting before 11:00 IST. Entry is that close. Skipped if the range is under 0.2% or over 2% (configurable).

Status values: `forming` (before 09:30), `waiting`, `triggered`, `expired` (past the window), `skipped`.

- Writes `trader/entry.json`. A `data_warning` means the feed looks delayed: tell the user to confirm the live price with their broker before doing anything.
- Shorting intraday is possible in India (MIS) but delivery shorting is not; say so if the user asks for a short on CNC.
- Next: `trader-exit`.
