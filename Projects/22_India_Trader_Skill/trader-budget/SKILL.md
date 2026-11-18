---
name: trader-budget
description: Size an Indian intraday trade in rupees so a stop-out costs no more than the user's max loss after charges and slippage, with a capital cap, and build the order legs (entry, stop-loss, target). Use when the user asks how many shares to buy, how much to risk, position size, or what the order should look like for an NSE trade.
---

# trader-budget

```
python3 <this-folder>/size.py --write
```

Reads `trader/plan.json` and `trader/config.json` (copy `config.example.json` from the package root; set `capital`, `max_loss_per_trade`, `daily_loss_limit`). Writes `trader/orders.json`.

- Quantity = the smaller of (max loss / risk per share) and the capital cap, then reduced until the NET stop-out loss (incl. brokerage, STT, stamp, exchange/SEBI fees, GST and slippage) is within the limit.
- Charges in config are typical discount-broker values and change. Ask the user to check them against their broker's brokerage calculator before trusting net numbers.
- `intraday_leverage` defaults to 1. Do not raise it for the user.
- Suggest max loss <= 1% of capital per trade. If net reward:risk is under ~1, say charges are eating the setup.
- Many Indian brokers have no bracket orders: the three legs are placed in sequence (entry, then stop-loss, then target).
- Next: `trader-risk`.
