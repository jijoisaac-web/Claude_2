---
name: trader-broker
description: Final step for Indian trades: show a plain-English order ticket, log paper or live results to the journal, and (only in live mode, only after explicit user approval) place orders through the user's connected broker tool such as Zerodha's Kite MCP. Use when the user is ready to place, paper-trade, or log an NSE trade, or asks for their trading journal or P&L.
---

# trader-broker

```
python3 <this-folder>/ticket.py show
python3 <this-folder>/ticket.py paper-fill --exit-price 1234.5 --outcome target
python3 <this-folder>/ticket.py log --pnl -420 --note "stopped out"
python3 <this-folder>/ticket.py journal
```

## Paper mode (default)
`ticket.py show` prints the ticket and risk status. Do NOT contact any broker. When the user reports how the trade closed, run `paper-fill`. The journal feeds the daily loss limit, so paper results count.

## Live mode (only if `"paper": false` AND risk verdict PASS)
1. Show the ticket. Ask the user to type yes to exactly that ticket. Anything other than a clear yes means do nothing.
2. Use the broker's MCP/API tool the user has connected (for Zerodha, the official Kite MCP server at mcp.kite.trade/mcp; set its tools to require approval). Read the tool's actual schema before calling; do not invent tool names or parameters.
3. Place the entry, confirm it filled, then the stop-loss, then the target. If the stop-loss fails, say so immediately and tell the user to place it manually.
4. After the trade closes, run `log` with the realised net P&L from the broker.
- Never place a second trade after a BLOCK, never average down, never remove a stop.
- If no broker tool is connected, give the ticket for manual entry in the broker app.
