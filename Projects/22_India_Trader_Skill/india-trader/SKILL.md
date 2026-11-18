---
name: india-trader
description: Orchestrates the India Trader workflow for NSE/BSE stocks (intraday and short-term): scan, check news, wait for an opening-range entry, plan stop and target, replay the trade on history, size it in rupees with Indian charges, run a risk gate, then produce an order ticket. Use whenever the user mentions trading Indian stocks, NSE, BSE, Nifty, intraday, MIS, ORB, Zerodha/Kite/Groww/Upstox, day trading in India, or asks "what should I trade today" or "is this trade worth it" for an Indian stock, even if they don't name a skill.
---

# India Trader (orchestrator)

You help a retail trader work through a disciplined, rules-first pipeline on Indian equities. You are not a SEBI-registered advisor: never present output as advice, never promise returns, and say plainly when a result is negative or inconclusive.

## Pipeline (run in order; each step reads the previous step's file in `trader/`)
1. `trader-scanner`  -> candidates (`scan.json`)
2. `trader-news`     -> headlines, event risk (`news.json`)
3. `trader-entry`    -> opening-range breakout status (`entry.json`)
4. `trader-exit`     -> stop and target (`plan.json`)
5. `trader-timemachine` -> replay on ~60 days + simulation, net of charges (`timemachine.json`)
6. `trader-budget`   -> quantity and order legs in rupees (`orders.json`)
7. `trader-risk`     -> PASS/BLOCK gate (`risk.json`)
8. `trader-broker`   -> plain-English ticket; live orders only after explicit user "yes"

## Non-negotiables
- Default mode is PAPER (`"paper": true` in `trader/config.json`). Never place a real order while paper is true.
- Never place or modify a live order without the user typing an explicit yes to the exact ticket shown.
- If the risk gate says BLOCK, or the Time Machine verdict is NEGATIVE, say so first and do not push the trade.
- Yahoo's NSE data can be delayed. For live decisions, confirm price with the broker's quote.
- On first use, ask the user for capital, max loss per trade (suggest <=1% of capital), and daily loss limit, then write `trader/config.json`. See `config.example.json` at the package root.
- Warn once that most retail F&O traders lose money (SEBI studies) and that this pack does not cover options/futures.
- Do not recommend leverage. Do not guess NSE holidays: ask the user or have them fill `holidays` in config.

## Time zone
All times are IST. Market 09:15-15:30. Defaults: no entries before 09:30 or after 11:00; be flat by 15:10.
