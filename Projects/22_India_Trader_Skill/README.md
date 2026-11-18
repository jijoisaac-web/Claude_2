# India Trader Skills

A rules-first workflow for Claude on NSE/BSE stocks: scan, news, opening-range entry, stop/target, historical replay
and simulation net of Indian charges, position sizing in rupees, a risk gate, and an order ticket. Python standard
library only (3.8+). Data from Yahoo Finance's unofficial endpoint and Google News RSS (no keys).

**Not financial advice. Defaults to paper mode. Cash equities only; no options/futures.** SEBI's own studies show
most individual derivatives traders lose money; intraday cash trading is also hard. Treat this as a way to test ideas
cheaply and enforce discipline, not as an edge.

## Install
Copy ALL folders (including `_lib`, which holds shared code) into your skills directory:
`~/.claude/skills/` for Claude Code, or upload each `trader-*` / `india-trader` folder as a skill in Claude.
Run scripts from a working folder: data is written to `./trader/`. Copy `config.example.json` to `trader/config.json`.

## Before you trust any number
1. Verify the `costs` block against your broker's brokerage calculator.
2. Yahoo NSE data can be delayed and has about 60 days of 5-minute history. Confirm live prices with your broker.
3. Run `python3 tests/test_all.py` (offline) to confirm the logic on your machine.
4. Paper trade for weeks. Read `trader-timemachine` limits.

## Not covered
Holiday calendar, F&O, order placement code (the broker step relies on your connected broker tool), tax.
Intraday profits/losses are taxed as business income: ask a CA.
