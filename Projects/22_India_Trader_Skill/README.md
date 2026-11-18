# India Trader Skills

A rules-first trading workflow for **Claude** on **NSE/BSE cash equities**. It scans a stock list, checks the news,
waits for an opening-range breakout, plans the stop and target, replays the trade on recent history and a simulation
(net of Indian charges), sizes the position in rupees, runs a risk gate, and produces an order ticket.

Inspired by the US-focused [day-trader-skill](https://github.com/jakeschincariol/day-trader-skill) and rebuilt for the
Indian market: IST hours, NSE symbols, STT/stamp duty/GST and other charges, and Indian broker order behaviour.

> **Disclaimer: this is not financial advice.** It is an experimental research and discipline tool. It is not
> registered with or endorsed by SEBI, any exchange, any broker, or Anthropic. Trading can lose money, and most
> retail traders in Indian derivatives have lost money in SEBI's own studies. Nothing here promises a profit.
> The software is provided as is; you are responsible for every trade. Start in paper mode and stay there until you
> understand what the numbers mean.

## What it covers

| Skill | Purpose |
|---|---|
| `india-trader` | Orchestrator: runs the steps in order and enforces the rules |
| `trader-scanner` | Daily screen (20-day breakouts on volume, oversold stocks in uptrends) and an intraday opening-range scan |
| `trader-news` | Google News India headlines and today's price move, tagged for results, regulatory news, deals, ratings, corporate actions |
| `trader-entry` | Opening-range breakout on 5-minute bars, long or short (first 15 min range, entries 09:30-11:00 IST by default) |
| `trader-exit` | Stop (range midpoint, opposite end, or fixed %) and target as a multiple of risk |
| `trader-timemachine` | Replays the rule over ~60 sessions and simulates the rest of the day; all results net of charges and slippage |
| `trader-budget` | Share quantity so a stop-out costs no more than your max loss, plus entry/stop/target order legs |
| `trader-risk` | PASS/BLOCK gate on loss limits, trade count, net reward:risk, position size, entry window, event risk |
| `trader-broker` | Plain-English ticket, paper/live journal; live orders only through your own connected broker tool, only after you say yes |

**Not covered:** options and futures, delivery/investing strategies, tax computation, an NSE holiday calendar, and any
code that places orders by itself.

## How it fits together

```
scanner -> news -> entry -> exit -> timemachine -> budget -> risk -> broker
 scan.json news.json entry.json plan.json timemachine.json orders.json risk.json journal.json
```

Each step reads the previous step's file from a `trader/` folder in your working directory. All times are IST.

## Requirements

- Python 3.8 or later (standard library only; nothing to install)
- Internet access for market data (Yahoo Finance's unofficial chart endpoint) and news (Google News RSS); no API keys
- Claude Code or Cowork (or any Claude setup that can run Python) to use the skills conversationally. The scripts
  also work on their own from a terminal.

## Install

1. Clone or download this repository.
2. To use as Claude skills, copy **all** folders (`india-trader`, every `trader-*` folder, and `_lib`) into your
   skills directory, for example `%USERPROFILE%\.claude\skills\` on Windows or `~/.claude/skills/` on macOS/Linux.
   `_lib` holds shared code and is required.
3. Work from any folder: data is written to `./trader/` (set the `TRADER_DIR` environment variable to change this).
4. Copy `config.example.json` to `trader/config.json` and set your capital and loss limits.

## Quick start (terminal)

```
python tests\test_all.py                                        # offline self-test, should pass 6 tests
python trader-scanner\scan.py universe                          # writes trader\universe.txt
python trader-scanner\scan.py daily --top 10 --all              # pre-market screen
python trader-news\news.py SBIN --hours 24                      # headlines and event risk
python trader-entry\entry.py check SBIN --side long             # ORB status (add --date YYYY-MM-DD to replay)
python trader-exit\exit.py plan --stop or-mid --target 1.5      # stop and target
python trader-budget\size.py --write                            # quantity and order legs
python trader-timemachine\timemachine.py run                    # history + simulation, net of charges
python trader-risk\check.py                                     # PASS / BLOCK
python trader-broker\ticket.py show                             # the ticket
```

Or just tell Claude "what should I trade today?" or "is this SBIN trade worth it?" and let `india-trader` drive it.

## Configuration

`trader/config.json` overrides the defaults in `_lib/inmkt.py`. The most important settings:

| Key | Default | Meaning |
|---|---|---|
| `capital` | 100000 | Rupees you are willing to trade with |
| `max_loss_per_trade` | 500 | Max net loss if the stop fills (suggest 1% of capital or less) |
| `daily_loss_limit` | 1500 | Stop trading for the day after this |
| `max_trades_per_day` | 3 | |
| `intraday_leverage` | 1 | Leave at 1 unless you know your broker's real margin rules |
| `entry_latest` / `flat_by` | 11:00 / 15:10 | No new entries after / be flat by (IST) |
| `holidays` | [] | Trading holidays to enforce, e.g. `["2026-11-24"]` |
| `paper` | true | While true, nothing is ever sent to a broker |
| `costs` | see file | Brokerage, STT, stamp duty, exchange and SEBI fees, GST |

**Check the `costs` block against your broker's brokerage calculator.** The defaults are typical discount-broker
values and rates change.

## Limitations you should know

- **Data quality:** Yahoo's NSE feed is unofficial, may be delayed, and offers only about 60 days of 5-minute history.
  Confirm live prices with your broker before acting. The scripts warn when data looks stale.
- **Backtests are weak evidence:** one market regime, few triggers, bootstrapped bars that ignore trends and news,
  and fills at bar prices. A positive result on few trades is not an edge. Read the verdict text, which says so.
- **Stale stock list:** the default universe (~50 large caps) goes out of date. Edit `trader/universe.txt`.
- **Things the scripts cannot see:** BE/BZ series (cannot be squared off intraday), ASM/GSM restrictions, circuit
  limits, results announcements, and exchange holidays. The risk gate prints these as manual checks.
- **Order placement:** many Indian brokers no longer offer bracket orders, so the ticket places entry, then
  stop-loss, then target in sequence. A failed stop-loss leaves you unprotected; watch it.
- **Tax:** intraday and F&O results are generally business income in India. Speak to a chartered accountant.

## Tests

```
python tests\test_all.py
```
Runs offline on synthetic data and checks the cost model, the breakout rule, stop/target maths, sizing, the risk
gate and the Time Machine. It does not test live data fetching.

## Project layout

```
_lib/inmkt.py          shared code: data fetch, config, charges, breakout rule, trade replay
india-trader/          orchestrator skill
trader-*/              one folder per skill: SKILL.md + script
tests/test_all.py      offline tests
config.example.json    starting config
trader/                your local data (ignored by git, created on first run)
```

## Contributing

Issues and pull requests are welcome, especially: a holiday calendar, better charge tables, additional setups, and
fixes for Yahoo data quirks. Keep the standard-library-only rule and add a test for any rule change.

## License

[MIT](LICENSE). Use at your own risk.
