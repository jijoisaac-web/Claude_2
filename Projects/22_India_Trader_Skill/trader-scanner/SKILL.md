---
name: trader-scanner
description: Scan a liquid NSE stock universe for candidates. Daily mode finds 20-day breakouts on volume and oversold-in-uptrend names; ORB mode finds stocks that have broken their opening range (first 15 minutes) today. Use when the user asks what to trade today, wants a screener for Indian stocks, Nifty names breaking out, or morning gainers/breakouts on NSE.
---

# trader-scanner

Run from the user's working folder (data goes to `./trader/`):

```
python3 <this-folder>/scan.py universe            # writes trader/universe.txt (edit it; one NSE symbol per line)
python3 <this-folder>/scan.py daily --top 15      # before the open, uses 1y daily bars
python3 <this-folder>/scan.py orb --at 09:35      # after 09:30, as of a time (IST)
```

- Default universe is ~50 large caps and goes stale; encourage the user to maintain `universe.txt`. `universe --nse` downloads NSE's full equity list but do not scan thousands of names (slow, rate-limited): pick a liquid subset.
- Daily mode drops stocks under `min_avg_turnover_cr` (default Rs 25 crore/day). Liquidity matters more than chart patterns.
- Report results as candidates to research, not signals to trade. Show symbol, tag, volume ratio, RSI. Mention fetch errors if any.
- Next step: `trader-news` on the top few, then `trader-entry`.
