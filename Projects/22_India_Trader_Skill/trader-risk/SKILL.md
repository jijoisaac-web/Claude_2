---
name: trader-risk
description: Pre-trade risk gate for Indian intraday trades. Returns PASS or BLOCK against max loss per trade, daily loss limit, trades per day, net reward:risk, position size, cash, charge drag, entry window, weekday/holiday and event risk, and lists manual checks (BE/BZ series, ASM/GSM, circuit limits). Use before any order, when the user asks "can I take this trade", or wants a risk check or sanity check.
---

# trader-risk

```
python3 <this-folder>/check.py
```

Reads `orders.json`, `plan.json`, `journal.json`, `news.json`, `config.json`; writes `trader/risk.json`.

- BLOCK is final for the day's plan: do not offer ways around it, and do not suggest loosening limits to make a trade pass. If the user wants new limits, that is a deliberate change to config made when calm, not mid-trade.
- WARN items (cost drag, event risk) must be read out to the user.
- Always read the `manual_checks` list aloud. The script cannot see series (BE/BZ stocks cannot be squared off intraday), ASM/GSM restrictions or circuit bands.
- Holidays are not auto-detected: the user lists them in config.
- Next: `trader-broker`.
